from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class NotificationItem(BaseModel):
    id: str
    user_id: str
    portfolio_id: Optional[str] = None
    type: str  # "CONCENTRATION_ALERT", "RISK_SHIFT", "PRICE_ALERT", "HEALTH_SCORE_MILESTONE", "SYSTEM"
    severity: str  # "INFO", "WARNING", "CRITICAL"
    title: str
    message: str
    is_read: bool = False
    action_link: Optional[str] = None
    created_at: datetime


class NotificationListResponse(BaseModel):
    unread_count: int
    total_count: int
    notifications: List[NotificationItem] = []


class NotificationReadRequest(BaseModel):
    notification_ids: Optional[List[str]] = None
