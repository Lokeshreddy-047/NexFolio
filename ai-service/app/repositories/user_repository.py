from datetime import datetime, timezone
from typing import Optional
from app.db.mongodb import get_database


async def upsert_user(user_principal: dict) -> Optional[dict]:
    """
    Creates or updates a user document in MongoDB upon successful authentication.
    """
    uid = user_principal.get("uid")
    if not uid:
        return None

    now = datetime.now(timezone.utc)
    update_data = {
        "uid": uid,
        "email": user_principal.get("email"),
        "name": user_principal.get("name"),
        "picture": user_principal.get("picture"),
        "last_login": now,
        "updated_at": now,
    }

    try:
        db = get_database()
        await db.users.update_one(
            {"uid": uid},
            {
                "$set": update_data,
                "$setOnInsert": {
                    "created_at": now,
                    "preferences": {
                        "theme": "dark",
                        "currency": "INR",
                    }
                }
            },
            upsert=True
        )
        return await db.users.find_one({"uid": uid})
    except Exception as exc:
        print(f"[MongoDB user_repository] Warning (DB sync skipped): {exc}")
        return update_data


async def get_user_by_uid(uid: str) -> Optional[dict]:
    """
    Retrieves user profile document by Firebase UID.
    """
    try:
        db = get_database()
        return await db.users.find_one({"uid": uid})
    except Exception as exc:
        print(f"[MongoDB user_repository] Warning (DB read skipped): {exc}")
        return None
