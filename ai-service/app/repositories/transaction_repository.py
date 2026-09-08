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

    realized_pnl_tx = 0.0
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
        _, realized_pnl_tx = await apply_sell_transaction(
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
        "realized_pnl": round(realized_pnl_tx, 2),
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
        tx = await db.transactions.find_one(_to_id_query(transaction_id, user_id))
        if not tx:
            return False

        portfolio_id = tx.get("portfolio_id")
        symbol = tx.get("symbol")
        tx_type = tx.get("transaction_type", "BUY").upper()
        qty = float(tx.get("quantity", 0.0))
        price = float(tx.get("price", 0.0))

        # Revert holding quantity and portfolio P&L
        if tx_type == "BUY":
            holding = await db.holdings.find_one({
                "portfolio_id": portfolio_id,
                "user_id": user_id,
                "symbol": symbol
            })
            if not holding:
                # No holding exists; deleting a BUY when no holding exists violates ledger integrity
                print(f"[transaction_repository] Cannot delete BUY: no holding exists for {symbol}")
                return False

            current_qty = float(holding.get("quantity", 0.0))
            if current_qty < (qty - 1e-6):
                # Cannot delete BUY: subsequent SELL transactions depended on these shares
                print(
                    f"[transaction_repository] Cannot delete BUY: remaining holding quantity "
                    f"({current_qty}) is less than transaction quantity ({qty})"
                )
                return False

            new_qty = round(current_qty - qty, 4)
            if new_qty <= 0:
                await db.holdings.delete_one({"_id": holding["_id"]})
            else:
                # Recalculate average buy price from remaining BUY transactions
                remaining_buys = await db.transactions.find({
                    "portfolio_id": portfolio_id,
                    "user_id": user_id,
                    "symbol": symbol,
                    "transaction_type": "BUY",
                    "_id": {"$ne": tx["_id"]}
                }).to_list(1000)
                if remaining_buys:
                    tot_q = sum(float(b.get("quantity", 0)) for b in remaining_buys)
                    tot_c = sum(float(b.get("quantity", 0)) * float(b.get("price", 0)) for b in remaining_buys)
                    recalculated_avg = (tot_c / tot_q) if tot_q > 0 else float(holding.get("avg_buy_price", 0.0))
                else:
                    recalculated_avg = float(holding.get("avg_buy_price", 0.0))
                await db.holdings.update_one(
                    {"_id": holding["_id"]},
                    {"$set": {
                        "quantity": new_qty,
                        "avg_buy_price": round(recalculated_avg, 2),
                        "updated_at": datetime.now(timezone.utc)
                    }}
                )
        elif tx_type in ("SELL", "BUYBACK"):
            holding = await db.holdings.find_one({
                "portfolio_id": portfolio_id,
                "user_id": user_id,
                "symbol": symbol
            })
            recorded_pnl = tx.get("realized_pnl")
            if holding:
                avg_buy = float(holding.get("avg_buy_price", 0.0))
                realized_pnl = float(recorded_pnl) if recorded_pnl is not None else (price - avg_buy) * qty
                new_qty = float(holding.get("quantity", 0.0)) + qty
                await db.holdings.update_one(
                    {"_id": holding["_id"]},
                    {"$set": {
                        "quantity": new_qty,
                        "updated_at": datetime.now(timezone.utc)
                    }}
                )
            else:
                # Holding was fully liquidated; restore position
                buys = await db.transactions.find({
                    "portfolio_id": portfolio_id,
                    "user_id": user_id,
                    "symbol": symbol,
                    "transaction_type": "BUY"
                }).to_list(100)
                if buys:
                    tot_q = sum(float(b.get("quantity", 0)) for b in buys)
                    tot_c = sum(float(b.get("quantity", 0)) * float(b.get("price", 0)) for b in buys)
                    avg_buy = (tot_c / tot_q) if tot_q > 0 else price
                else:
                    avg_buy = price
                realized_pnl = float(recorded_pnl) if recorded_pnl is not None else (price - avg_buy) * qty
                await db.holdings.insert_one({
                    "user_id": user_id,
                    "portfolio_id": portfolio_id,
                    "symbol": symbol,
                    "company_name": tx.get("company_name", symbol),
                    "asset_type": tx.get("asset_type", "Equity"),
                    "sector": tx.get("sector", "Other"),
                    "quantity": qty,
                    "avg_buy_price": round(avg_buy, 2),
                    "current_price": price,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                })

            # Revert realized P&L on portfolio
            port_query = _to_id_query(portfolio_id, user_id)
            await db.portfolios.update_one(
                port_query,
                {"$inc": {"realized_pnl": -round(realized_pnl, 2)}}
            )

        res = await db.transactions.delete_one({"_id": tx["_id"]})
        if res.deleted_count > 0:
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
                        "timestamp": datetime.now(timezone.utc)
                    }
                )
            except Exception as exc:
                print(f"[transaction_repository] Post-delete snapshot warning: {exc}")
            return True
        return False
    except Exception as exc:
        print(f"[transaction_repository] delete_transaction warning: {exc}")
        return False
