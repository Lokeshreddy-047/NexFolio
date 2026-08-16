from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from bson import ObjectId

from app.db.mongodb import get_database


async def log_audit_event(
    user_id: str,
    event_type: str,
    description: str,
    portfolio_id: Optional[str] = None,
    actor: str = "USER",
    source: str = "WEB_DASHBOARD",
    model_version: Optional[str] = "XGBoost-Risk-v1.4.0",
    input_snapshot: Optional[Dict[str, Any]] = None,
    result_summary: Optional[Dict[str, Any]] = None,
) -> dict:
    db = get_database()
    now = datetime.now(timezone.utc)
    document = {
        "user_id": user_id,
        "portfolio_id": portfolio_id,
        "event_type": event_type,
        "timestamp": now,
        "actor": actor,
        "source": source,
        "model_version": model_version,
        "description": description,
        "input_snapshot": input_snapshot or {},
        "result_summary": result_summary or {},
    }
    res = await db.audit_logs.insert_one(document)
    document["_id"] = str(res.inserted_id)
    return document


async def get_audit_logs_by_user(
    user_id: str,
    portfolio_id: Optional[str] = None,
    limit: int = 50
) -> List[dict]:
    db = get_database()
    query: Dict[str, Any] = {"user_id": user_id}
    if portfolio_id:
        query["portfolio_id"] = portfolio_id

    cursor = db.audit_logs.find(query).sort("timestamp", -1)
    logs = await cursor.to_list(length=limit)
    for l in logs:
        l["_id"] = str(l["_id"])
    return logs
