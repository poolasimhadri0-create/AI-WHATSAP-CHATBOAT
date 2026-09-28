"""
Twilio WhatsApp Service
Handles sending messages back to WhatsApp users via Twilio REST API.
"""
import httpx
from app.core.config import settings
from app.utils.logger import logger


class TwilioWhatsAppService:
    """
    Sends WhatsApp messages via Twilio REST API without requiring heavy external SDK.
    """

    @property
    def api_url(self) -> str:
        return f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"

    async def send_message(self, to_number: str, message_body: str) -> bool:
        """
        Sends WhatsApp message to a phone number.
        to_number format: 'whatsapp:+919876543210' or just '+919876543210'
        """
        if not to_number.startswith("whatsapp:"):
            to_number = f"whatsapp:{to_number}"

        payload = {
            "From": settings.TWILIO_WHATSAPP_NUMBER,
            "To": to_number,
            "Body": message_body,
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    self.api_url,
                    data=payload,
                    auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                )
                response.raise_for_status()
                logger.info(f"Twilio WhatsApp message dispatched to {to_number}")
                return True
        except httpx.HTTPStatusError as e:
            logger.error(f"Twilio API error ({e.response.status_code}): {e.response.text}")
            return False
        except Exception as e:
            logger.error(f"Twilio WhatsApp dispatch failed: {e}")
            return False


twilio_service = TwilioWhatsAppService()
