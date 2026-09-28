from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

from app.core.config import settings
from app.core.middleware import LoggingMiddleware
from app.core.dependencies import limiter
from app.utils.exceptions import ChatbotBaseException
from app.utils.logger import logger
from app.api.v1.auth import router as auth_router
from app.api.v1.chat import router as chat_router
from app.api.v1.history import router as history_router
from app.api.v1.users import router as users_router
from app.api.v1.whatsapp import router as whatsapp_router
from app.db.session import engine
from app.db.base import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handling startup initializations and shutdown cleanups.
    Auto-creates database tables in development mode.
    """
    logger.info(f"Starting {settings.APP_NAME} in [{settings.ENVIRONMENT}] mode...")
    try:
        # Create database tables if they do not exist
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema verified and initialized.")
    except Exception as e:
        logger.warning(
            f"Database auto-migration skipped or connection deferred: {e}. "
            "Ensure MySQL is running and Alembic migrations are executed."
        )

    yield

    logger.info("Shutting down application and disposing connection pools...")
    await engine.dispose()
    logger.info("Cleanup complete.")


def create_application() -> FastAPI:
    """FastAPI application factory."""
    app = FastAPI(
        title=settings.APP_NAME,
        version="1.0.0",
        description="Production-grade AI Chatbot Backend with FastAPI, MySQL, JWT, and SSE Streaming",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc"
    )

    # Attach Slowapi Rate Limiter state
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # 1. Custom Exception Handlers for consistent JSON error responses
    @app.exception_handler(ChatbotBaseException)
    async def chatbot_exception_handler(request: Request, exc: ChatbotBaseException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail,
                "error_code": exc.error_code
            },
            headers=exc.headers
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception(f"Unhandled Exception on {request.method} {request.url.path}: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "An internal server error occurred.",
                "error_code": "INTERNAL_SERVER_ERROR"
            }
        )

    # 2. CORS Middleware
    origins = settings.ALLOWED_ORIGINS
    if isinstance(origins, str):
        origins = [origins]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Process-Time-Ms"]
    )

    # 3. Logging & Request Auditing Middleware
    app.add_middleware(LoggingMiddleware)

    # 4. Include API Routers
    api_v1_prefix = settings.API_V1_PREFIX
    app.include_router(auth_router, prefix=api_v1_prefix)
    app.include_router(chat_router, prefix=api_v1_prefix)
    app.include_router(history_router, prefix=api_v1_prefix)
    app.include_router(users_router, prefix=api_v1_prefix)
    app.include_router(whatsapp_router, prefix=api_v1_prefix)

    # Root route with helpful documentation links
    @app.get("/", tags=["Root"])
    async def root():
        return {
            "app": settings.APP_NAME,
            "version": "1.0.0",
            "docs": "/docs",
            "redoc": "/redoc",
            "health": "/health",
            "api_prefix": settings.API_V1_PREFIX,
            "endpoints": {
                "auth": f"{settings.API_V1_PREFIX}/auth",
                "chat": f"{settings.API_V1_PREFIX}/chat",
                "history": f"{settings.API_V1_PREFIX}/chat/history",
                "users": f"{settings.API_V1_PREFIX}/users"
            }
        }

    # Health check endpoint
    @app.get("/health", tags=["Health"])
    async def health_check():
        return {
            "status": "healthy",
            "environment": settings.ENVIRONMENT,
            "version": "1.0.0"
        }

    # Silence browser favicon 404 logs
    @app.get("/favicon.ico", include_in_schema=False)
    async def favicon():
        from fastapi import Response
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return app


app = create_application()
