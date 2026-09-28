from typing import List
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import ChatSendRequest, ConversationResponse, MessageResponse
from app.services.chat_service import chat_service
from app.core.dependencies import get_current_user, limiter
from app.core.config import settings

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post(
    "/send",
    summary="Send chat message and stream AI response token-by-token via SSE"
)
@limiter.limit(settings.RATE_LIMIT_CHAT)
async def send_chat_message(
    request: Request,
    payload: ChatSendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Accepts user message, optional conversation_id, loads conversational context,
    invokes LLM provider, and streams AI completion token-by-token via Server-Sent Events (SSE).
    """
    # Sanitize and validate input prior to starting the HTTP stream so validation errors return proper HTTP 400
    from app.utils.sanitizer import sanitize_and_validate_input
    cleaned_message = sanitize_and_validate_input(payload.message)

    event_generator = chat_service.process_and_stream_chat(
        db=db,
        user=current_user,
        conversation_id=payload.conversation_id,
        cleaned_message=cleaned_message
    )

    return StreamingResponse(
        event_generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream; charset=utf-8",
            "X-Accel-Buffering": "no"  # Disable proxy buffering (e.g. Nginx)
        }
    )


@router.get(
    "/conversations",
    response_model=List[ConversationResponse],
    summary="List all conversations for the authenticated user"
)
async def list_conversations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns list of conversation sessions belonging to the current user, ordered by last updated.
    """
    return await chat_service.list_user_conversations(db, current_user.id)


@router.delete(
    "/conversations/{conversation_id}",
    response_model=MessageResponse,
    summary="Delete conversation session and all its messages"
)
async def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deletes conversation owned by current user. Cascades deletion to all its messages.
    """
    await chat_service.delete_conversation(db, current_user.id, conversation_id)
    return MessageResponse(message="Conversation deleted successfully.")
