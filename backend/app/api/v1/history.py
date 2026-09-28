from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.models import User
from app.schemas.schemas import ConversationDetailResponse
from app.services.chat_service import chat_service
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/chat/history", tags=["Chat History"])


@router.get(
    "/{conversation_id}",
    response_model=ConversationDetailResponse,
    summary="Get full conversation history and messages"
)
async def get_conversation_history(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves full conversation details including chronological message history.
    """
    return await chat_service.get_conversation_history(db, current_user.id, conversation_id)
