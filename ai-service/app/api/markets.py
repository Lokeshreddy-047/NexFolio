from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, Query, HTTPException, status

from app.schemas.user import UserPrincipal
from app.dependencies.auth import get_optional_user
from app.schemas.market import (
    MarketOverviewResponse,
    MarketScreenerResponse,
    StockDetailResponse
)
from app.repositories.portfolio_repository import get_portfolios_by_user
from app.repositories.holding_repository import get_holdings_by_portfolio
from app.repositories.watchlist_repository import get_watchlists_by_user
from app.services.market_service import (
    get_market_overview,
    query_market_screener,
    get_stock_detail
)

router = APIRouter(prefix="/markets", tags=["Markets & Screener"])


async def _get_user_context(user_id: Optional[str]) -> tuple[Dict[str, float], List[str], Optional[dict], list]:
    """
    Helper to extract user holdings weights and active watchlist symbols.
    Returns empty structures safely when user_id is None (public visitor).
    """
    if not user_id:
        return {}, [], None, []

    portfolios = await get_portfolios_by_user(user_id)
    active_port = portfolios[0] if portfolios else None

    user_holdings = []
    holdings_weight_map: Dict[str, float] = {}
    if active_port:
        user_holdings = await get_holdings_by_portfolio(str(active_port["_id"]), user_id)
        total_val = sum(float(h.get("quantity", 0)) * float(h.get("current_price", 0)) for h in user_holdings)
        for h in user_holdings:
            sym = h.get("symbol", "").upper()
            val = float(h.get("quantity", 0)) * float(h.get("current_price", 0))
            wt = round((val / total_val * 100.0) if total_val > 0 else 0.0, 2)
            holdings_weight_map[sym] = wt
            if not sym.endswith(".NS"):
                holdings_weight_map[f"{sym}.NS"] = wt

    watchlists = await get_watchlists_by_user(user_id)
    watchlist_symbols = []
    for w in watchlists:
        watchlist_symbols.extend(w.get("symbols", []))

    return holdings_weight_map, list(set(watchlist_symbols)), active_port, user_holdings


@router.get("/overview", response_model=MarketOverviewResponse)
async def get_market_pulse_and_overview(
    current_user: Optional[UserPrincipal] = Depends(get_optional_user)
):
    """
    Returns authentic market benchmarks, market pulse mood, top gainers/losers,
    and sector performance breakdown. Accessible publicly and enriched for authenticated users.
    """
    uid = current_user.uid if current_user else None
    holdings_map, watchlist_syms, _, _ = await _get_user_context(uid)
    return await get_market_overview(
        user_holdings_symbols=holdings_map,
        user_watchlist_symbols=watchlist_syms
    )


@router.get("/stocks", response_model=MarketScreenerResponse)
async def get_market_screener_stocks(
    query: Optional[str] = Query(None, description="Search symbol or company name"),
    sector: Optional[str] = Query(None, description="Filter by sector name"),
    preset: str = Query("ALL", description="ALL, TOP_GAINERS, TOP_LOSERS, MOST_ACTIVE, NEAR_52W_HIGH, NEAR_52W_LOW, MY_HOLDINGS, MY_WATCHLIST"),
    sort_by: str = Query("day_change_pct", description="day_change_pct, current_price, volume, symbol, pct_from_52w_high"),
    sort_order: str = Query("desc", description="asc or desc"),
    limit: int = Query(50, ge=1, le=300),
    offset: int = Query(0, ge=0),
    current_user: Optional[UserPrincipal] = Depends(get_optional_user)
):
    """
    Screener endpoint across the 289+ NSE stock catalog with live filtering,
    presets, and portfolio awareness. Accessible publicly.
    """
    uid = current_user.uid if current_user else None
    holdings_map, watchlist_syms, _, _ = await _get_user_context(uid)
    return await query_market_screener(
        query=query,
        sector=sector,
        preset=preset,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
        user_holdings_symbols=holdings_map,
        user_watchlist_symbols=watchlist_syms
    )


@router.get("/stocks/{symbol}", response_model=StockDetailResponse)
async def get_stock_deep_detail(
    symbol: str,
    portfolio_id: Optional[str] = Query(None, description="Optional active portfolio context"),
    current_user: Optional[UserPrincipal] = Depends(get_optional_user)
):
    """
    Comprehensive stock detail page data with OHLCV price history, SMA overlays,
    52W range metrics, and active portfolio presence. Accessible publicly.
    """
    user_holdings = []
    all_watched = []

    if current_user:
        portfolios = await get_portfolios_by_user(current_user.uid)
        active_port = None
        if portfolio_id:
            active_port = next((p for p in portfolios if str(p["_id"]) == portfolio_id), None)
        if not active_port and portfolios:
            active_port = portfolios[0]

        if active_port:
            user_holdings = await get_holdings_by_portfolio(str(active_port["_id"]), current_user.uid)

        watchlists = await get_watchlists_by_user(current_user.uid)
        for w in watchlists:
            all_watched.extend(w.get("symbols", []))

    detail = await get_stock_detail(
        symbol=symbol,
        user_portfolio_holdings=user_holdings,
        is_in_watchlist=(symbol.upper() in [x.upper() for x in all_watched])
    )
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Stock symbol '{symbol}' not found in active catalog."
        )
    return detail
