from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from bson.errors import InvalidId
from app.db.mongodb import get_database


def _to_id_query(portfolio_id: str, user_id: str) -> dict:
    try:
        return {"_id": ObjectId(portfolio_id), "user_id": user_id}
    except InvalidId:
        return {"_id": portfolio_id, "user_id": user_id}


async def create_portfolio(user_id: str, data: dict) -> dict:
    now = datetime.now(timezone.utc)
    document = {
        "user_id": user_id,
        "name": data.get("name", "My Portfolio"),
        "description": data.get("description", ""),
        "currency": data.get("currency", "INR"),
        "is_default": bool(data.get("is_default", False)),
        "realized_pnl": 0.0,
        "created_at": now,
        "updated_at": now,
    }
    db = get_database()
    result = await db.portfolios.insert_one(document)
    document["_id"] = str(result.inserted_id)
    return document


async def get_portfolios_by_user(user_id: str) -> List[dict]:
    try:
        db = get_database()
        cursor = db.portfolios.find({"user_id": user_id}).sort("created_at", -1)
        portfolios = await cursor.to_list(length=100)
        for p in portfolios:
            p["_id"] = str(p["_id"])
        return portfolios
    except Exception as exc:
        print(f"[portfolio_repository] get_portfolios_by_user warning: {exc}")
        return []


async def get_portfolio_by_id_and_user(portfolio_id: str, user_id: str) -> Optional[dict]:
    try:
        db = get_database()
        doc = await db.portfolios.find_one(_to_id_query(portfolio_id, user_id))
        if doc:
            doc["_id"] = str(doc["_id"])
        return doc
    except Exception as exc:
        print(f"[portfolio_repository] get_portfolio_by_id_and_user warning: {exc}")
        return None


async def update_portfolio(portfolio_id: str, user_id: str, update_data: dict) -> Optional[dict]:
    try:
        db = get_database()
        clean_update = {k: v for k, v in update_data.items() if v is not None}
        clean_update["updated_at"] = datetime.now(timezone.utc)

        result = await db.portfolios.find_one_and_update(
            _to_id_query(portfolio_id, user_id),
            {"$set": clean_update},
            return_document=True
        )
        if result:
            result["_id"] = str(result["_id"])
        return result
    except Exception as exc:
        print(f"[portfolio_repository] update_portfolio warning: {exc}")
        return None


async def delete_portfolio(portfolio_id: str, user_id: str) -> bool:
    try:
        db = get_database()
        res = await db.portfolios.delete_one(_to_id_query(portfolio_id, user_id))
        if res.deleted_count > 0:
            # Cascade delete holdings and transactions
            await db.holdings.delete_many({"portfolio_id": portfolio_id, "user_id": user_id})
            await db.transactions.delete_many({"portfolio_id": portfolio_id, "user_id": user_id})
            return True
        return False
    except Exception as exc:
        print(f"[portfolio_repository] delete_portfolio warning: {exc}")
        return False
