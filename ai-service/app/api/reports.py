from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status

from app.schemas.user import UserPrincipal
from app.dependencies.auth import get_current_user
from app.schemas.reports import (
    InvestorReportResponse,
    ReportListItem,
    AuditLogListResponse,
    AuditLogItem
)
from app.services.report_service import (
    generate_portfolio_investor_report,
    list_portfolio_reports,
    get_saved_report_by_id
)
from app.repositories.audit_repository import get_audit_logs_by_user

router = APIRouter(tags=["Investor Reports & Audit"])


@router.get("/portfolios/{portfolio_id}/report", response_model=InvestorReportResponse)
async def generate_investor_report(
    portfolio_id: str,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Generates and persists an immutable institutional Investor Intelligence Report
    snapshot for the specified portfolio.
    """
    try:
        return await generate_portfolio_investor_report(
            user_id=current_user.uid,
            portfolio_id=portfolio_id
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc)
        )


@router.get("/portfolios/{portfolio_id}/reports", response_model=List[ReportListItem])
async def list_portfolio_historical_reports(
    portfolio_id: str,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Lists historical report snapshot versions generated for this portfolio.
    """
    return await list_portfolio_reports(
        user_id=current_user.uid,
        portfolio_id=portfolio_id
    )


@router.get("/reports/{report_id}", response_model=InvestorReportResponse)
async def get_report_snapshot(
    report_id: str,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Retrieves an exact immutable report snapshot by ID.
    """
    try:
        return await get_saved_report_by_id(
            user_id=current_user.uid,
            report_id=report_id
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc)
        )


@router.get("/audit-logs", response_model=AuditLogListResponse)
async def get_user_audit_logs(
    portfolio_id: Optional[str] = Query(None, description="Filter by portfolio ID"),
    limit: int = Query(50, ge=1, le=200),
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Returns rich, immutable audit events for the authenticated user.
    """
    raw_logs = await get_audit_logs_by_user(
        user_id=current_user.uid,
        portfolio_id=portfolio_id,
        limit=limit
    )
    items = [
        AuditLogItem(
            id=l["_id"],
            user_id=l["user_id"],
            portfolio_id=l.get("portfolio_id"),
            event_type=l["event_type"],
            timestamp=l["timestamp"],
            actor=l.get("actor", "USER"),
            source=l.get("source", "WEB_DASHBOARD"),
            model_version=l.get("model_version"),
            description=l["description"],
            input_snapshot=l.get("input_snapshot", {}),
            result_summary=l.get("result_summary", {})
        )
        for l in raw_logs
    ]
    return AuditLogListResponse(
        total_count=len(items),
        events=items
    )
