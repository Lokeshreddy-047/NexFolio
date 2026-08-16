from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.schemas.user import UserPrincipal
from app.services.firebase_auth import verify_firebase_token
from app.repositories.user_repository import upsert_user

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> UserPrincipal:
    """
    FastAPI dependency that extracts and validates the Firebase Bearer token.
    Enforces authentication and returns the verified UserPrincipal.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials
    claims = verify_firebase_token(token)

    uid = claims.get("uid") or claims.get("user_id")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload: missing user identifier.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user_principal = UserPrincipal(
        uid=uid,
        email=claims.get("email"),
        name=claims.get("name"),
        picture=claims.get("picture"),
        auth_time=claims.get("auth_time"),
        provider=claims.get("firebase", {}).get("sign_in_provider", "google.com")
        if isinstance(claims.get("firebase"), dict) else "google.com"
    )

    # Sync / upsert profile in MongoDB asynchronously
    await upsert_user(user_principal.model_dump())

    return user_principal


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)
) -> Optional[UserPrincipal]:
    """
    Optional authentication dependency for endpoints that support both public and authenticated views.
    """
    if not credentials or not credentials.credentials:
        return None

    try:
        claims = verify_firebase_token(credentials.credentials)
        uid = claims.get("uid") or claims.get("user_id")
        if not uid:
            return None

        user_principal = UserPrincipal(
            uid=uid,
            email=claims.get("email"),
            name=claims.get("name"),
            picture=claims.get("picture"),
            auth_time=claims.get("auth_time")
        )
        await upsert_user(user_principal.model_dump())
        return user_principal
    except Exception:
        return None
