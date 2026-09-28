from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import User
from app.schemas.schemas import UserCreate, UserLogin, TokenResponse, UserResponse
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_jwt_token
from app.utils.exceptions import EntityAlreadyExistsException, InvalidCredentialsException, TokenExpiredOrInvalidException, InactiveUserException
from app.utils.logger import logger


class AuthService:
    """
    Handles authentication business logic including registration,
    login credential verification, and refresh token exchange.
    """

    async def register_user(self, db: AsyncSession, user_in: UserCreate) -> UserResponse:
        # Check if email is already taken
        stmt = select(User).where(User.email == user_in.email)
        result = await db.execute(stmt)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            logger.warning(f"Registration failed: Email '{user_in.email}' already exists.")
            raise EntityAlreadyExistsException("User", "email", user_in.email)

        # Create new user
        hashed_pwd = hash_password(user_in.password)
        new_user = User(
            email=user_in.email,
            name=user_in.name,
            hashed_password=hashed_pwd,
            is_active=True
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        logger.info(f"User registered successfully: ID={new_user.id}, Email={new_user.email}")
        return UserResponse.model_validate(new_user)

    async def authenticate_user(self, db: AsyncSession, login_data: UserLogin) -> TokenResponse:
        # Fetch user by email
        stmt = select(User).where(User.email == login_data.email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not verify_password(login_data.password, user.hashed_password):
            logger.warning(f"Failed login attempt for email: '{login_data.email}'")
            raise InvalidCredentialsException()

        if not user.is_active:
            raise InactiveUserException()

        # Generate tokens
        access_token = create_access_token(subject=user.id)
        refresh_token = create_refresh_token(subject=user.id)

        logger.info(f"User logged in successfully: ID={user.id}")
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )

    async def refresh_access_token(self, db: AsyncSession, refresh_token: str) -> str:
        try:
            payload = decode_jwt_token(refresh_token)
            if payload.get("type") != "refresh":
                raise TokenExpiredOrInvalidException("Invalid token type. Expected refresh token.")

            user_id = payload.get("sub")
            if not user_id:
                raise TokenExpiredOrInvalidException("Token subject missing.")

        except Exception as e:
            logger.warning(f"Invalid refresh token: {str(e)}")
            raise TokenExpiredOrInvalidException()

        # Check if user exists and is active
        stmt = select(User).where(User.id == int(user_id))
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            raise InactiveUserException()

        # Issue new access token
        new_access_token = create_access_token(subject=user.id)
        return new_access_token


auth_service = AuthService()
