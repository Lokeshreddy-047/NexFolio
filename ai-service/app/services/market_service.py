from typing import Dict, List, Optional
from app.schemas.market import (
    MarketOverviewResponse,
    MarketScreenerResponse,
    StockDetailResponse,
    MarketStockItem
)
from app.services.market_data import market_data_manager


async def get_market_overview(
    user_holdings_symbols: Optional[Dict[str, float]] = None,
    user_watchlist_symbols: Optional[List[str]] = None
) -> MarketOverviewResponse:
    """
    Returns market overview from the active MarketDataProvider with user portfolio overlays.
    """
    user_holdings_symbols = user_holdings_symbols or {}
    user_watchlist_symbols = user_watchlist_symbols or []

    overview = await market_data_manager.get_market_overview()

    def _enrich_item(item: MarketStockItem) -> MarketStockItem:
        item.is_in_portfolio = (item.symbol in user_holdings_symbols)
        item.portfolio_weight_pct = user_holdings_symbols.get(item.symbol)
        item.is_in_watchlist = (item.symbol in user_watchlist_symbols)
        return item

    overview.top_gainers = [_enrich_item(s) for s in overview.top_gainers]
    overview.top_losers = [_enrich_item(s) for s in overview.top_losers]
    overview.most_active = [_enrich_item(s) for s in overview.most_active]

    return overview


async def query_market_screener(
    query: Optional[str] = None,
    sector: Optional[str] = None,
    preset: str = "ALL",
    sort_by: str = "day_change_pct",
    sort_order: str = "desc",
    limit: int = 50,
    offset: int = 0,
    user_holdings_symbols: Optional[Dict[str, float]] = None,
    user_watchlist_symbols: Optional[List[str]] = None
) -> MarketScreenerResponse:
    """
    Executes multi-factor stock screening via the active MarketDataProvider.
    """
    user_holdings_symbols = user_holdings_symbols or {}
    user_watchlist_symbols = user_watchlist_symbols or []

    # If preset is MY_HOLDINGS or MY_WATCHLIST, we can filter in memory or pass through
    resp = await market_data_manager.get_stock_screener(
        query=query,
        sector=sector,
        preset=preset,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=289 if preset in ("MY_HOLDINGS", "MY_WATCHLIST") else limit,
        offset=0 if preset in ("MY_HOLDINGS", "MY_WATCHLIST") else offset
    )

    enriched_stocks: List[MarketStockItem] = []
    for s in resp.stocks:
        s.is_in_portfolio = (s.symbol in user_holdings_symbols)
        s.portfolio_weight_pct = user_holdings_symbols.get(s.symbol)
        s.is_in_watchlist = (s.symbol in user_watchlist_symbols)
        enriched_stocks.append(s)

    if preset == "MY_HOLDINGS":
        enriched_stocks = [s for s in enriched_stocks if s.is_in_portfolio]
    elif preset == "MY_WATCHLIST":
        enriched_stocks = [s for s in enriched_stocks if s.is_in_watchlist]

    total_count = len(enriched_stocks) if preset in ("MY_HOLDINGS", "MY_WATCHLIST") else resp.total_count
    final_stocks = enriched_stocks[offset : offset + limit] if preset in ("MY_HOLDINGS", "MY_WATCHLIST") else enriched_stocks

    resp.total_count = total_count
    resp.returned_count = len(final_stocks)
    resp.stocks = final_stocks

    return resp


async def get_stock_detail(
    symbol: str,
    user_portfolio_holdings: Optional[List[dict]] = None,
    is_in_watchlist: bool = False
) -> Optional[StockDetailResponse]:
    """
    Fetches stock quote, 52W range, historical trajectory and technical overlays.
    """
    return await market_data_manager.get_stock_detail(
        symbol=symbol,
        user_portfolio_holdings=user_portfolio_holdings,
        is_in_watchlist=is_in_watchlist
    )


async def get_batch_quotes(symbols: List[str]) -> Dict[str, Dict[str, float]]:
    """
    Fast-path quote lookup for portfolio valuation.
    """
    return await market_data_manager.get_batch_quotes(symbols)
