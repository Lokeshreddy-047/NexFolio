from typing import List, Optional, Dict
from pydantic import BaseModel
from app.schemas.portfolio import PortfolioSummary, AllocationBreakdown
from app.schemas.holding import HoldingResponse
from app.schemas.transaction import TransactionResponse


class PulseMetrics(BaseModel):
    total_value: float
    invested_capital: float
    day_pnl: float
    day_pnl_pct: float
    total_pnl: float
    total_roi_pct: float
    realized_pnl: float
    holdings_count: int
    data_badge: str = "REFERENCE"  # "LIVE" | "DELAYED" | "REFERENCE" | "UNAVAILABLE"


class TopMover(BaseModel):
    symbol: str
    company_name: str
    quantity: float
    current_price: float
    day_change_pct: float
    day_pnl_contribution: float
    total_pnl: float
    sector: str
    weight: float


class TopMoversGroup(BaseModel):
    gainers: List[TopMover] = []
    losers: List[TopMover] = []


class ConcentrationMetrics(BaseModel):
    largest_holding_symbol: Optional[str] = None
    largest_holding_name: Optional[str] = None
    largest_holding_pct: float = 0.0
    largest_holding_value: float = 0.0
    top_5_concentration_pct: float = 0.0
    sector_concentration_warning: bool = False
    overconcentrated_sector: Optional[str] = None
    overconcentrated_sector_pct: Optional[float] = None


class HealthCompactSummary(BaseModel):
    health_score: int
    risk_category: str
    confidence: float
    diversification_score: float
    volatility_label: str  # e.g. "Low (12.4%)", "Moderate (19.8%)", "High (32.1%)"
    sharpe_ratio: float
    max_drawdown_label: str  # e.g. "-12.4%"


class CommandCenterOverviewResponse(BaseModel):
    portfolio: PortfolioSummary
    pulse: PulseMetrics
    top_movers: TopMoversGroup
    concentration: ConcentrationMetrics
    health: HealthCompactSummary
    asset_allocation: List[AllocationBreakdown] = []
    sector_allocation: List[AllocationBreakdown] = []
    recent_activity: List[TransactionResponse] = []
    holdings: List[HoldingResponse] = []
