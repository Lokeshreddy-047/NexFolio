from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class IPOStatus(str, Enum):
    UPCOMING = "UPCOMING"
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    LISTED = "LISTED"


class IPOMarketType(str, Enum):
    MAINBOARD = "MAINBOARD"
    SME = "SME"


class IPORiskVerdict(str, Enum):
    STRONG_SUBSCRIBE = "STRONG_SUBSCRIBE"
    SUBSCRIBE_LONG_TERM = "SUBSCRIBE_LONG_TERM"
    NEUTRAL = "NEUTRAL"
    AVOID = "AVOID"


class IPOSubscription(BaseModel):
    qib_multiple: float = Field(default=0.0, description="Qualified Institutional Buyers subscription multiple")
    nii_multiple: float = Field(default=0.0, description="Non-Institutional Investors subscription multiple")
    retail_multiple: float = Field(default=0.0, description="Retail Individual Investors subscription multiple")
    employee_multiple: Optional[float] = Field(default=0.0, description="Employee quota multiple")
    total_multiple: float = Field(default=0.0, description="Total overall subscription multiple")
    updated_at: str


class IPOFinancials(BaseModel):
    revenue_cagr_3yr: float = Field(description="3-Year Revenue CAGR percentage")
    ebitda_margin: float = Field(description="Latest Operating EBITDA margin percentage")
    pat_margin: float = Field(description="Latest Net Profit Margin percentage")
    roe: float = Field(description="Return on Equity percentage")
    roce: float = Field(description="Return on Capital Employed percentage")
    debt_to_equity: float = Field(description="Total Debt to Equity ratio")
    eps: float = Field(description="Latest Earnings Per Share in INR")
    historical_revenue: List[Dict[str, Any]] = Field(default_factory=list, description="Historical revenue trend (FY22, FY23, FY24)")
    historical_pat: List[Dict[str, Any]] = Field(default_factory=list, description="Historical PAT trend (FY22, FY23, FY24)")


class IPOPeerComparison(BaseModel):
    peer_name: str
    pe_ratio: float
    pb_ratio: float
    market_cap_cr: float


class IPOAnalysisResult(BaseModel):
    quality_score: int = Field(description="Overall institutional quality and risk index (0 to 100)")
    verdict: IPORiskVerdict
    confidence: float = Field(description="AI Confidence percentage (0.0 to 1.0)")
    valuation_score: int = Field(description="Valuation attractiveness score (0-100)")
    capital_allocation_score: int = Field(description="Capital use & OFS penalty score (0-100)")
    financial_health_score: int = Field(description="Balance sheet solvency & margin score (0-100)")
    demand_momentum_score: int = Field(description="QIB & GMP momentum score (0-100)")
    asking_pe: float
    industry_median_pe: float
    valuation_discount_pct: float = Field(description="Discount (+) or Premium (-) compared to industry peers")
    estimated_allotment_odds_pct: float = Field(description="Estimated retail allotment probability percentage")
    estimated_profit_per_lot: float = Field(description="Estimated gain per lot based on live GMP in INR")
    top_catalysts: List[str] = Field(default_factory=list, description="Top positive structural drivers")
    key_red_flags: List[str] = Field(default_factory=list, description="Key structural risks and red flags")
    summary_verdict: str = Field(description="2-sentence AI investment conclusion")


class IPOItem(BaseModel):
    id: str
    company_name: str
    symbol: str
    market_type: IPOMarketType
    sector: str
    logo_initials: str
    status: IPOStatus
    price_band_low: float
    price_band_high: float
    lot_size: int
    min_investment: float
    total_issue_size_cr: float
    fresh_issue_cr: float
    ofs_cr: float
    fresh_issue_pct: float
    open_date: str
    close_date: str
    allotment_date: str
    listing_date: str
    gmp_inr: float = Field(default=0.0, description="Current Grey Market Premium in INR")
    gmp_pct: float = Field(default=0.0, description="Estimated listing premium percentage")
    estimated_listing_price: float
    subscription: IPOSubscription
    financials: IPOFinancials
    peers: List[IPOPeerComparison] = Field(default_factory=list)
    registrar: str
    registrar_url: str
    lead_managers: List[str] = Field(default_factory=list)
    ai_analysis: IPOAnalysisResult


class ListedIPOPosPerformance(BaseModel):
    id: str
    company_name: str
    symbol: str
    sector: str
    listing_date: str
    issue_price: float
    listing_price: float
    listing_gain_pct: float
    current_price: float
    gain_since_listing_pct: float
    status: str


class IPOOverviewMetrics(BaseModel):
    active_bidding_count: int
    upcoming_count: int
    total_capital_raised_cr: float
    average_listing_gain_pct: float
    top_gmp_pick: str
    top_gmp_pct: float
