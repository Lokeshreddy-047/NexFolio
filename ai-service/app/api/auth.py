from fastapi import APIRouter, Depends

from app.schemas.user import UserPrincipal, UserProfileResponse
from app.dependencies.auth import get_current_user
from app.repositories.user_repository import get_user_by_uid
from app.repositories.prediction_repository import get_predictions_by_user

router = APIRouter(prefix="/auth", tags=["Authentication & User Profile"])


@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(current_user: UserPrincipal = Depends(get_current_user)):
    """
    Returns the authenticated user's profile and usage statistics.
    """
    user_doc = await get_user_by_uid(current_user.uid)
    user_predictions = await get_predictions_by_user(current_user.uid, limit=100)

    created_at = None
    last_login = None
    if user_doc:
        created_at = user_doc.get("created_at")
        last_login = user_doc.get("last_login")

    return UserProfileResponse(
        uid=current_user.uid,
        email=current_user.email,
        name=current_user.name,
        picture=current_user.picture,
        created_at=created_at,
        last_login=last_login,
        portfolio_count=0,
        predictions_count=len(user_predictions)
    )
