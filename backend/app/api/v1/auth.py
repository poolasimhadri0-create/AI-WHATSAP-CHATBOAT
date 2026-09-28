from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.schemas import UserCreate, UserLogin, TokenResponse, UserResponse, RefreshTokenRequest, AccessTokenResponse
from app.services.auth_service import auth_service
from app.core.dependencies import limiter
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account"
)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def register(
    request: Request,
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Registers a new user with email, name, and password.
    Hashes password securely via bcrypt.
    """
    return await auth_service.register_user(db, user_in)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="User login returning JWT access and refresh tokens"
)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def login(
    request: Request,
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticates user credentials and issues an access token and refresh token.
    """
    return await auth_service.authenticate_user(db, login_data)


@router.post(
    "/refresh",
    response_model=AccessTokenResponse,
    summary="Exchange refresh token for a new access token"
)
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def refresh_token(
    request: Request,
    refresh_in: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Validates the refresh token and returns a new access token.
    """
    new_token = await auth_service.refresh_access_token(db, refresh_in.refresh_token)
    return AccessTokenResponse(access_token=new_token)
