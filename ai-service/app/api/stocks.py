from typing import List
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.stock_service import search_stocks, get_stock_info

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
    Searches 292 NSE equities and assets with instant symbol/sector autocomplete.
    """
    results = search_stocks(query=q, limit=limit)
    return [StockInfoResponse(**item) for item in results]


@router.get("/{symbol}", response_model=StockInfoResponse)
async def get_stock_details(symbol: str):
    """
    Returns company metadata and sector classification for a specific symbol.
    """
    info = get_stock_info(symbol)
    return StockInfoResponse(**info)
