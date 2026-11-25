from datetime import datetime, timezone
from typing import Optional, Dict
import time
from app.db.mongodb import get_database

_last_user_sync: Dict[str, float] = {}
SYNC_THROTTLE_SECONDS = 300.0  # 5 minutes


async def upsert_user(user_principal: dict, force: bool = False) -> Optional[dict]:
    """
    Creates or updates a user document in MongoDB upon successful authentication.
    Throttled to once every 5 minutes per user to prevent redundant database writes on every read request.
    """
    uid = user_principal.get("uid")
    if not uid:
        return None

    now_ts = time.time()
    last_sync = _last_user_sync.get(uid, 0.0)

    # Skip database write if synced within the last 5 minutes
    if not force and (now_ts - last_sync < SYNC_THROTTLE_SECONDS):
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
        _last_user_sync[uid] = now_ts
        return update_data
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
