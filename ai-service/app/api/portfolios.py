from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas.user import UserPrincipal
from app.dependencies.auth import get_current_user
from app.schemas.portfolio import (
    PortfolioCreate,
    PortfolioUpdate,
    PortfolioSummary,
    PortfolioDetail,
    PortfolioAnalyticsResponse
)
from app.schemas.command_center import CommandCenterOverviewResponse
from app.schemas.snapshot import (
    PortfolioSnapshotResponse,
    TimelinePerformanceResponse,
    TimelinePoint
)
from app.repositories.portfolio_repository import (
    create_portfolio,
    get_portfolios_by_user,
    get_portfolio_by_id_and_user,
    update_portfolio,
    delete_portfolio
)
from app.repositories.holding_repository import get_holdings_by_portfolio
from app.repositories.transaction_repository import get_transactions_by_user
from app.repositories.snapshot_repository import (
    record_snapshot,
    get_snapshots_by_portfolio
)
from app.services.portfolio_analytics_service import (
    compute_holdings_metrics,
    compute_allocations,
    generate_portfolio_analytics
)
from app.services.command_center_service import build_command_center_overview
from app.services.benchmark_service import get_nifty_benchmark_points
from app.services.market_data.manager import market_data_manager

router = APIRouter(prefix="/portfolios", tags=["Portfolios"])


@router.post("", response_model=PortfolioSummary, status_code=status.HTTP_201_CREATED)
async def create_new_portfolio(
    payload: PortfolioCreate,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Creates a new investment portfolio bound to the authenticated user.
    """
    portfolio_doc = await create_portfolio(
        user_id=current_user.uid,
        data=payload.model_dump()
    )
    # Record initial baseline snapshot
    await record_snapshot(
        user_id=current_user.uid,
        portfolio_id=portfolio_doc["_id"],
        data={
            "total_value": 0.0,
            "invested_capital": 0.0,
            "day_pnl": 0.0,
            "total_pnl": 0.0,
            "total_roi_pct": 0.0,
            "timestamp": portfolio_doc.get("created_at")
        }
    )

    return PortfolioSummary(
        id=portfolio_doc["_id"],
        user_id=current_user.uid,
        name=portfolio_doc["name"],
        description=portfolio_doc.get("description"),
        currency=portfolio_doc.get("currency", "INR"),
        is_default=portfolio_doc.get("is_default", False),
        created_at=portfolio_doc.get("created_at"),
        updated_at=portfolio_doc.get("updated_at")
    )


@router.get("", response_model=List[PortfolioSummary])
async def list_user_portfolios(
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Lists all portfolios owned by the authenticated user with real-time summarized metrics.
    """
    portfolios = await get_portfolios_by_user(user_id=current_user.uid)
    summaries = []

    for p in portfolios:
        port_id = p["_id"]
        raw_holdings = await get_holdings_by_portfolio(portfolio_id=port_id, user_id=current_user.uid)
        symbols = [h.get("symbol", "") for h in raw_holdings if h.get("symbol")]
        live_quotes = await market_data_manager.get_batch_quotes(symbols) if symbols else {}
        _, invested, curr_val, pnl, pnl_pct = compute_holdings_metrics(raw_holdings, quotes=live_quotes)

        summaries.append(PortfolioSummary(
            id=port_id,
            user_id=current_user.uid,
            name=p["name"],
            description=p.get("description"),
            currency=p.get("currency", "INR"),
            is_default=p.get("is_default", False),
            total_invested=invested,
            current_value=curr_val,
            unrealized_pnl=pnl,
            unrealized_pnl_pct=pnl_pct,
            realized_pnl=p.get("realized_pnl", 0.0),
            holdings_count=len(raw_holdings),
            created_at=p.get("created_at"),
            updated_at=p.get("updated_at")
        ))

    return summaries


@router.get("/{portfolio_id}/command-center", response_model=CommandCenterOverviewResponse)
async def get_portfolio_command_center(
    portfolio_id: str,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Consolidated Command Center overview returning pulse, movers, concentration, health, allocation, and activity.
    """
    portfolio_doc = await get_portfolio_by_id_and_user(portfolio_id=portfolio_id, user_id=current_user.uid)
    if not portfolio_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found or access denied."
        )

    raw_holdings = await get_holdings_by_portfolio(portfolio_id=portfolio_id, user_id=current_user.uid)
    recent_transactions = await get_transactions_by_user(user_id=current_user.uid, portfolio_id=portfolio_id, limit=5)

    symbols = [h.get("symbol", "") for h in raw_holdings if h.get("symbol")]
    live_quotes = await market_data_manager.get_batch_quotes(symbols) if symbols else {}

    current_badge = getattr(market_data_manager.active_provider, "default_data_badge", None)
    badge_str = current_badge.value if current_badge else "LIVE"

    return build_command_center_overview(
        user_id=current_user.uid,
        portfolio_doc=portfolio_doc,
        raw_holdings=raw_holdings,
        recent_transactions=recent_transactions,
        quotes=live_quotes,
        data_badge=badge_str
    )


@router.get("/{portfolio_id}/performance", response_model=TimelinePerformanceResponse)
async def get_portfolio_performance_timeline(
    portfolio_id: str,
    range: str = Query("ALL", pattern="^(1W|1M|3M|1Y|ALL)$"),
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Returns authentic valuation snapshots and NIFTY 50 benchmark comparison points.
    """
    portfolio_doc = await get_portfolio_by_id_and_user(portfolio_id=portfolio_id, user_id=current_user.uid)
    if not portfolio_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found or access denied."
        )

    raw_snapshots = await get_snapshots_by_portfolio(user_id=current_user.uid, portfolio_id=portfolio_id)

    # If insufficient history (< 2 snapshots), return honest empty state
    if len(raw_snapshots) < 2:
        return TimelinePerformanceResponse(
            portfolio_id=portfolio_id,
            time_range=range,
            has_sufficient_history=False,
            data_badge="REFERENCE",
            benchmark_status="UNAVAILABLE",
            data_points=[]
        )

    # Filter snapshots based on requested time range
    now = datetime.now(timezone.utc)
    cutoff_map = {
        "1W": now - timedelta(days=7),
        "1M": now - timedelta(days=30),
        "3M": now - timedelta(days=90),
        "1Y": now - timedelta(days=365),
        "ALL": None
    }
    cutoff = cutoff_map.get(range)

    filtered = []
    for s in raw_snapshots:
        ts = s.get("timestamp")
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        if cutoff is None or (ts and ts >= cutoff):
            filtered.append(s)

    if len(filtered) < 2:
        filtered = raw_snapshots  # Fallback to available snapshots if window is narrow

    # Determine date range for benchmark lookup
    start_ts = filtered[0].get("timestamp")
    if isinstance(start_ts, str):
        start_ts = datetime.fromisoformat(start_ts.replace("Z", "+00:00"))
    end_ts = filtered[-1].get("timestamp")
    if isinstance(end_ts, str):
        end_ts = datetime.fromisoformat(end_ts.replace("Z", "+00:00"))

    benchmark_points, benchmark_status = get_nifty_benchmark_points(start_ts or now, end_ts or now)
    bench_map = {b["date"]: b["nifty_return_pct"] for b in benchmark_points}

    points = []
    for s in filtered:
        ts = s.get("timestamp")
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        d_str = ts.strftime("%Y-%m-%d") if ts else "N/A"

        points.append(TimelinePoint(
            date=d_str,
            portfolio_value=float(s.get("total_value", 0.0)),
            invested_capital=float(s.get("invested_capital", 0.0)),
            portfolio_pnl=float(s.get("total_pnl", 0.0)),
            portfolio_return_pct=float(s.get("total_roi_pct", 0.0)),
            nifty_return_pct=bench_map.get(d_str)
        ))

    return TimelinePerformanceResponse(
        portfolio_id=portfolio_id,
        time_range=range,
        has_sufficient_history=True,
        data_badge="REFERENCE",
        benchmark_status=benchmark_status,
        data_points=points
    )


@router.post("/{portfolio_id}/snapshots", response_model=PortfolioSnapshotResponse, status_code=status.HTTP_201_CREATED)
async def take_portfolio_snapshot(
    portfolio_id: str,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Creates an explicit valuation snapshot checkpoint for the portfolio.
    """
    portfolio_doc = await get_portfolio_by_id_and_user(portfolio_id=portfolio_id, user_id=current_user.uid)
    if not portfolio_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found or access denied."
        )

    raw_holdings = await get_holdings_by_portfolio(portfolio_id=portfolio_id, user_id=current_user.uid)
    _, invested, curr_val, pnl, pnl_pct = compute_holdings_metrics(raw_holdings)

    now = datetime.now(timezone.utc)
    snap = await record_snapshot(
        user_id=current_user.uid,
        portfolio_id=portfolio_id,
        data={
            "total_value": curr_val,
            "invested_capital": invested,
            "total_pnl": pnl,
            "total_roi_pct": pnl_pct,
            "timestamp": now
        },
        force_new=True
    )

    return PortfolioSnapshotResponse(
        id=snap["_id"],
        portfolio_id=portfolio_id,
        user_id=current_user.uid,
        total_value=snap["total_value"],
        invested_capital=snap["invested_capital"],
        day_pnl=snap.get("day_pnl", 0.0),
        total_pnl=snap["total_pnl"],
        total_roi_pct=snap["total_roi_pct"],
        timestamp=snap["timestamp"]
    )


@router.get("/{portfolio_id}", response_model=PortfolioDetail)
async def get_portfolio_details(
    portfolio_id: str,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Returns detailed portfolio information including holdings, asset allocation, and sector allocation.
    """
    portfolio_doc = await get_portfolio_by_id_and_user(portfolio_id=portfolio_id, user_id=current_user.uid)
    if not portfolio_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found or access denied."
        )

    raw_holdings = await get_holdings_by_portfolio(portfolio_id=portfolio_id, user_id=current_user.uid)
    symbols = [h.get("symbol", "") for h in raw_holdings if h.get("symbol")]
    live_quotes = await market_data_manager.get_batch_quotes(symbols) if symbols else {}
    holdings, invested, curr_val, pnl, pnl_pct = compute_holdings_metrics(raw_holdings, quotes=live_quotes)
    asset_alloc, sector_alloc = compute_allocations(holdings, curr_val)

    return PortfolioDetail(
        id=portfolio_doc["_id"],
        user_id=current_user.uid,
        name=portfolio_doc["name"],
        description=portfolio_doc.get("description"),
        currency=portfolio_doc.get("currency", "INR"),
        is_default=portfolio_doc.get("is_default", False),
        total_invested=invested,
        current_value=curr_val,
        unrealized_pnl=pnl,
        unrealized_pnl_pct=pnl_pct,
        realized_pnl=portfolio_doc.get("realized_pnl", 0.0),
        holdings_count=len(holdings),
        holdings=holdings,
        asset_allocation=asset_alloc,
        sector_allocation=sector_alloc,
        created_at=portfolio_doc.get("created_at"),
        updated_at=portfolio_doc.get("updated_at")
    )


@router.put("/{portfolio_id}", response_model=PortfolioSummary)
async def update_existing_portfolio(
    portfolio_id: str,
    payload: PortfolioUpdate,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Updates portfolio metadata (name, description, default status).
    """
    updated = await update_portfolio(
        portfolio_id=portfolio_id,
        user_id=current_user.uid,
        update_data=payload.model_dump()
    )
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found or access denied."
        )

    raw_holdings = await get_holdings_by_portfolio(portfolio_id=portfolio_id, user_id=current_user.uid)
    _, invested, curr_val, pnl, pnl_pct = compute_holdings_metrics(raw_holdings)

    return PortfolioSummary(
        id=updated["_id"],
        user_id=current_user.uid,
        name=updated["name"],
        description=updated.get("description"),
        currency=updated.get("currency", "INR"),
        is_default=updated.get("is_default", False),
        total_invested=invested,
        current_value=curr_val,
        unrealized_pnl=pnl,
        unrealized_pnl_pct=pnl_pct,
        realized_pnl=updated.get("realized_pnl", 0.0),
        holdings_count=len(raw_holdings),
        created_at=updated.get("created_at"),
        updated_at=updated.get("updated_at")
    )


@router.delete("/{portfolio_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_portfolio(
    portfolio_id: str,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Deletes a portfolio and all its child holdings and transactions.
    """
    success = await delete_portfolio(portfolio_id=portfolio_id, user_id=current_user.uid)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found or access denied."
        )
    return None


@router.get("/{portfolio_id}/analytics", response_model=PortfolioAnalyticsResponse)
async def get_realtime_portfolio_analytics(
    portfolio_id: str,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Generates real-time AI risk predictions, SHAP driver explanations, and recommendations directly from user holdings.
    """
    portfolio_doc = await get_portfolio_by_id_and_user(portfolio_id=portfolio_id, user_id=current_user.uid)
    if not portfolio_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found or access denied."
        )

    raw_holdings = await get_holdings_by_portfolio(portfolio_id=portfolio_id, user_id=current_user.uid)
    return generate_portfolio_analytics(portfolio_doc, raw_holdings)
