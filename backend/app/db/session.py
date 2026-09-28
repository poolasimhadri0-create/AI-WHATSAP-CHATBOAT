from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine
)
from app.core.config import settings
from app.utils.logger import logger

def _create_engine(db_url: str) -> AsyncEngine:
    if db_url.startswith("sqlite"):
        return create_async_engine(db_url, echo=False)
    return create_async_engine(
        db_url,
        echo=False,
        pool_pre_ping=True,
        pool_recycle=3600,
        pool_size=10,
        max_overflow=20
    )

# Build Async Engine
engine: AsyncEngine = _create_engine(settings.DATABASE_URL)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False
)

def switch_to_sqlite():
    global engine, AsyncSessionLocal
    fallback_url = "sqlite+aiosqlite:///./chatbot.db"
    logger.warning(f"Switching database engine to fallback SQLite: {fallback_url}")
    engine = create_async_engine(fallback_url, echo=False)
    AsyncSessionLocal = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False
    )
    return engine


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields an async database session per request,
    ensuring rollback on unhandled exceptions and reliable cleanup.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session rolled back due to error: {e}")
            raise
        finally:
            await session.close()
