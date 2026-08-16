from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.user import UserPrincipal
from app.dependencies.auth import get_current_user
from app.schemas.market import (
    WatchlistResponse,
    WatchlistCreateRequest,
    WatchlistToggleStockRequest,
    MarketStockItem
)
from app.repositories.portfolio_repository import get_portfolios_by_user
from app.repositories.holding_repository import get_holdings_by_portfolio
from app.repositories.watchlist_repository import (
    get_watchlists_by_user,
    get_watchlist_by_id_and_user,
    create_watchlist,
    toggle_symbol_in_watchlist,
    delete_watchlist
)
from app.services.market_service import query_market_screener

router = APIRouter(prefix="/watchlists", tags=["Watchlists"])


async def _hydrate_watchlist_response(
    doc: dict,
    user_holdings_map: dict
) -> WatchlistResponse:
    symbols: List[str] = doc.get("symbols", [])
    screener_res = await query_market_screener(
        limit=200,
        user_holdings_symbols=user_holdings_map,
        user_watchlist_symbols=symbols
    )

    watched_stocks = [s for s in screener_res.stocks if s.symbol in symbols or s.base_symbol in symbols]
    total_val = sum(s.current_price for s in watched_stocks)
    avg_chg = (sum(s.day_change_pct for s in watched_stocks) / len(watched_stocks)) if watched_stocks else 0.0

    return WatchlistResponse(
        id=str(doc["_id"]),
        user_id=doc["user_id"],
        name=doc["name"],
        symbols=symbols,
        stocks=watched_stocks,
        total_valuation_reference=round(total_val, 2),
        avg_day_change_pct=round(avg_chg, 2),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"]
    )


@router.get("", response_model=List[WatchlistResponse])
async def list_user_watchlists(
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Returns all watchlists for current user with live stock metrics.
    """
    portfolios = await get_portfolios_by_user(current_user.uid)
    holdings_map = {}
    if portfolios:
        user_holdings = await get_holdings_by_portfolio(str(portfolios[0]["_id"]), current_user.uid)
        for h in user_holdings:
            holdings_map[h.get("symbol", "").upper()] = 1.0

    docs = await get_watchlists_by_user(current_user.uid)
    return [await _hydrate_watchlist_response(d, holdings_map) for d in docs]


@router.post("", response_model=WatchlistResponse, status_code=status.HTTP_201_CREATED)
async def create_user_watchlist(
    payload: WatchlistCreateRequest,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Creates a new custom user watchlist.
    """
    doc = await create_watchlist(current_user.uid, payload.name)
    return await _hydrate_watchlist_response(doc, {})


@router.post("/{watchlist_id}/toggle", response_model=WatchlistResponse)
async def toggle_stock_in_watchlist(
    watchlist_id: str,
    payload: WatchlistToggleStockRequest,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Toggles a stock symbol in the specified watchlist (adds if absent, removes if present).
    """
    try:
        updated_doc = await toggle_symbol_in_watchlist(
            user_id=current_user.uid,
            watchlist_id=watchlist_id,
            symbol=payload.symbol
        )
        return await _hydrate_watchlist_response(updated_doc, {})
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc)
        )


@router.delete("/{watchlist_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_watchlist(
    watchlist_id: str,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Deletes a user watchlist.
    """
    deleted = await delete_watchlist(current_user.uid, watchlist_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist not found or access denied."
        )
    return None
