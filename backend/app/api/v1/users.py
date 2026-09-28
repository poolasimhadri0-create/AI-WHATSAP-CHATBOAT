from fastapi import APIRouter, Depends
from app.models.models import User
from app.schemas.schemas import UserResponse
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile"
)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Returns authenticated user's ID, name, email, active status, and creation date.
    """
    return current_user
