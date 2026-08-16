from typing import Optional, List
from bson import ObjectId
from app.db.mongodb import get_database


async def save_prediction(document: dict) -> str:
    """
    Saves a prediction document linked to an authenticated user_id.
    """
    try:
        db = get_database()
        result = await db.predictions.insert_one(document)
        return str(result.inserted_id)
    except Exception as exc:
        print(f"[MongoDB prediction_repository] Save warning: {exc}")
        return ""


async def get_predictions_by_user(user_id: str, limit: int = 20) -> List[dict]:
    """
    Retrieves recent predictions strictly filtered by the authenticated user's ID.
    Enforces tenant data isolation.
    """
    try:
        db = get_database()
        cursor = db.predictions.find({"user_id": user_id}).sort("created_at", -1).limit(limit)
        return await cursor.to_list(length=limit)
    except Exception as exc:
        print(f"[MongoDB prediction_repository] User predictions read warning: {exc}")
        return []


async def get_prediction_by_id_and_user(prediction_id: str, user_id: str) -> Optional[dict]:
    """
    Retrieves a prediction by ID only if it belongs to the authenticated user.
    Prevents cross-user data exposure.
    """
    try:
        db = get_database()
        return await db.predictions.find_one({
            "_id": ObjectId(prediction_id),
            "user_id": user_id
        })
    except Exception as exc:
        print(f"[MongoDB prediction_repository] Lookup warning: {exc}")
        return None


async def get_recent_predictions(limit: int = 20) -> List[dict]:
    """
    Legacy global query fallback.
    """
    try:
        db = get_database()
        cursor = db.predictions.find().sort("created_at", -1).limit(limit)
        return await cursor.to_list(length=limit)
    except Exception as exc:
        print(f"[MongoDB prediction_repository] Global read warning: {exc}")
        return []


async def get_prediction_by_id(prediction_id: str) -> Optional[dict]:
    """
    Legacy single prediction query fallback.
    """
    try:
        db = get_database()
        return await db.predictions.find_one({"_id": ObjectId(prediction_id)})
    except Exception as exc:
        print(f"[MongoDB prediction_repository] Legacy lookup warning: {exc}")
        return None