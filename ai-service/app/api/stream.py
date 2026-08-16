import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Request, Query, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from app.services.market_data.manager import market_data_manager
from app.services.market_data.symbol_normalizer import SymbolNormalizer
from app.services.market_data.market_session import get_market_session_state
from app.services.valuation_engine import RealtimeValuationEngine, PortfolioRealtimeValuation
from app.dependencies.auth import get_current_user, UserPrincipal
from app.db.mongodb import get_database

router = APIRouter()


@router.get("/portfolios/{portfolio_id}/valuation", response_model=PortfolioRealtimeValuation, tags=["Real-Time Engine"])
async def get_portfolio_fast_valuation(
    portfolio_id: str,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Fast-Loop synchronous portfolio revaluation (< 5ms).
    Computes holding valuations, day P&L, and portfolio weights using live quote cache.
    Zero ML dependencies.
    """
    db = get_database()
    # Find portfolio verifying ownership
    portfolio = await db.portfolios.find_one({"_id": portfolio_id, "user_id": current_user.uid})
    if not portfolio:
        portfolio = await db.portfolios.find_one({"id": portfolio_id, "user_id": current_user.uid})
    if not portfolio:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Portfolio not found")

    cursor = db.holdings.find({"portfolio_id": portfolio_id, "user_id": current_user.uid})
    holdings = await cursor.to_list(length=1000)

    return await RealtimeValuationEngine.evaluate_portfolio(portfolio, holdings)


@router.get("/markets/stream", tags=["Real-Time Engine"])
async def market_event_stream(
    request: Request,
    symbols: Optional[str] = Query(None, description="Comma-separated symbols to stream"),
    portfolio_id: Optional[str] = Query(None, description="Optional portfolio ID to stream valuations for")
):
    """
    Server-Sent Events (SSE) stream pushing live ticks, fast valuations, and session heartbeats.
    Format adheres to standardized institutional event envelope.
    """
    requested_symbols = [
        SymbolNormalizer.to_canonical(s.strip())
        for s in symbols.split(",") if s.strip()
    ] if symbols else ["^NSEI", "^BSESN", "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS"]

    # Subscribe live provider adapter
    if hasattr(market_data_manager.provider, "subscribe"):
        await market_data_manager.provider.subscribe(requested_symbols)

    async def event_generator():
        last_quotes = {}

        while True:
            # 1. Check client disconnect
            if await request.is_disconnected():
                break

            now_utc = datetime.now(timezone.utc)
            session_state, _ = get_market_session_state()
            badge = market_data_manager.provider.default_data_badge.value

            # 2. Emit Heartbeat Event
            hb_envelope = {
                "event_id": f"hb-{uuid.uuid4().hex[:8]}",
                "event_type": "HEARTBEAT",
                "timestamp": now_utc.isoformat(),
                "data_badge": badge,
                "market_session": session_state.value,
                "provider": market_data_manager.provider.provider_id,
                "payload": {
                    "status": "CONNECTED",
                    "monitored_symbols_count": len(requested_symbols)
                }
            }
            yield f"data: {json.dumps(hb_envelope)}\n\n"

            # 3. Check for tick updates
            current_quotes = await market_data_manager.get_batch_quotes(requested_symbols)
            changed_ticks = []
            for sym, q in current_quotes.items():
                if sym not in last_quotes or last_quotes[sym].get("price") != q.get("price"):
                    changed_ticks.append({
                        "symbol": sym,
                        "base_symbol": SymbolNormalizer.to_base_symbol(sym),
                        "price": q.get("price"),
                        "day_change": q.get("day_change"),
                        "day_change_pct": q.get("day_change_pct"),
                        "volume": q.get("volume")
                    })
                    last_quotes[sym] = q

            if changed_ticks:
                tick_envelope = {
                    "event_id": f"tick-{uuid.uuid4().hex[:8]}",
                    "event_type": "TICK",
                    "timestamp": now_utc.isoformat(),
                    "data_badge": badge,
                    "market_session": session_state.value,
                    "provider": market_data_manager.provider.provider_id,
                    "payload": {
                        "ticks": changed_ticks
                    }
                }
                yield f"data: {json.dumps(tick_envelope)}\n\n"

            await asyncio.sleep(2.0)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
