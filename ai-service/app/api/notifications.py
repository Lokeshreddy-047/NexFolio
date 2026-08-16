from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.user import UserPrincipal
from app.dependencies.auth import get_current_user
from app.schemas.notifications import (
    NotificationListResponse,
    NotificationItem,
    NotificationReadRequest
)
from app.repositories.notification_repository import (
    get_notifications_by_user,
    mark_notification_as_read,
    mark_all_as_read
)

router = APIRouter(prefix="/notifications", tags=["Notifications & Alerts"])


@router.get("", response_model=NotificationListResponse)
async def list_user_notifications(
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Returns in-app notifications for authenticated user with unread count.
    """
    raw_notes = await get_notifications_by_user(current_user.uid)
    items = [
        NotificationItem(
            id=n["_id"],
            user_id=n["user_id"],
            portfolio_id=n.get("portfolio_id"),
            type=n.get("type", "SYSTEM"),
            severity=n.get("severity", "INFO"),
            title=n["title"],
            message=n["message"],
            is_read=n.get("is_read", False),
            action_link=n.get("action_link"),
            created_at=n["created_at"]
        )
        for n in raw_notes
    ]
    unread = sum(1 for item in items if not item.is_read)
    return NotificationListResponse(
        unread_count=unread,
        total_count=len(items),
        notifications=items
    )


@router.post("/{notification_id}/read", response_model=dict)
async def mark_single_notification_read(
    notification_id: str,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Marks a single notification as read.
    """
    success = await mark_notification_as_read(current_user.uid, notification_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found or already read."
        )
    return {"status": "success", "id": notification_id}


@router.post("/read-all", response_model=dict)
async def mark_all_notifications_read(
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Marks all notifications for current user as read.
    """
    count = await mark_all_as_read(current_user.uid)
    return {"status": "success", "marked_read_count": count}
