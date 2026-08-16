from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr


class UserPrincipal(BaseModel):
    uid: str
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    auth_time: Optional[int] = None
    provider: Optional[str] = "google.com"


class UserProfileResponse(BaseModel):
    uid: str
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    portfolio_count: int = 0
    predictions_count: int = 0


class UserPreferencesUpdate(BaseModel):
    theme: Optional[str] = Field("dark", pattern="^(light|dark|system)$")
    currency: Optional[str] = Field("INR", max_length=5)
    default_portfolio_id: Optional[str] = None
