from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class NewsSentiment(str, Enum):
    BULLISH = "BULLISH"
    BEARISH = "BEARISH"
    NEUTRAL = "NEUTRAL"


class NewsImpact(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class NewsCategory(str, Enum):
    MACRO_POLICY = "MACRO_POLICY"
    EARNINGS = "EARNINGS"
    DEALS_MA = "DEALS_MA"
    SECTOR_TRENDS = "SECTOR_TRENDS"
    REGULATORY = "REGULATORY"
    MARKET_PULSE = "MARKET_PULSE"


class MacroIndicator(BaseModel):
    id: str
    name: str
    symbol: str
    current_value: str
    numeric_value: float
    unit: str
    day_change: float
    day_change_pct: float
    trend: str = Field(description="Signal: BULLISH, BEARISH, or NEUTRAL for Indian equities")
    impact_note: str = Field(description="Contextual economic takeaway")
    updated_at: str


class RelatedStockChip(BaseModel):
    symbol: str
    base_symbol: str
    company_name: str
    sector: str
    day_change_pct: float
    current_price: float


class NewsItem(BaseModel):
    id: str
    headline: str
    summary: str
    source: str
    category: NewsCategory
    sentiment: NewsSentiment
    sentiment_score: float = Field(description="Polarity score from -1.0 (very bearish) to +1.0 (very bullish)")
    impact_severity: NewsImpact
    published_at: str
    time_ago: str
    url: Optional[str] = None
    related_stocks: List[RelatedStockChip] = Field(default_factory=list)
    impacted_sectors: List[str] = Field(default_factory=list)
    is_breaking: bool = False
    ai_takeaway: str = Field(description="2-sentence actionable market takeaway")


class PortfolioNewsImpact(BaseModel):
    portfolio_id: str
    portfolio_name: str
    total_relevant_news_count: int
    overall_portfolio_sentiment: NewsSentiment
    sentiment_score: float
    articles: List[NewsItem] = Field(default_factory=list)


class NewsOverviewResponse(BaseModel):
    macro_indicators: List[MacroIndicator]
    breaking_news: List[NewsItem]
    top_headlines: List[NewsItem]
    total_articles_count: int
    sentiment_ratio: dict
