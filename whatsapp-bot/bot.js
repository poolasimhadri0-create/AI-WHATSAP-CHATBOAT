const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const http = require('http');
require('dotenv').config();
if (!process.env.GEMINI_API_KEY) {
    require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
}

let latestQr = null;
let isBotReady = false;

// 0. HTTP server with visual QR code viewer for easy phone scanning
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (isBotReady) {
        res.end(`
            <!DOCTYPE html>
            <html>
            <head><title>WhatsApp AI Bot Status</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
            <body style="font-family:sans-serif;text-align:center;padding:50px 20px;background:#0b141a;color:#e9edef;">
                <div style="max-width:400px;margin:0 auto;background:#111b21;padding:30px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.5);">
                    <div style="font-size:50px;margin-bottom:10px;">✅</div>
                    <h2 style="color:#00a884;margin-bottom:8px;">Bot is Online & Connected!</h2>
                    <p style="color:#8696a0;font-size:14px;">Anyone who messages your WhatsApp will receive AI replies automatically 24/7.</p>
                </div>
            </body>
            </html>
        `);
    } else if (latestQr) {
        const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(latestQr)}`;
        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Scan WhatsApp QR Code</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <meta http-equiv="refresh" content="15">
            </head>
            <body style="font-family:sans-serif;text-align:center;padding:40px 16px;background:#0b141a;color:#e9edef;">
                <div style="max-width:380px;margin:0 auto;background:#111b21;padding:24px;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.6);">
                    <h3 style="margin-top:0;color:#00a884;">📲 Link your WhatsApp</h3>
                    <p style="color:#8696a0;font-size:13px;margin-bottom:18px;">
                        Open <b>WhatsApp</b> on your phone &gt; <b>Linked Devices</b> &gt; <b>Link a Device</b>
                    </p>
                    <div style="background:#fff;padding:12px;border-radius:12px;display:inline-block;">
                        <img src="${qrImgUrl}" alt="WhatsApp QR Code" width="280" height="280" style="display:block;" />
                    </div>
                    <p style="color:#8696a0;font-size:11px;margin-top:16px;">This page refreshes automatically when a new code is needed.</p>
                </div>
            </body>
            </html>
        `);
    } else {
        res.end(`
            <!DOCTYPE html>
            <html>
            <head><title>Starting Bot...</title><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="5"></head>
            <body style="font-family:sans-serif;text-align:center;padding:50px 20px;background:#0b141a;color:#e9edef;">
                <h2>⏳ Starting WhatsApp Web...</h2>
                <p style="color:#8696a0;">Please wait 10-20 seconds. The QR code will appear here automatically.</p>
            </body>
            </html>
        `);
    }
}).listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Bot web server & QR portal listening on 0.0.0.0:${PORT}`);
});

// 1. Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('❌ Error: GEMINI_API_KEY is not defined.');
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);

async function generateAiReply(userText) {
    // List of reliable models in order of priority
    const modelsToTry = ['gemini-1.5-flash', 'gemini-2.5-flash', 'gemini-1.5-pro'];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            const m = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: 
                    'You are an intelligent AI assistant responding on behalf of the user on WhatsApp. ' +
                    'Keep replies friendly, conversational, and concise for mobile messaging. ' +
                    'Do not use complicated markdown or code blocks unless requested.'
            });
            const result = await m.generateContent(userText);
            return result.response.text();
        } catch (err) {
            lastError = err;
            console.warn(`⚠️ Model "${modelName}" failed (${err?.message || err}). Trying fallback model...`);
        }
    }
    throw lastError || new Error('All Gemini models are temporarily unavailable.');
}

// 2. Initialize WhatsApp Web Client
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: path.join(__dirname, '.wwebjs_auth')
    }),
    webVersionCache: {
        type: 'none',
    },
    puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-accelerated-2d-canvas'
        ]
    }
});

// 3. Display QR Code for login
client.on('qr', (qr) => {
    latestQr = qr;
    isBotReady = false;
    console.log('\n======================================================');
    console.log('📲 SCAN THIS QR CODE WITH YOUR WHATSAPP TO LINK BOT:');
    console.log('Open WhatsApp > 3 dots (or Settings) > Linked Devices > Link a Device');
    console.log('Or view the clean image QR code at your bot web URL!');
    console.log('======================================================\n');
    qrcode.generate(qr, { small: true });
});

// 4. Bot is Ready
client.on('ready', () => {
    isBotReady = true;
    latestQr = null;
    console.log('\n✅ WHATSAPP BOT IS ONLINE & READY!');
    console.log('Anyone who messages this WhatsApp number will now receive an AI reply.\n');
});

// 5. Handle Incoming Messages
client.on('message', async (msg) => {
    // Skip status broadcasts or messages from groups (optional: remove msg.from.includes('@g.us') if you want groups too)
    if (msg.isStatus || msg.from.includes('@g.us')) {
        return;
    }

    const userText = msg.body?.trim();
    if (!userText) return;

    console.log(`📩 New message from [${msg.from}]: "${userText}"`);

    // 1. Try sending typing indicator safely (optional, never break reply on failure)
    try {
        const chat = await msg.getChat();
        if (chat && typeof chat.sendStateTyping === 'function') {
            await chat.sendStateTyping();
        }
    } catch (_) {
        // Safe to ignore: getChat() can fail on WhatsApp Web for @lid privacy IDs
    }

    try {
        // 2. Ask Gemini AI (with automatic fallback if Google servers are busy)
        const replyText = await generateAiReply(userText);

        console.log(`🤖 AI Reply: "${replyText.substring(0, 100)}..."`);

        // 3. Send AI answer back (try quote reply, fallback to direct message)
        try {
            await msg.reply(replyText);
        } catch (replyErr) {
            console.warn('⚠️ msg.reply() failed, falling back to client.sendMessage():', replyErr?.message || replyErr);
            await client.sendMessage(msg.from, replyText);
        }
    } catch (err) {
        console.error('❌ Error generating AI reply:', err?.message || err);
        if (err?.stack) console.error(err.stack);
    }
});

// 6. Progress & status events
client.on('loading_screen', (percent, message) => {
    console.log(`⏳ Loading: ${percent}% — ${message}`);
});

client.on('authenticated', () => {
    console.log('🔑 Authenticated successfully! Loading WhatsApp Web...');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
    console.log('💡 Try deleting the .wwebjs_auth folder and restarting.');
});

client.on('disconnected', (reason) => {
    console.log('🔌 Disconnected:', reason);
    console.log('Attempting to reconnect...');
    client.initialize();
});

// Start client with timeout detection
console.log('🚀 Starting WhatsApp Bot, please wait...');
console.log('⏳ This may take 1-3 minutes (launching browser & loading WhatsApp Web)...');

const startupTimeout = setTimeout(() => {
    console.log('\n⚠️  Startup is taking longer than expected (3 min).');
    console.log('💡 Try these fixes:');
    console.log('   1. Press Ctrl+C to stop');
    console.log('   2. Delete the .wwebjs_cache folder');
    console.log('   3. Run "npm start" again\n');
}, 3 * 60 * 1000);

// Clear the timeout once the bot is ready
client.on('ready', () => clearTimeout(startupTimeout));

client.initialize();
