from datetime import datetime, timezone, timedelta
from typing import List, Optional
from bson import ObjectId
from app.db.mongodb import get_database


async def record_snapshot(
    user_id: str,
    portfolio_id: str,
    data: dict,
    force_new: bool = False
) -> dict:
    """
    Records a valuation snapshot.
    If force_new is False (e.g. background automated poll), deduplicates within a 30-min window.
    If force_new is True (e.g. explicit user checkpoint), creates a new historical entry.
    """
    now = data.get("timestamp") or datetime.now(timezone.utc)
    if isinstance(now, str):
        now = datetime.fromisoformat(now.replace("Z", "+00:00"))

    total_val = round(float(data.get("total_value", 0.0)), 2)
    invested = round(float(data.get("invested_capital", 0.0)), 2)
    day_pnl = round(float(data.get("day_pnl", 0.0)), 2)
    total_pnl = round(float(data.get("total_pnl", total_val - invested)), 2)
    roi_pct = round(float(data.get("total_roi_pct", (total_pnl / invested * 100.0) if invested > 0 else 0.0)), 2)

    db = get_database()

    if not force_new:
        recent_cutoff = now - timedelta(minutes=30)
        existing = await db.portfolio_snapshots.find_one({
            "user_id": user_id,
            "portfolio_id": portfolio_id,
            "timestamp": {"$gte": recent_cutoff}
        })

        if existing:
            await db.portfolio_snapshots.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "total_value": total_val,
                    "invested_capital": invested,
                    "day_pnl": day_pnl,
                    "total_pnl": total_pnl,
                    "total_roi_pct": roi_pct,
                    "timestamp": now,
                }}
            )
            existing["total_value"] = total_val
            existing["invested_capital"] = invested
            existing["day_pnl"] = day_pnl
            existing["total_pnl"] = total_pnl
            existing["total_roi_pct"] = roi_pct
            existing["timestamp"] = now
            existing["_id"] = str(existing["_id"])
            return existing

    document = {
        "user_id": user_id,
        "portfolio_id": portfolio_id,
        "total_value": total_val,
        "invested_capital": invested,
        "day_pnl": day_pnl,
        "total_pnl": total_pnl,
        "total_roi_pct": roi_pct,
        "timestamp": now,
    }

    res = await db.portfolio_snapshots.insert_one(document)
    document["_id"] = str(res.inserted_id)
    return document


async def get_snapshots_by_portfolio(
    user_id: str,
    portfolio_id: str,
    limit: int = 365
) -> List[dict]:
    try:
        db = get_database()
        cursor = db.portfolio_snapshots.find({
            "user_id": user_id,
            "portfolio_id": portfolio_id
        }).sort("timestamp", 1).limit(limit)

        snapshots = await cursor.to_list(length=limit)
        for s in snapshots:
            s["_id"] = str(s["_id"])
        return snapshots
    except Exception as exc:
        print(f"[snapshot_repository] get_snapshots warning: {exc}")
        return []
