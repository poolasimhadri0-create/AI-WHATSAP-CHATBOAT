const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

// 1. Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('❌ Error: GEMINI_API_KEY is not defined in backend/.env');
    process.exit(1);
}
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash-lite',
    systemInstruction: 
        'You are an intelligent AI assistant responding on behalf of the user on WhatsApp. ' +
        'Keep replies friendly, conversational, and concise for mobile messaging. ' +
        'Do not use complicated markdown or code blocks unless requested.'
});

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
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--disable-extensions',
            '--no-first-run'
        ]
    }
});

// 3. Display QR Code for login
client.on('qr', (qr) => {
    console.log('\n======================================================');
    console.log('📲 SCAN THIS QR CODE WITH YOUR WHATSAPP TO LINK BOT:');
    console.log('Open WhatsApp > 3 dots (or Settings) > Linked Devices > Link a Device');
    console.log('======================================================\n');
    qrcode.generate(qr, { small: true });
});

// 4. Bot is Ready
client.on('ready', () => {
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
        // 2. Ask Gemini AI
        const result = await model.generateContent(userText);
        const replyText = result.response.text();

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
