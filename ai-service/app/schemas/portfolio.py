from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from app.schemas.holding import HoldingResponse
from app.schemas.explanation_response import FeatureImpact


class PortfolioCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    currency: str = Field("INR", max_length=5)
    is_default: bool = False


class PortfolioUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    currency: Optional[str] = Field(None, max_length=5)
    is_default: Optional[bool] = None


class PortfolioSummary(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    currency: str = "INR"
    is_default: bool = False
    total_invested: float = 0.0
    current_value: float = 0.0
    unrealized_pnl: float = 0.0
    unrealized_pnl_pct: float = 0.0
    realized_pnl: float = 0.0
    holdings_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AllocationBreakdown(BaseModel):
    name: str
    value: float
    percentage: float
    holdings_count: int = 0


class PortfolioDetail(PortfolioSummary):
    holdings: List[HoldingResponse] = []
    asset_allocation: List[AllocationBreakdown] = []
    sector_allocation: List[AllocationBreakdown] = []


class QuantitativeRiskMetrics(BaseModel):
    annualized_return: float
    annualized_volatility: float
    portfolio_beta: float
    portfolio_sharpe_ratio: float
    portfolio_sortino_ratio: float
    portfolio_calmar_ratio: float
    diversification_score: float
    portfolio_max_drawdown: float
    asset_count: int
    sector_count: int


class PortfolioAnalyticsResponse(BaseModel):
    portfolio_id: str
    portfolio_name: str
    total_invested: float
    current_value: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    risk_category: str
    confidence: float
    probabilities: Dict[str, float]
    top_positive_contributors: List[FeatureImpact] = []
    top_negative_contributors: List[FeatureImpact] = []
    recommendations: List[str] = []
    portfolio_health_score: int = 75
    quantitative_metrics: QuantitativeRiskMetrics
