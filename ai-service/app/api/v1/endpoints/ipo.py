from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from app.schemas.ipo import (
    IPOItem,
    IPOStatus,
    IPOMarketType,
    IPORiskVerdict,
    ListedIPOPosPerformance,
    IPOOverviewMetrics
)
from app.services.ipo_service import ipo_service

router = APIRouter()


@router.get("", response_model=List[IPOItem], summary="Get list of tracked IPOs")
async def get_ipos(
    status: Optional[IPOStatus] = Query(None, description="Filter by IPO status (UPCOMING, OPEN, CLOSED, LISTED)"),
    market_type: Optional[IPOMarketType] = Query(None, description="Filter by market type (MAINBOARD, SME)"),
    verdict: Optional[IPORiskVerdict] = Query(None, description="Filter by AI Risk Verdict")
):
    """Returns all tracked Indian IPOs with live subscription, GMP, and AI risk analysis."""
    return await ipo_service.get_all_ipos(status=status, market_type=market_type, verdict=verdict)


@router.get("/metrics/overview", response_model=IPOOverviewMetrics, summary="Get IPO overview statistics")
async def get_ipo_overview_metrics():
    """Returns top-level KPIs including active issues, total capital raised, and average listing gains."""
    return await ipo_service.get_overview_metrics()


@router.get("/performance/listed", response_model=List[ListedIPOPosPerformance], summary="Get post-listing performance")
async def get_listed_ipos_performance():
    """Returns issue price vs current market price returns for recently listed IPOs."""
    return await ipo_service.get_listed_performance()


@router.get("/{ipo_id}", response_model=IPOItem, summary="Get detailed IPO breakdown")
async def get_ipo_detail(ipo_id: str):
    """Returns deep-dive fundamentals, peer comparisons, and full AI explainability for a specific IPO."""
    item = await ipo_service.get_ipo_by_id(ipo_id)
    if not item:
        raise HTTPException(status_code=404, detail=f"IPO with ID '{ipo_id}' not found.")
    return item
