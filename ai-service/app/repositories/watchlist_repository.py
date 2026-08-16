from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from bson.errors import InvalidId

from app.db.mongodb import get_database

DEFAULT_WATCHLIST_SYMBOLS = [
    "RELIANCE.NS",
    "TCS.NS",
    "HDFCBANK.NS",
    "INFY.NS",
    "ICICIBANK.NS",
    "BHARTIARTL.NS",
    "ITC.NS",
    "LT.NS"
]


def _to_id_query(watchlist_id: str, user_id: str) -> dict:
    try:
        return {"_id": ObjectId(watchlist_id), "user_id": user_id}
    except InvalidId:
        return {"_id": watchlist_id, "user_id": user_id}


async def get_watchlists_by_user(user_id: str) -> List[dict]:
    db = get_database()
    cursor = db.watchlists.find({"user_id": user_id}).sort("created_at", 1)
    watchlists = await cursor.to_list(length=50)

    # Auto-initialize default watchlist if user has none
    if not watchlists:
        now = datetime.now(timezone.utc)
        default_doc = {
            "user_id": user_id,
            "name": "Primary Watchlist",
            "symbols": DEFAULT_WATCHLIST_SYMBOLS,
            "created_at": now,
            "updated_at": now,
        }
        res = await db.watchlists.insert_one(default_doc)
        default_doc["_id"] = str(res.inserted_id)
        return [default_doc]

    for w in watchlists:
        w["_id"] = str(w["_id"])
    return watchlists


async def get_watchlist_by_id_and_user(watchlist_id: str, user_id: str) -> Optional[dict]:
    db = get_database()
    doc = await db.watchlists.find_one(_to_id_query(watchlist_id, user_id))
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc


async def create_watchlist(user_id: str, name: str) -> dict:
    db = get_database()
    now = datetime.now(timezone.utc)
    document = {
        "user_id": user_id,
        "name": name.strip(),
        "symbols": [],
        "created_at": now,
        "updated_at": now,
    }
    res = await db.watchlists.insert_one(document)
    document["_id"] = str(res.inserted_id)
    return document


async def toggle_symbol_in_watchlist(user_id: str, watchlist_id: str, symbol: str) -> dict:
    db = get_database()
    clean_sym = symbol.strip().upper()
    if not clean_sym.endswith(".NS") and "." not in clean_sym:
        clean_sym = f"{clean_sym}.NS"

    query = _to_id_query(watchlist_id, user_id)
    watchlist = await db.watchlists.find_one(query)
    if not watchlist:
        raise ValueError("Watchlist not found or access denied.")

    symbols: List[str] = watchlist.get("symbols", [])
    if clean_sym in symbols:
        symbols.remove(clean_sym)
    else:
        symbols.append(clean_sym)

    now = datetime.now(timezone.utc)
    await db.watchlists.update_one(
        query,
        {"$set": {"symbols": symbols, "updated_at": now}}
    )

    watchlist["symbols"] = symbols
    watchlist["updated_at"] = now
    watchlist["_id"] = str(watchlist["_id"])
    return watchlist


async def delete_watchlist(user_id: str, watchlist_id: str) -> bool:
    db = get_database()
    res = await db.watchlists.delete_one(_to_id_query(watchlist_id, user_id))
    return res.deleted_count > 0
