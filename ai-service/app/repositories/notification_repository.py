from datetime import datetime, timezone, timedelta
from typing import List, Optional
from bson import ObjectId
from bson.errors import InvalidId

from app.db.mongodb import get_database


def _to_id_query(notification_id: str, user_id: str) -> dict:
    try:
        return {"_id": ObjectId(notification_id), "user_id": user_id}
    except InvalidId:
        return {"_id": notification_id, "user_id": user_id}


async def get_notifications_by_user(user_id: str, limit: int = 50) -> List[dict]:
    db = get_database()
    cursor = db.notifications.find({"user_id": user_id}).sort("created_at", -1)
    notes = await cursor.to_list(length=limit)
    for n in notes:
        n["_id"] = str(n["_id"])
    return notes


async def create_notification(
    user_id: str,
    title: str,
    message: str,
    type: str = "SYSTEM",
    severity: str = "INFO",
    portfolio_id: Optional[str] = None,
    action_link: Optional[str] = None,
) -> dict:
    db = get_database()
    now = datetime.now(timezone.utc)
    document = {
        "user_id": user_id,
        "portfolio_id": portfolio_id,
        "type": type,
        "severity": severity,
        "title": title,
        "message": message,
        "is_read": False,
        "action_link": action_link,
        "created_at": now,
    }
    res = await db.notifications.insert_one(document)
    document["_id"] = str(res.inserted_id)
    return document


async def mark_notification_as_read(user_id: str, notification_id: str) -> bool:
    db = get_database()
    res = await db.notifications.update_one(
        _to_id_query(notification_id, user_id),
        {"$set": {"is_read": True}}
    )
    return res.modified_count > 0


async def mark_all_as_read(user_id: str) -> int:
    db = get_database()
    res = await db.notifications.update_many(
        {"user_id": user_id, "is_read": False},
        {"$set": {"is_read": True}}
    )
    return res.modified_count


async def check_and_generate_portfolio_alerts(
    user_id: str,
    portfolio_id: str,
    portfolio_name: str,
    total_val: float,
    holdings: list,
    health_score: int,
    risk_category: str
) -> None:
    """
    Evaluates portfolio health and concentration metrics, and emits
    deduplicated in-app alerts with a 24-hour cooldown window.
    """
    db = get_database()
    now = datetime.now(timezone.utc)
    cooldown_cutoff = now - timedelta(hours=24)

    # 1. Concentration Check
    if total_val > 0 and holdings:
        # Check single holding concentration > 25%
        for h in holdings:
            sym = h.get("symbol", "Asset")
            qty = float(h.get("quantity", 0))
            price = float(h.get("current_price", 0))
            val = qty * price
            wt = (val / total_val) * 100.0

            if wt > 25.0:
                # Check cooldown
                existing = await db.notifications.find_one({
                    "user_id": user_id,
                    "portfolio_id": portfolio_id,
                    "type": "CONCENTRATION_ALERT",
                    "created_at": {"$gte": cooldown_cutoff}
                })
                if not existing:
                    await create_notification(
                        user_id=user_id,
                        portfolio_id=portfolio_id,
                        type="CONCENTRATION_ALERT",
                        severity="WARNING",
                        title=f"Elevated Asset Concentration ({sym})",
                        message=f"{sym} represents {wt:.1f}% of {portfolio_name}, exceeding the 25% threshold.",
                        action_link="/intelligence"
                    )
                break

    # 2. Risk Level Warning Check
    if risk_category == "HIGH":
        existing_risk = await db.notifications.find_one({
            "user_id": user_id,
            "portfolio_id": portfolio_id,
            "type": "RISK_SHIFT",
            "created_at": {"$gte": cooldown_cutoff}
        })
        if not existing_risk:
            await create_notification(
                user_id=user_id,
                portfolio_id=portfolio_id,
                type="RISK_SHIFT",
                severity="CRITICAL",
                title=f"High Risk Profile Detected",
                message=f"XGBoost risk classification identified elevated volatility & concentration in {portfolio_name}.",
                action_link="/intelligence"
            )

    # 3. Health Score Milestone Check
    if health_score >= 80:
        existing_hlth = await db.notifications.find_one({
            "user_id": user_id,
            "portfolio_id": portfolio_id,
            "type": "HEALTH_SCORE_MILESTONE",
            "created_at": {"$gte": cooldown_cutoff}
        })
        if not existing_hlth:
            await create_notification(
                user_id=user_id,
                portfolio_id=portfolio_id,
                type="HEALTH_SCORE_MILESTONE",
                severity="INFO",
                title=f"Portfolio Health Milestone",
                message=f"{portfolio_name} achieved an institutional Health Score of {health_score}/100.",
                action_link="/intelligence"
            )
