from typing import Optional
from fastapi import Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db.session import get_db
from app.models.models import User
from app.core.security import decode_jwt_token
from app.core.config import settings
from app.utils.exceptions import TokenExpiredOrInvalidException, InactiveUserException
from app.utils.logger import logger

# HTTP Bearer authentication scheme
security_scheme = HTTPBearer(auto_error=False)


def get_client_ip_or_user(request: Request) -> str:
    """
    Rate limiting identifier: uses authenticated user ID if available,
    otherwise falls back to client remote IP address.
    """
    # Slowapi rate limit key
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = decode_jwt_token(token)
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except Exception:
            pass
    return get_remote_address(request)


# Initialize Slowapi Limiter with Redis backend or in-memory fallback
def _init_limiter() -> Limiter:
    """
    Attempts to connect to Redis. If Redis is down or unreachable (e.g. in local tests),
    transparently falls back to memory storage.
    """
    if settings.REDIS_URL:
        try:
            import redis
            r = redis.from_url(settings.REDIS_URL, socket_timeout=1)
            r.ping()
            logger.info("Successfully connected to Redis for rate-limiting.")
            return Limiter(
                key_func=get_client_ip_or_user,
                storage_uri=settings.REDIS_URL,
                default_limits=[settings.RATE_LIMIT_DEFAULT]
            )
        except Exception as e:
            logger.warning(f"Redis unavailable ({e}). Rate limiting falling back to in-memory storage.")

    return Limiter(
        key_func=get_client_ip_or_user,
        default_limits=[settings.RATE_LIMIT_DEFAULT]
    )


limiter = _init_limiter()


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    FastAPI dependency validating the JWT access token and resolving the current User.
    """
    if not credentials:
        raise TokenExpiredOrInvalidException("Missing bearer token in Authorization header.")

    token = credentials.credentials
    try:
        payload = decode_jwt_token(token)
        token_type = payload.get("type")
        if token_type != "access":
            raise TokenExpiredOrInvalidException("Invalid token type. Expected access token.")

        user_id = payload.get("sub")
        if not user_id:
            raise TokenExpiredOrInvalidException("Subject missing in token claims.")

    except Exception:
        raise TokenExpiredOrInvalidException()

    stmt = select(User).where(User.id == int(user_id))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise TokenExpiredOrInvalidException("User no longer exists.")

    if not user.is_active:
        raise InactiveUserException()

    return user
