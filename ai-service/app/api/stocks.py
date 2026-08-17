from typing import List
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.stock_service import search_stocks, get_stock_info
from app.services.market_data import market_data_manager
from app.services.market_data.symbol_normalizer import SymbolNormalizer

router = APIRouter(prefix="/stocks", tags=["Stock Directory & Search"])


class StockInfoResponse(BaseModel):
    symbol: str
    base_symbol: str
    company_name: str
    sector: str
    asset_type: str
    reference_price: float


@router.get("/search", response_model=List[StockInfoResponse])
async def search_stock_symbols(
    q: str = Query("", description="Symbol, company name, or sector search term"),
    limit: int = Query(15, ge=1, le=50)
):
    """
    Searches 292 NSE equities and assets with instant symbol/sector autocomplete
    and live market price enrichment.
    """
    results = search_stocks(query=q, limit=limit)
    symbols = [r["symbol"] for r in results]
    try:
        live_quotes = await market_data_manager.get_batch_quotes(symbols)
        for item in results:
            can_sym = SymbolNormalizer.to_canonical(item["symbol"])
            if can_sym in live_quotes and live_quotes[can_sym].get("price", 0) > 0:
                item["reference_price"] = round(float(live_quotes[can_sym]["price"]), 2)
    except Exception:
        pass

    return [StockInfoResponse(**item) for item in results]


@router.get("/{symbol}", response_model=StockInfoResponse)
async def get_stock_details(symbol: str):
    """
    Returns company metadata and sector classification for a specific symbol
    with live market price overlay.
    """
    info = get_stock_info(symbol)
    try:
        can_sym = SymbolNormalizer.to_canonical(symbol)
        live_quotes = await market_data_manager.get_batch_quotes([can_sym])
        if can_sym in live_quotes and live_quotes[can_sym].get("price", 0) > 0:
            info["reference_price"] = round(float(live_quotes[can_sym]["price"]), 2)
    except Exception:
        pass

    return StockInfoResponse(**info)
