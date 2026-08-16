import hashlib
import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from app.schemas.reports import (
    InvestorReportResponse,
    PortfolioReportSummary,
    ReportBenchmarkComparison,
    ReportAssetAllocation,
    ReportSectorAllocation,
    ReportHoldingItem,
    ReportListItem
)
from app.repositories.portfolio_repository import get_portfolio_by_id_and_user
from app.repositories.holding_repository import get_holdings_by_portfolio
from app.repositories.report_repository import save_report_snapshot, get_reports_by_portfolio, get_report_by_id_and_user
from app.repositories.audit_repository import log_audit_event
from app.repositories.notification_repository import check_and_generate_portfolio_alerts
from app.services.intelligence_service import generate_portfolio_intelligence


async def generate_portfolio_investor_report(
    user_id: str,
    portfolio_id: str
) -> InvestorReportResponse:
    portfolio = await get_portfolio_by_id_and_user(portfolio_id, user_id)
    if not portfolio:
        raise ValueError("Portfolio not found or access denied.")

    holdings = await get_holdings_by_portfolio(portfolio_id, user_id)
    intel = await generate_portfolio_intelligence(user_id, portfolio, holdings)

    # 1. Financial Aggregations
    total_val = sum(float(h.get("quantity", 0)) * float(h.get("current_price", 0)) for h in holdings)
    invested_cap = sum(float(h.get("quantity", 0)) * float(h.get("avg_buy_price", 0)) for h in holdings)
    cash_bal = float(portfolio.get("cash_balance", 0.0))
    realized_g = sum(float(h.get("realized_gain", 0.0)) for h in holdings)

    total_unrealized = total_val - invested_cap
    total_roi = (total_unrealized / invested_cap * 100.0) if invested_cap > 0 else 0.0

    # Sector & Asset Map
    sec_map: Dict[str, float] = {}
    asset_map: Dict[str, float] = {}
    holdings_items: List[ReportHoldingItem] = []

    for h in holdings:
        qty = float(h.get("quantity", 0))
        price = float(h.get("current_price", 0))
        avg_b = float(h.get("avg_buy_price", 0))
        val = qty * price
        inv = qty * avg_b
        pnl = val - inv
        roi = (pnl / inv * 100.0) if inv > 0 else 0.0
        wt = (val / total_val * 100.0) if total_val > 0 else 0.0

        sec = h.get("sector", "Other")
        sec_map[sec] = sec_map.get(sec, 0.0) + val

        asset_t = h.get("asset_type", "Equity")
        asset_map[asset_t] = asset_map.get(asset_t, 0.0) + val

        sym = h.get("symbol", "")
        base_sym = sym.replace(".NS", "")
        holdings_items.append(ReportHoldingItem(
            symbol=sym,
            base_symbol=base_sym,
            company_name=h.get("company_name", f"{base_sym} Ltd"),
            sector=sec,
            quantity=qty,
            avg_buy_price=round(avg_b, 2),
            current_price=round(price, 2),
            valuation=round(val, 2),
            weight_pct=round(wt, 2),
            unrealized_pnl=round(pnl, 2),
            unrealized_roi_pct=round(roi, 2)
        ))

    # Sort holdings by valuation desc
    holdings_items.sort(key=lambda x: x.valuation, reverse=True)
    top_h_sym = holdings_items[0].base_symbol if holdings_items else "None"
    top_h_wt = holdings_items[0].weight_pct if holdings_items else 0.0

    # Asset Allocations List
    asset_alloc: List[ReportAssetAllocation] = [
        ReportAssetAllocation(
            asset_type=k,
            valuation=round(v, 2),
            weight_pct=round((v / total_val * 100.0) if total_val > 0 else 0.0, 2)
        )
        for k, v in asset_map.items()
    ]
    asset_alloc.sort(key=lambda x: x.weight_pct, reverse=True)

    # Sector Allocations List
    sector_alloc: List[ReportSectorAllocation] = [
        ReportSectorAllocation(
            sector=k,
            valuation=round(v, 2),
            weight_pct=round((v / total_val * 100.0) if total_val > 0 else 0.0, 2)
        )
        for k, v in sec_map.items()
    ]
    sector_alloc.sort(key=lambda x: x.weight_pct, reverse=True)

    # Benchmark Comparison (NIFTY 50 reference)
    benchmark_roi = 12.4
    alpha = round(total_roi - benchmark_roi, 2)
    benchmark_comp = ReportBenchmarkComparison(
        benchmark_name="NIFTY 50 Benchmark",
        data_badge="REFERENCE",
        portfolio_roi_pct=round(total_roi, 2),
        benchmark_roi_pct=benchmark_roi,
        alpha_pct=alpha,
        portfolio_beta=intel.quantitative_metrics.portfolio_beta,
        annualized_volatility=intel.quantitative_metrics.annualized_volatility
    )

    summary = PortfolioReportSummary(
        portfolio_id=portfolio_id,
        portfolio_name=portfolio.get("name", "Portfolio"),
        currency=portfolio.get("currency", "INR"),
        total_valuation=round(total_val, 2),
        invested_capital=round(invested_cap, 2),
        total_unrealized_pnl=round(total_unrealized, 2),
        total_roi_pct=round(total_roi, 2),
        realized_gains=round(realized_g, 2),
        cash_balance=round(cash_bal, 2),
        asset_count=len(holdings),
        top_holding_symbol=top_h_sym,
        top_holding_weight_pct=top_h_wt
    )

    now = datetime.now(timezone.utc)
    version_str = f"v{now.strftime('%Y.%m.%d-%H%M%S')}"

    # Generate Deterministic SHA-256 Report Integrity Hash
    hash_payload = f"{user_id}:{portfolio_id}:{total_val}:{invested_cap}:{intel.health_scorecard.overall_score}:{now.isoformat()}"
    integrity_hash = f"NXF-{hashlib.sha256(hash_payload.encode()).hexdigest()[:16].upper()}"

    report_dict = {
        "report_integrity_hash": integrity_hash,
        "report_version": version_str,
        "portfolio_id": portfolio_id,
        "portfolio_name": portfolio.get("name", "Portfolio"),
        "user_id": user_id,
        "generated_at": now,
        "data_pedigree": "REFERENCE",
        "provenance": intel.provenance.model_dump(),
        "summary": summary.model_dump(),
        "benchmark": benchmark_comp.model_dump(),
        "risk_category": intel.risk_category,
        "risk_confidence": intel.confidence,
        "health_scorecard": intel.health_scorecard.model_dump(),
        "asset_allocation": [a.model_dump() for a in asset_alloc],
        "sector_allocation": [s.model_dump() for s in sector_alloc],
        "holdings": [h.model_dump() for h in holdings_items],
        "risk_mitigators": [m.model_dump() for m in intel.risk_mitigators],
        "risk_amplifiers": [a.model_dump() for a in intel.risk_amplifiers],
        "recommendations": [r.model_dump() for r in intel.recommendations],
        "disclaimer": (
            "NexFolio Intelligence reports are generated using explainable machine learning models for analytical "
            "and informational purposes only. Past model predictions do not guarantee future performance. "
            "Consult a certified financial advisor before executing investment decisions."
        )
    }

    # Save immutable report snapshot
    saved_doc = await save_report_snapshot(report_dict)

    # Log Rich Audit Event
    await log_audit_event(
        user_id=user_id,
        portfolio_id=portfolio_id,
        event_type="REPORT_GENERATION",
        description=f"Generated Investor Intelligence Report {version_str} ({integrity_hash})",
        actor="USER",
        source="WEB_DASHBOARD",
        model_version=intel.provenance.model_version,
        input_snapshot={
            "portfolio_valuation": round(total_val, 2),
            "asset_count": len(holdings),
            "health_score": intel.health_scorecard.overall_score
        },
        result_summary={
            "report_id": saved_doc["_id"],
            "integrity_hash": integrity_hash,
            "risk_category": intel.risk_category,
            "overall_health_score": intel.health_scorecard.overall_score
        }
    )

    # Trigger In-App Notification check with cooldown
    await check_and_generate_portfolio_alerts(
        user_id=user_id,
        portfolio_id=portfolio_id,
        portfolio_name=portfolio.get("name", "Portfolio"),
        total_val=total_val,
        holdings=holdings,
        health_score=intel.health_scorecard.overall_score,
        risk_category=intel.risk_category
    )

    return InvestorReportResponse(
        id=saved_doc["_id"],
        report_integrity_hash=integrity_hash,
        report_version=version_str,
        portfolio_id=portfolio_id,
        portfolio_name=portfolio.get("name", "Portfolio"),
        generated_at=now,
        data_pedigree="REFERENCE",
        provenance=intel.provenance,
        summary=summary,
        benchmark=benchmark_comp,
        risk_category=intel.risk_category,
        risk_confidence=intel.confidence,
        health_scorecard=intel.health_scorecard,
        asset_allocation=asset_alloc,
        sector_allocation=sector_alloc,
        holdings=holdings_items,
        risk_mitigators=intel.risk_mitigators,
        risk_amplifiers=intel.risk_amplifiers,
        recommendations=intel.recommendations,
        disclaimer=report_dict["disclaimer"]
    )


async def list_portfolio_reports(user_id: str, portfolio_id: str) -> List[ReportListItem]:
    docs = await get_reports_by_portfolio(user_id, portfolio_id)
    items: List[ReportListItem] = []
    for d in docs:
        sum_data = d.get("summary", {})
        hlth_data = d.get("health_scorecard", {})
        items.append(ReportListItem(
            id=str(d["_id"]),
            report_integrity_hash=d.get("report_integrity_hash", "NXF-REPORT"),
            report_version=d.get("report_version", "v1.0"),
            portfolio_id=portfolio_id,
            portfolio_name=d.get("portfolio_name", "Portfolio"),
            generated_at=d.get("generated_at", datetime.now(timezone.utc)),
            total_valuation=float(sum_data.get("total_valuation", 0.0)),
            risk_category=d.get("risk_category", "MODERATE"),
            health_score=int(hlth_data.get("overall_score", 75)),
            grade=hlth_data.get("grade", "A")
        ))
    return items


async def get_saved_report_by_id(user_id: str, report_id: str) -> InvestorReportResponse:
    doc = await get_report_by_id_and_user(report_id, user_id)
    if not doc:
        raise ValueError("Report snapshot not found or access denied.")

    doc["id"] = str(doc["_id"])
    return InvestorReportResponse(**doc)
