from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from bson.errors import InvalidId

from app.db.mongodb import get_database
from app.services.stock_service import get_stock_info
from app.repositories.holding_repository import (
    apply_buy_transaction,
    apply_sell_transaction,
    get_holdings_by_portfolio
)
from app.services.portfolio_analytics_service import compute_holdings_metrics
from app.repositories.snapshot_repository import record_snapshot


def _to_id_query(tx_id: str, user_id: str) -> dict:
    try:
        return {"_id": ObjectId(tx_id), "user_id": user_id}
    except InvalidId:
        return {"_id": tx_id, "user_id": user_id}


async def record_transaction(user_id: str, data: dict) -> dict:
    now = datetime.now(timezone.utc)
    portfolio_id = data.get("portfolio_id")
    symbol = data.get("symbol", "").upper().strip()
    tx_type = data.get("transaction_type", "BUY").upper()
    qty = float(data.get("quantity", 0.0))
    price = float(data.get("price", 0.0))
    total_amount = round(qty * price, 2)

    stock_meta = get_stock_info(symbol)
    resolved_symbol = stock_meta["symbol"]
    company_name = data.get("company_name") or stock_meta["company_name"]
    sector = data.get("sector") or stock_meta["sector"]
    asset_type = data.get("asset_type") or stock_meta["asset_type"]

    tx_date = data.get("transaction_date") or now

    # 1. Update holdings balance
    if tx_type == "BUY":
        await apply_buy_transaction(
            user_id=user_id,
            portfolio_id=portfolio_id,
            symbol=resolved_symbol,
            quantity=qty,
            price=price,
            asset_type=asset_type,
            sector=sector,
            company_name=company_name
        )
    elif tx_type in ("SELL", "BUYBACK"):
        await apply_sell_transaction(
            user_id=user_id,
            portfolio_id=portfolio_id,
            symbol=resolved_symbol,
            quantity=qty,
            price=price
        )

    # 2. Insert transaction ledger entry
    document = {
        "portfolio_id": portfolio_id,
        "user_id": user_id,
        "symbol": resolved_symbol,
        "company_name": company_name,
        "transaction_type": tx_type,
        "quantity": qty,
        "price": price,
        "total_amount": total_amount,
        "asset_type": asset_type,
        "sector": sector,
        "transaction_date": tx_date,
        "notes": data.get("notes", ""),
        "promoter_category": data.get("promoter_category", "NON_PROMOTER"),
        "stt_paid": float(data.get("stt_paid", 0.0)),
        "created_at": now,
    }

    db = get_database()
    result = await db.transactions.insert_one(document)
    document["_id"] = str(result.inserted_id)

    # 3. Post-commit valuation snapshot (ensures snapshot consistency)
    try:
        raw_holdings = await get_holdings_by_portfolio(portfolio_id, user_id)
        _, invested, curr_val, pnl, pnl_pct = compute_holdings_metrics(raw_holdings)
        await record_snapshot(
            user_id=user_id,
            portfolio_id=portfolio_id,
            data={
                "total_value": curr_val,
                "invested_capital": invested,
                "total_pnl": pnl,
                "total_roi_pct": pnl_pct,
                "timestamp": tx_date
            }
        )
    except Exception as exc:
        print(f"[transaction_repository] Post-transaction snapshot warning: {exc}")

    return document


async def get_transactions_by_user(
    user_id: str,
    portfolio_id: Optional[str] = None,
    symbol: Optional[str] = None,
    transaction_type: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
) -> List[dict]:
    try:
        db = get_database()
        query = {"user_id": user_id}
        if portfolio_id:
            query["portfolio_id"] = portfolio_id
        if symbol:
            query["symbol"] = {"$regex": symbol.strip().upper(), "$options": "i"}
        if transaction_type:
            query["transaction_type"] = transaction_type.strip().upper()

        cursor = db.transactions.find(query).sort("transaction_date", -1).skip(skip).limit(limit)
        txs = await cursor.to_list(length=limit)
        for t in txs:
            t["_id"] = str(t["_id"])
        return txs
    except Exception as exc:
        print(f"[transaction_repository] get_transactions_by_user warning: {exc}")
        return []


async def delete_transaction(transaction_id: str, user_id: str) -> bool:
    try:
        db = get_database()
        res = await db.transactions.delete_one(_to_id_query(transaction_id, user_id))
        return res.deleted_count > 0
    except Exception as exc:
        print(f"[transaction_repository] delete_transaction warning: {exc}")
        return False
