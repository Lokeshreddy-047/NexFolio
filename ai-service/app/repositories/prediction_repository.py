from app.db.mongodb import get_database
from bson import ObjectId


async def save_prediction(document: dict) -> str:
    db = get_database()
    result = await db.predictions.insert_one(document)
    return str(result.inserted_id)


async def get_recent_predictions(limit: int = 20):
    db = get_database()
    cursor = db.predictions.find().sort("created_at", -1).limit(limit)
    return await cursor.to_list(length=limit)


async def get_prediction_by_id(prediction_id: str):
    db = get_database()
    return await db.predictions.find_one({"_id": ObjectId(prediction_id)})