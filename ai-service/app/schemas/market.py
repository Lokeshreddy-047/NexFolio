from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class DataBadge(str, Enum):
    LIVE = "LIVE"
    DELAYED = "DELAYED"
    SIMULATED = "SIMULATED"
    REFERENCE = "REFERENCE"
    FALLBACK_REFERENCE = "FALLBACK_REFERENCE"
    UNAVAILABLE = "UNAVAILABLE"


class MarketSessionState(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    PRE_OPEN = "PRE_OPEN"
    POST_CLOSE = "POST_CLOSE"
    WEEKEND = "WEEKEND"
    HOLIDAY = "HOLIDAY"


class MarketIndex(BaseModel):
    symbol: str
    name: str
    current_level: float
    day_change: float
    day_change_pct: float
    sparkline: List[float] = []


class SectorPerformanceItem(BaseModel):
    name: str
    avg_change_pct: float
    stocks_count: int
    top_performer: str
    top_performer_gain_pct: float


class MarketPulse(BaseModel):
    mood: str  # "BULLISH" | "BEARISH" | "NEUTRAL"
    advances_count: int
    declines_count: int
    unchanged_count: int
    strongest_sector: str
    strongest_sector_gain_pct: float
    weakest_sector: str
    weakest_sector_loss_pct: float
    benchmark_trend: str


class MarketStockItem(BaseModel):
    symbol: str
    base_symbol: str
    company_name: str
    sector: str
    current_price: float
    day_change: float
    day_change_pct: float
    volume: int
    high_52w: float
    low_52w: float
    pct_from_52w_high: float
    market_cap_category: str  # "Large Cap" | "Mid Cap" | "Small Cap"
    is_in_portfolio: bool = False
    portfolio_weight_pct: Optional[float] = None
    is_in_watchlist: bool = False


class MarketOverviewResponse(BaseModel):
    data_badge: str = "REFERENCE"
    provider: str = "parquet_reference"
    market_date: str
    updated_at: str = ""
    market_session: str = "CLOSED"
    is_stale: bool = False
    fallback_reason: Optional[str] = None
    pulse: MarketPulse
    indices: List[MarketIndex] = []
    top_gainers: List[MarketStockItem] = []
    top_losers: List[MarketStockItem] = []
    most_active: List[MarketStockItem] = []
    sector_performance: List[SectorPerformanceItem] = []


class StockPricePoint(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    daily_return: Optional[float] = None


class PortfolioStockExposure(BaseModel):
    has_position: bool
    portfolio_id: Optional[str] = None
    portfolio_name: Optional[str] = None
    quantity: float = 0.0
    avg_buy_price: float = 0.0
    invested_capital: float = 0.0
    current_valuation: float = 0.0
    portfolio_weight_pct: float = 0.0
    unrealized_pnl: float = 0.0
    unrealized_roi_pct: float = 0.0
    realized_gain: float = 0.0


class StockDetailResponse(BaseModel):
    symbol: str
    base_symbol: str
    company_name: str
    sector: str
    asset_type: str = "Equity"
    data_badge: str = "REFERENCE"
    provider: str = "parquet_reference"
    updated_at: str = ""
    market_session: str = "CLOSED"
    is_stale: bool = False
    fallback_reason: Optional[str] = None
    current_price: float
    day_change: float
    day_change_pct: float
    open: float
    high: float
    low: float
    volume: int
    high_52w: float
    low_52w: float
    position_in_52w_range_pct: float  # 0 to 100%
    beta: float
    annualized_volatility: float
    price_history: List[StockPricePoint] = []
    portfolio_exposure: PortfolioStockExposure
    is_in_watchlist: bool = False
    ai_risk_context: str = ""


class MarketScreenerQuery(BaseModel):
    query: Optional[str] = None
    sector: Optional[str] = None
    preset: str = "ALL"  # "ALL" | "TOP_GAINERS" | "TOP_LOSERS" | "MOST_ACTIVE" | "NEAR_52W_HIGH" | "NEAR_52W_LOW" | "MY_HOLDINGS" | "MY_WATCHLIST"
    sort_by: str = "day_change_pct"  # "day_change_pct" | "current_price" | "volume" | "symbol"
    sort_order: str = "desc"  # "asc" | "desc"
    limit: int = 50
    offset: int = 0


class MarketScreenerResponse(BaseModel):
    total_count: int
    returned_count: int
    data_badge: str = "REFERENCE"
    provider: str = "parquet_reference"
    updated_at: str = ""
    market_session: str = "CLOSED"
    is_stale: bool = False
    fallback_reason: Optional[str] = None
    stocks: List[MarketStockItem] = []


class WatchlistCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)


class WatchlistToggleStockRequest(BaseModel):
    symbol: str


class WatchlistResponse(BaseModel):
    id: str
    user_id: str
    name: str
    symbols: List[str] = []
    stocks: List[MarketStockItem] = []
    total_valuation_reference: float = 0.0
    avg_day_change_pct: float = 0.0
    created_at: datetime
    updated_at: datetime
