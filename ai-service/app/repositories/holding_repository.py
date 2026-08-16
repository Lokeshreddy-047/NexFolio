from datetime import datetime, timezone
from typing import List, Optional, Tuple
from bson import ObjectId
from bson.errors import InvalidId

from app.db.mongodb import get_database
from app.services.stock_service import get_stock_info


def _to_id_query(holding_id: str, user_id: str) -> dict:
    try:
        return {"_id": ObjectId(holding_id), "user_id": user_id}
    except InvalidId:
        return {"_id": holding_id, "user_id": user_id}


async def get_holdings_by_portfolio(portfolio_id: str, user_id: str) -> List[dict]:
    try:
        db = get_database()
        cursor = db.holdings.find({"portfolio_id": portfolio_id, "user_id": user_id}).sort("symbol", 1)
        holdings = await cursor.to_list(length=200)
        for h in holdings:
            h["_id"] = str(h["_id"])
        return holdings
    except Exception as exc:
        print(f"[holding_repository] get_holdings_by_portfolio warning: {exc}")
        return []


async def get_holding_by_id_and_user(holding_id: str, user_id: str) -> Optional[dict]:
    try:
        db = get_database()
        doc = await db.holdings.find_one(_to_id_query(holding_id, user_id))
        if doc:
            doc["_id"] = str(doc["_id"])
        return doc
    except Exception as exc:
        print(f"[holding_repository] get_holding_by_id_and_user warning: {exc}")
        return None


async def create_direct_holding(user_id: str, data: dict) -> dict:
    now = datetime.now(timezone.utc)
    symbol = data.get("symbol", "").upper().strip()
    stock_meta = get_stock_info(symbol)

    qty = float(data.get("quantity", 0.0))
    buy_price = float(data.get("buy_price", 0.0))
    curr_price = float(data.get("current_price") or buy_price or stock_meta.get("reference_price", 500.0))

    document = {
        "portfolio_id": data.get("portfolio_id"),
        "user_id": user_id,
        "symbol": stock_meta["symbol"],
        "company_name": data.get("company_name") or stock_meta["company_name"],
        "asset_type": data.get("asset_type") or stock_meta["asset_type"],
        "sector": data.get("sector") or stock_meta["sector"],
        "quantity": qty,
        "avg_buy_price": buy_price,
        "current_price": curr_price,
        "notes": data.get("notes", ""),
        "created_at": now,
        "updated_at": now,
    }

    db = get_database()
    # If holding for this symbol already exists in portfolio, update it
    existing = await db.holdings.find_one({
        "portfolio_id": data.get("portfolio_id"),
        "user_id": user_id,
        "symbol": stock_meta["symbol"]
    })

    if existing:
        old_qty = float(existing.get("quantity", 0.0))
        old_avg = float(existing.get("avg_buy_price", 0.0))
        new_qty = old_qty + qty
        new_avg = ((old_qty * old_avg) + (qty * buy_price)) / new_qty if new_qty > 0 else buy_price

        await db.holdings.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "quantity": new_qty,
                "avg_buy_price": round(new_avg, 2),
                "current_price": curr_price,
                "updated_at": now,
            }}
        )
        existing["quantity"] = new_qty
        existing["avg_buy_price"] = round(new_avg, 2)
        existing["current_price"] = curr_price
        existing["_id"] = str(existing["_id"])
        return existing

    result = await db.holdings.insert_one(document)
    document["_id"] = str(result.inserted_id)
    return document


async def update_holding(holding_id: str, user_id: str, update_data: dict) -> Optional[dict]:
    try:
        db = get_database()
        clean = {k: v for k, v in update_data.items() if v is not None}
        clean["updated_at"] = datetime.now(timezone.utc)

        result = await db.holdings.find_one_and_update(
            _to_id_query(holding_id, user_id),
            {"$set": clean},
            return_document=True
        )
        if result:
            result["_id"] = str(result["_id"])
        return result
    except Exception as exc:
        print(f"[holding_repository] update_holding warning: {exc}")
        return None


async def delete_holding(holding_id: str, user_id: str) -> bool:
    try:
        db = get_database()
        res = await db.holdings.delete_one(_to_id_query(holding_id, user_id))
        return res.deleted_count > 0
    except Exception as exc:
        print(f"[holding_repository] delete_holding warning: {exc}")
        return False


async def apply_buy_transaction(
    user_id: str,
    portfolio_id: str,
    symbol: str,
    quantity: float,
    price: float,
    asset_type: Optional[str] = None,
    sector: Optional[str] = None,
    company_name: Optional[str] = None
) -> dict:
    stock_meta = get_stock_info(symbol)
    resolved_symbol = stock_meta["symbol"]
    resolved_name = company_name or stock_meta["company_name"]
    resolved_sector = sector or stock_meta["sector"]
    resolved_type = asset_type or stock_meta["asset_type"]

    return await create_direct_holding(
        user_id=user_id,
        data={
            "portfolio_id": portfolio_id,
            "symbol": resolved_symbol,
            "company_name": resolved_name,
            "sector": resolved_sector,
            "asset_type": resolved_type,
            "quantity": quantity,
            "buy_price": price,
            "current_price": price,
        }
    )


async def apply_sell_transaction(
    user_id: str,
    portfolio_id: str,
    symbol: str,
    quantity: float,
    price: float
) -> Tuple[Optional[dict], float]:
    """
    Applies a SELL transaction to existing holding:
    Returns (updated_holding_or_None, realized_pnl).
    """
    stock_meta = get_stock_info(symbol)
    resolved_symbol = stock_meta["symbol"]
    now = datetime.now(timezone.utc)
    db = get_database()

    existing = await db.holdings.find_one({
        "portfolio_id": portfolio_id,
        "user_id": user_id,
        "symbol": resolved_symbol
    })

    if not existing:
        return None, 0.0

    old_qty = float(existing.get("quantity", 0.0))
    avg_buy = float(existing.get("avg_buy_price", 0.0))
    sell_qty = min(quantity, old_qty)

    realized_pnl = (price - avg_buy) * sell_qty
    remaining_qty = old_qty - sell_qty

    # Record realized P&L onto the portfolio
    await db.portfolios.update_one(
        _to_id_query(portfolio_id, user_id),
        {"$inc": {"realized_pnl": round(realized_pnl, 2)}}
    )

    if remaining_qty <= 0:
        await db.holdings.delete_one({"_id": existing["_id"]})
        return None, realized_pnl
    else:
        await db.holdings.update_one(
            {"_id": existing["_id"]},
            {"$set": {
                "quantity": remaining_qty,
                "current_price": price,
                "updated_at": now
            }}
        )
        existing["quantity"] = remaining_qty
        existing["current_price"] = price
        existing["_id"] = str(existing["_id"])
        return existing, realized_pnl
