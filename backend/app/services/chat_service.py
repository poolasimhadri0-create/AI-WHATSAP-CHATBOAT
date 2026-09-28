from datetime import datetime, timezone
import json
from typing import AsyncGenerator, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.models.models import Conversation, Message, User
from app.schemas.schemas import ChatSendRequest, ConversationResponse, ConversationDetailResponse, ChatMessageResponse
from app.services.llm_service import llm_service
from app.core.config import settings
from app.utils.exceptions import EntityNotFoundException, UnauthorizedAccessException
from app.utils.sanitizer import sanitize_and_validate_input
from app.utils.logger import logger


class ChatService:
    """
    Orchestrates conversation lifecycle, history persistence,
    context-aware prompting, and token-by-token SSE streaming.
    """

    async def get_or_create_conversation(
        self,
        db: AsyncSession,
        user: User,
        conversation_id: Optional[int],
        initial_message: str
    ) -> Conversation:
        if conversation_id:
            stmt = select(Conversation).where(Conversation.id == conversation_id)
            result = await db.execute(stmt)
            conv = result.scalar_one_or_none()

            if not conv:
                raise EntityNotFoundException("Conversation", conversation_id)
            if conv.user_id != user.id:
                raise UnauthorizedAccessException("You do not own this conversation.")
            return conv

        # Generate a concise title from the first message
        title = initial_message[:30] + ("..." if len(initial_message) > 30 else "")
        new_conv = Conversation(
            user_id=user.id,
            title=title
        )
        db.add(new_conv)
        await db.commit()
        await db.refresh(new_conv)
        logger.info(f"Created new conversation ID={new_conv.id} for user {user.id}")
        return new_conv

    async def get_recent_context_messages(
        self,
        db: AsyncSession,
        conversation_id: int,
        limit: int = 10
    ) -> List[dict]:
        """
        Fetches the last N messages from conversation history formatted for LLM context.
        """
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(desc(Message.created_at))
            .limit(limit)
        )
        result = await db.execute(stmt)
        # Reverse to chronological order (oldest to newest)
        history = list(reversed(result.scalars().all()))

        return [{"role": msg.role, "content": msg.content} for msg in history]

    async def process_and_stream_chat(
        self,
        db: AsyncSession,
        user: User,
        conversation_id: Optional[int],
        cleaned_message: str
    ) -> AsyncGenerator[str, None]:
        """
        Main SSE streaming pipeline:
        1. Retrieves or creates conversation.
        2. Persists user message.
        3. Gathers last N messages context.
        4. Streams AI chunks via SSE.
        5. Persists assistant message upon completion.
        """
        # 1. Get or create conversation
        conv = await self.get_or_create_conversation(db, user, conversation_id, cleaned_message)

        # 2. Store user message in DB
        user_tokens = llm_service.estimate_tokens(cleaned_message)
        user_message = Message(
            conversation_id=conv.id,
            role="user",
            content=cleaned_message,
            tokens_used=user_tokens
        )
        db.add(user_message)
        conv.updated_at = datetime.now(timezone.utc)
        await db.commit()

        # 4. Fetch context window
        context_messages = await self.get_recent_context_messages(
            db,
            conversation_id=conv.id,
            limit=settings.MAX_CONTEXT_MESSAGES
        )

        # Send SSE initial metadata event
        init_event = {
            "event": "start",
            "conversation_id": conv.id,
            "title": conv.title
        }
        yield f"event: start\ndata: {json.dumps(init_event)}\n\n"

        # 5. Stream LLM tokens
        full_assistant_reply = []
        try:
            async for chunk in llm_service.stream_chat_completion(context_messages):
                full_assistant_reply.append(chunk)
                chunk_data = json.dumps({"token": chunk})
                yield f"event: chunk\ndata: {chunk_data}\n\n"

        except Exception as e:
            logger.error(f"Error while streaming response: {e}")
            err_data = json.dumps({"event": "error", "error": str(e), "message": str(e)})
            yield f"event: error\ndata: {err_data}\n\n"
            return

        # 6. Save assistant message to database
        complete_reply = "".join(full_assistant_reply)
        assistant_tokens = llm_service.estimate_tokens(complete_reply)

        assistant_message = Message(
            conversation_id=conv.id,
            role="assistant",
            content=complete_reply,
            tokens_used=assistant_tokens
        )
        db.add(assistant_message)
        conv.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(assistant_message)

        # Send SSE completion event
        end_event = {
            "event": "done",
            "message_id": assistant_message.id,
            "conversation_id": conv.id,
            "tokens_used": assistant_tokens
        }
        yield f"event: done\ndata: {json.dumps(end_event)}\n\n"

    async def list_user_conversations(self, db: AsyncSession, user_id: int) -> List[ConversationResponse]:
        stmt = (
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(desc(Conversation.updated_at))
        )
        result = await db.execute(stmt)
        conversations = result.scalars().all()
        return [ConversationResponse.model_validate(c) for c in conversations]

    async def get_conversation_history(
        self,
        db: AsyncSession,
        user_id: int,
        conversation_id: int
    ) -> ConversationDetailResponse:
        stmt = select(Conversation).where(Conversation.id == conversation_id)
        result = await db.execute(stmt)
        conv = result.scalar_one_or_none()

        if not conv:
            raise EntityNotFoundException("Conversation", conversation_id)
        if conv.user_id != user_id:
            raise UnauthorizedAccessException("You do not own this conversation.")

        # Fetch messages
        msg_stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
        )
        msg_result = await db.execute(msg_stmt)
        messages = msg_result.scalars().all()

        return ConversationDetailResponse(
            id=conv.id,
            user_id=conv.user_id,
            title=conv.title,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            messages=[ChatMessageResponse.model_validate(m) for m in messages]
        )

    async def delete_conversation(self, db: AsyncSession, user_id: int, conversation_id: int) -> None:
        stmt = select(Conversation).where(Conversation.id == conversation_id)
        result = await db.execute(stmt)
        conv = result.scalar_one_or_none()

        if not conv:
            raise EntityNotFoundException("Conversation", conversation_id)
        if conv.user_id != user_id:
            raise UnauthorizedAccessException("You do not own this conversation.")

        await db.delete(conv)
        await db.commit()
        logger.info(f"Conversation {conversation_id} deleted by user {user_id}")


chat_service = ChatService()
