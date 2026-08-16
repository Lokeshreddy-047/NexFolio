from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class PortfolioSnapshotCreate(BaseModel):
    portfolio_id: str
    total_value: float = Field(..., ge=0)
    invested_capital: float = Field(..., ge=0)
    day_pnl: float = 0.0
    total_pnl: float = 0.0
    total_roi_pct: float = 0.0
    timestamp: Optional[datetime] = None


class PortfolioSnapshotResponse(BaseModel):
    id: str
    portfolio_id: str
    user_id: str
    total_value: float
    invested_capital: float
    day_pnl: float
    total_pnl: float
    total_roi_pct: float
    timestamp: datetime


class BenchmarkPoint(BaseModel):
    date: str
    nifty_return_pct: float
    nifty_level: float


class TimelinePoint(BaseModel):
    date: str
    portfolio_value: float
    invested_capital: float
    portfolio_pnl: float
    portfolio_return_pct: float
    nifty_return_pct: Optional[float] = None


class TimelinePerformanceResponse(BaseModel):
    portfolio_id: str
    time_range: str
    has_sufficient_history: bool
    data_badge: str = "REFERENCE"
    benchmark_status: str = "AVAILABLE"  # "AVAILABLE" | "UNAVAILABLE"
    data_points: List[TimelinePoint] = []
