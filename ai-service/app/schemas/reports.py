from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.intelligence import ModelProvenance, HealthScorecard, HumanReadableDriver, TraceableRecommendation


class PortfolioReportSummary(BaseModel):
    portfolio_id: str
    portfolio_name: str
    currency: str = "INR"
    total_valuation: float
    invested_capital: float
    total_unrealized_pnl: float
    total_roi_pct: float
    realized_gains: float
    cash_balance: float
    asset_count: int
    top_holding_symbol: str
    top_holding_weight_pct: float


class ReportBenchmarkComparison(BaseModel):
    benchmark_name: str = "NIFTY 50"
    data_badge: str = "REFERENCE"
    portfolio_roi_pct: float
    benchmark_roi_pct: float
    alpha_pct: float
    portfolio_beta: float
    annualized_volatility: float


class ReportAssetAllocation(BaseModel):
    asset_type: str
    valuation: float
    weight_pct: float


class ReportSectorAllocation(BaseModel):
    sector: str
    valuation: float
    weight_pct: float


class ReportHoldingItem(BaseModel):
    symbol: str
    base_symbol: str
    company_name: str
    sector: str
    quantity: float
    avg_buy_price: float
    current_price: float
    valuation: float
    weight_pct: float
    unrealized_pnl: float
    unrealized_roi_pct: float


class InvestorReportResponse(BaseModel):
    id: str
    report_integrity_hash: str
    report_version: str
    portfolio_id: str
    portfolio_name: str
    generated_at: datetime
    data_pedigree: str = "REFERENCE"
    provenance: ModelProvenance
    summary: PortfolioReportSummary
    benchmark: ReportBenchmarkComparison
    risk_category: str
    risk_confidence: float
    health_scorecard: HealthScorecard
    asset_allocation: List[ReportAssetAllocation] = []
    sector_allocation: List[ReportSectorAllocation] = []
    holdings: List[ReportHoldingItem] = []
    risk_mitigators: List[HumanReadableDriver] = []
    risk_amplifiers: List[HumanReadableDriver] = []
    recommendations: List[TraceableRecommendation] = []
    disclaimer: str = (
        "NexFolio Intelligence reports are generated using explainable machine learning models for analytical "
        "and informational purposes only. Past model predictions do not guarantee future performance. "
        "Consult a certified financial advisor before executing investment decisions."
    )


class ReportListItem(BaseModel):
    id: str
    report_integrity_hash: str
    report_version: str
    portfolio_id: str
    portfolio_name: str
    generated_at: datetime
    total_valuation: float
    risk_category: str
    health_score: int
    grade: str


class AuditLogItem(BaseModel):
    id: str
    user_id: str
    portfolio_id: Optional[str] = None
    event_type: str  # "RISK_INFERENCE", "SIMULATION", "TRANSACTION", "REBALANCE", "REPORT_GENERATION", "WATCHLIST_TOGGLE"
    timestamp: datetime
    actor: str = "USER"  # "USER" | "SYSTEM" | "AI_ENGINE"
    source: str = "WEB_DASHBOARD"  # "WEB_DASHBOARD" | "API" | "BACKGROUND_WORKER"
    model_version: Optional[str] = None
    description: str
    input_snapshot: Dict[str, Any] = {}
    result_summary: Dict[str, Any] = {}


class AuditLogListResponse(BaseModel):
    total_count: int
    events: List[AuditLogItem] = []
