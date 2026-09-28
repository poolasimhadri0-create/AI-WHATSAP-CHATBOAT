"""
Twilio WhatsApp Webhook
Receives incoming messages from Twilio WhatsApp Sandbox, generates AI answer, and responds.
"""
from fastapi import APIRouter, Request, Response
from app.services.whatsapp_service import twilio_service
from app.services.llm_service import llm_service
from app.utils.logger import logger

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


@router.post("/webhook")
async def twilio_whatsapp_webhook(request: Request):
    """
    Twilio sends incoming WhatsApp messages as application/x-www-form-urlencoded data.
    """
    form_data = await request.form()
    from_number = form_data.get("From")  # e.g., 'whatsapp:+919876543210'
    incoming_text = form_data.get("Body", "").strip()

    logger.info(f"Received Twilio WhatsApp message from {from_number}: {incoming_text}")

    if not incoming_text or not from_number:
        return Response(content="<Response></Response>", media_type="application/xml")

    # 1. Ask your AI chatbot
    context_messages = [
        {
            "role": "system",
            "content": (
                "You are an AI assistant chatting on WhatsApp. "
                "Keep answers friendly, clear, and helpful. "
                "Keep responses concise and formatted nicely for mobile screens."
            )
        },
        {"role": "user", "content": incoming_text}
    ]

    reply_chunks = []
    try:
        async for chunk in llm_service.stream_chat_completion(context_messages):
            reply_chunks.append(chunk)
        ai_reply = "".join(reply_chunks).strip()
    except Exception as e:
        logger.error(f"Error querying LLM: {e}")
        ai_reply = "I'm having trouble processing that right now. Please try again!"

    # 2. Reply back to the user on WhatsApp
    await twilio_service.send_message(to_number=from_number, message_body=ai_reply)

    # Return empty TwiML response to acknowledge Twilio
    return Response(content="<Response></Response>", media_type="application/xml")
