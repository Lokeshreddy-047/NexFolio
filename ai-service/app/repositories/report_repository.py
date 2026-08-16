from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from bson.errors import InvalidId

from app.db.mongodb import get_database


def _to_id_query(report_id: str, user_id: str) -> dict:
    try:
        return {"_id": ObjectId(report_id), "user_id": user_id}
    except InvalidId:
        return {"_id": report_id, "user_id": user_id}


async def save_report_snapshot(report_doc: dict) -> dict:
    db = get_database()
    res = await db.portfolio_reports.insert_one(report_doc)
    report_doc["_id"] = str(res.inserted_id)
    return report_doc


async def get_reports_by_portfolio(user_id: str, portfolio_id: str) -> List[dict]:
    db = get_database()
    cursor = db.portfolio_reports.find({
        "user_id": user_id,
        "portfolio_id": portfolio_id
    }).sort("generated_at", -1)
    reports = await cursor.to_list(length=50)
    for r in reports:
        r["_id"] = str(r["_id"])
    return reports


async def get_report_by_id_and_user(report_id: str, user_id: str) -> Optional[dict]:
    db = get_database()
    doc = await db.portfolio_reports.find_one(_to_id_query(report_id, user_id))
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc
