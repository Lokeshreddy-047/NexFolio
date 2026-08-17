from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from app.schemas.news import (
    NewsItem,
    NewsCategory,
    NewsSentiment,
    NewsImpact,
    MacroIndicator,
    RelatedStockChip,
    PortfolioNewsImpact,
    NewsOverviewResponse
)


class NewsService:
    """Real-Time Financial News, Sentiment Intelligence, and Macroeconomic Radar Service."""

    def __init__(self):
        self._macro_indicators: List[Dict[str, Any]] = [
            {
                "id": "macro_rbi_repo",
                "name": "RBI Repo Rate",
                "symbol": "INTRP=ECI",
                "current_value": "6.50%",
                "numeric_value": 6.50,
                "unit": "%",
                "day_change": 0.0,
                "day_change_pct": 0.0,
                "trend": "NEUTRAL",
                "impact_note": "MPC maintained status quo to balance inflation targeting while supporting 7.2% GDP growth.",
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "macro_india_10y",
                "name": "India 10Y Benchmark G-Sec",
                "symbol": "IN10Y=RR",
                "current_value": "6.82%",
                "numeric_value": 6.82,
                "unit": "%",
                "day_change": -0.03,
                "day_change_pct": -0.44,
                "trend": "BULLISH",
                "impact_note": "Easing bond yields lower sovereign discount rates, supporting equity PE multiples.",
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "macro_brent_crude",
                "name": "Brent Crude Oil",
                "symbol": "BZ=F",
                "current_value": "$74.50",
                "numeric_value": 74.50,
                "unit": "$/bbl",
                "day_change": -0.85,
                "day_change_pct": -1.13,
                "trend": "BULLISH",
                "impact_note": "Sub-$75 crude reduces India's current account deficit and raw material costs for Paints & OMCs.",
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "macro_usd_inr",
                "name": "USD / INR Exchange",
                "symbol": "USDINR=X",
                "current_value": "₹87.20",
                "numeric_value": 87.20,
                "unit": "INR",
                "day_change": 0.08,
                "day_change_pct": 0.09,
                "trend": "NEUTRAL",
                "impact_note": "Rangebound rupee volatility managed actively through RBI foreign exchange reserve interventions.",
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "macro_india_vix",
                "name": "India VIX (Volatility Index)",
                "symbol": "^INDIAVIX",
                "current_value": "13.40",
                "numeric_value": 13.40,
                "unit": "pts",
                "day_change": -0.45,
                "day_change_pct": -3.25,
                "trend": "BULLISH",
                "impact_note": "Low volatility regime signifies healthy institutional risk appetite and market calm.",
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": "macro_fii_dii_net",
                "name": "FII / DII Net Flow",
                "symbol": "NSE_INSTITUTIONAL",
                "current_value": "+₹1,840 Cr",
                "numeric_value": 1840.0,
                "unit": "Cr",
                "day_change": 420.0,
                "day_change_pct": 29.5,
                "trend": "BULLISH",
                "impact_note": "Domestic institutional SIP inflows of ₹23,000+ Cr/month absorb global FII rebalancing.",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        ]

        self._articles_database: List[Dict[str, Any]] = [
            {
                "id": "news_rel_expansion",
                "headline": "Reliance Industries Signs ₹22,000 Cr Solar & Green Hydrogen Deal in Gujarat",
                "summary": "Reliance New Energy expands its Jamnagar giga-factory complex, finalizing multi-gigawatt module supply agreements and electrolyzer manufacturing infrastructure.",
                "source": "Bloomberg Quint",
                "category": NewsCategory.DEALS_MA,
                "sentiment": NewsSentiment.BULLISH,
                "sentiment_score": 0.88,
                "impact_severity": NewsImpact.HIGH,
                "published_at": "2026-08-17T09:30:00Z",
                "time_ago": "25 mins ago",
                "is_breaking": True,
                "impacted_sectors": ["Oil Gas & Consumable Fuels", "Power & Renewable Energy"],
                "related_stocks": [
                    {
                        "symbol": "RELIANCE.NS",
                        "base_symbol": "RELIANCE",
                        "company_name": "Reliance Industries Ltd",
                        "sector": "Oil Gas & Consumable Fuels",
                        "day_change_pct": 0.46,
                        "current_price": 1316.00
                    }
                ],
                "ai_takeaway": "Direct long-term valuation catalyst accelerating Reliance's green energy EBITDA contribution ahead of FY28 targets."
            },
            {
                "id": "news_hdfc_credit_growth",
                "headline": "HDFC Bank Reports Robust 14.8% YoY Loan Growth with Net Interest Margin Expanding to 3.52%",
                "summary": "Private banking bellwether HDFC Bank demonstrates sequential deposit accretion and reduced cost-to-income ratio following successful merger integration.",
                "source": "Mint Financial",
                "category": NewsCategory.EARNINGS,
                "sentiment": NewsSentiment.BULLISH,
                "sentiment_score": 0.79,
                "impact_severity": NewsImpact.HIGH,
                "published_at": "2026-08-17T08:45:00Z",
                "time_ago": "1 hour ago",
                "is_breaking": False,
                "impacted_sectors": ["Financial Services"],
                "related_stocks": [
                    {
                        "symbol": "HDFCBANK.NS",
                        "base_symbol": "HDFCBANK",
                        "company_name": "HDFC Bank Ltd",
                        "sector": "Financial Services",
                        "day_change_pct": 0.25,
                        "current_price": 1740.20
                    }
                ],
                "ai_takeaway": "Solidifying NIM trajectory and benign credit costs reaffirm buy ratings across domestic mutual funds."
            },
            {
                "id": "news_it_spending_cloud",
                "headline": "TCS and Infosys Secure $1.4B Multi-Year Cloud & GenAI Modernization Deals in Europe",
                "summary": "Tier-1 Indian IT exporters announce enterprise cloud transformation wins across Nordic banking and automotive consortiums, offsetting North American tech slowdown.",
                "source": "Economic Times",
                "category": NewsCategory.DEALS_MA,
                "sentiment": NewsSentiment.BULLISH,
                "sentiment_score": 0.72,
                "impact_severity": NewsImpact.MEDIUM,
                "published_at": "2026-08-17T07:15:00Z",
                "time_ago": "2 hours ago",
                "is_breaking": False,
                "impacted_sectors": ["Information Technology"],
                "related_stocks": [
                    {
                        "symbol": "TCS.NS",
                        "base_symbol": "TCS",
                        "company_name": "Tata Consultancy Services Ltd",
                        "sector": "Information Technology",
                        "day_change_pct": -2.02,
                        "current_price": 2313.20
                    },
                    {
                        "symbol": "INFY.NS",
                        "base_symbol": "INFY",
                        "company_name": "Infosys Ltd",
                        "sector": "Information Technology",
                        "day_change_pct": -2.51,
                        "current_price": 1139.90
                    }
                ],
                "ai_takeaway": "Order book resilience establishes a floor for FY27 revenue growth despite macroeconomic headwinds in European discretionary budgets."
            },
            {
                "id": "news_tata_motors_ev",
                "headline": "Tata Motors Expands Commercial EV Fleet Deliveries as JLR Order Book Crosses 150,000 Units",
                "summary": "Tata Motors records record monthly registrations for Nexon EV and Ace EV models while Jaguar Land Rover maintains healthy order backlog in China and US.",
                "source": "CNBC-TV18",
                "category": NewsCategory.SECTOR_TRENDS,
                "sentiment": NewsSentiment.BULLISH,
                "sentiment_score": 0.81,
                "impact_severity": NewsImpact.MEDIUM,
                "published_at": "2026-08-17T06:30:00Z",
                "time_ago": "3 hours ago",
                "is_breaking": False,
                "impacted_sectors": ["Automobile"],
                "related_stocks": [
                    {
                        "symbol": "TATAMOTORS.NS",
                        "base_symbol": "TATAMOTORS",
                        "company_name": "Tata Motors Ltd",
                        "sector": "Automobile",
                        "day_change_pct": 0.85,
                        "current_price": 968.40
                    }
                ],
                "ai_takeaway": "Free cash flow expansion supports impending demerger into distinct PV and CV listed entities."
            },
            {
                "id": "news_sebi_fno_regulations",
                "headline": "SEBI Implements New Derivative Trading Framework to Curb Retail Speculative Exposure",
                "summary": "The market regulator increases minimum contract values to ₹15 Lakhs and mandates intraday position monitoring across index options to safeguard individual capital.",
                "source": "Reuters India",
                "category": NewsCategory.REGULATORY,
                "sentiment": NewsSentiment.NEUTRAL,
                "sentiment_score": 0.10,
                "impact_severity": NewsImpact.HIGH,
                "published_at": "2026-08-17T05:00:00Z",
                "time_ago": "5 hours ago",
                "is_breaking": False,
                "impacted_sectors": ["Financial Services", "Capital Markets"],
                "related_stocks": [
                    {
                        "symbol": "ANGELONE.NS",
                        "base_symbol": "ANGELONE",
                        "company_name": "Angel One Ltd",
                        "sector": "Financial Services",
                        "day_change_pct": -1.80,
                        "current_price": 2840.00
                    }
                ],
                "ai_takeaway": "May temporarily moderate exchange turnover volumes but establishes institutional longevity and lowers systemic retail default risks."
            },
            {
                "id": "news_pharma_fda_clearance",
                "headline": "IPCA Labs and Sun Pharma Receive EIR Classification with Zero 483 Observations from US FDA",
                "summary": "US FDA concludes cGMP inspection at active pharmaceutical ingredient (API) facilities in Madhya Pradesh and Gujarat with clean Voluntary Action Indicated status.",
                "source": "Financial Express",
                "category": NewsCategory.REGULATORY,
                "sentiment": NewsSentiment.BULLISH,
                "sentiment_score": 0.94,
                "impact_severity": NewsImpact.HIGH,
                "published_at": "2026-08-17T04:20:00Z",
                "time_ago": "6 hours ago",
                "is_breaking": True,
                "impacted_sectors": ["Healthcare"],
                "related_stocks": [
                    {
                        "symbol": "IPCALAB.NS",
                        "base_symbol": "IPCALAB",
                        "company_name": "IPCA Laboratories Ltd",
                        "sector": "Healthcare",
                        "day_change_pct": 8.67,
                        "current_price": 1884.60
                    }
                ],
                "ai_takeaway": "Resolves long-standing regulatory overhang, unlocking direct supply of formulations to the US generics market."
            }
        ]

    def _to_news_item(self, raw: Dict[str, Any]) -> NewsItem:
        return NewsItem(
            id=raw["id"],
            headline=raw["headline"],
            summary=raw["summary"],
            source=raw["source"],
            category=raw["category"],
            sentiment=raw["sentiment"],
            sentiment_score=raw["sentiment_score"],
            impact_severity=raw["impact_severity"],
            published_at=raw["published_at"],
            time_ago=raw["time_ago"],
            url=raw.get("url"),
            related_stocks=[RelatedStockChip(**s) for s in raw.get("related_stocks", [])],
            impacted_sectors=raw.get("impacted_sectors", []),
            is_breaking=raw.get("is_breaking", False),
            ai_takeaway=raw["ai_takeaway"]
        )

    async def get_all_news(
        self,
        category: Optional[NewsCategory] = None,
        sentiment: Optional[NewsSentiment] = None,
        sector: Optional[str] = None,
        search: Optional[str] = None
    ) -> List[NewsItem]:
        results = []
        for raw in self._articles_database:
            item = self._to_news_item(raw)
            if category and item.category != category:
                continue
            if sentiment and item.sentiment != sentiment:
                continue
            if sector and sector != "ALL" and sector not in item.impacted_sectors:
                continue
            if search and search.strip():
                query = search.strip().lower()
                headline_match = query in item.headline.lower()
                summary_match = query in item.summary.lower()
                stock_match = any(query in s.symbol.lower() or query in s.company_name.lower() for s in item.related_stocks)
                if not (headline_match or summary_match or stock_match):
                    continue
            results.append(item)
        return results

    async def get_macro_indicators(self) -> List[MacroIndicator]:
        return [MacroIndicator(**item) for item in self._macro_indicators]

    async def get_news_overview(self) -> NewsOverviewResponse:
        all_news = [self._to_news_item(r) for r in self._articles_database]
        breaking = [n for n in all_news if n.is_breaking]
        macro = await self.get_macro_indicators()

        bullish_cnt = sum(1 for n in all_news if n.sentiment == NewsSentiment.BULLISH)
        bearish_cnt = sum(1 for n in all_news if n.sentiment == NewsSentiment.BEARISH)
        neutral_cnt = sum(1 for n in all_news if n.sentiment == NewsSentiment.NEUTRAL)

        return NewsOverviewResponse(
            macro_indicators=macro,
            breaking_news=breaking,
            top_headlines=all_news[:6],
            total_articles_count=len(all_news),
            sentiment_ratio={
                "bullish_pct": round((bullish_cnt / len(all_news)) * 100, 1) if all_news else 0,
                "bearish_pct": round((bearish_cnt / len(all_news)) * 100, 1) if all_news else 0,
                "neutral_pct": round((neutral_cnt / len(all_news)) * 100, 1) if all_news else 0,
            }
        )

    async def get_stock_news(self, symbol: str) -> List[NewsItem]:
        clean_sym = symbol.strip().upper().replace(".NS", "")
        results = []
        for raw in self._articles_database:
            item = self._to_news_item(raw)
            if any(s.base_symbol.upper() == clean_sym or s.symbol.upper() == f"{clean_sym}.NS" for s in item.related_stocks):
                results.append(item)
        return results

    async def get_portfolio_impact_news(
        self,
        portfolio_id: str,
        portfolio_name: str,
        holding_symbols: List[str]
    ) -> PortfolioNewsImpact:
        normalized_holdings = {s.strip().upper().replace(".NS", "") for s in holding_symbols}
        matched_articles = []

        for raw in self._articles_database:
            item = self._to_news_item(raw)
            if any(s.base_symbol.upper() in normalized_holdings for s in item.related_stocks):
                matched_articles.append(item)

        total_score = sum(a.sentiment_score for a in matched_articles)
        avg_score = total_score / len(matched_articles) if matched_articles else 0.0

        if avg_score > 0.25:
            overall_sentiment = NewsSentiment.BULLISH
        elif avg_score < -0.25:
            overall_sentiment = NewsSentiment.BEARISH
        else:
            overall_sentiment = NewsSentiment.NEUTRAL

        return PortfolioNewsImpact(
            portfolio_id=portfolio_id,
            portfolio_name=portfolio_name,
            total_relevant_news_count=len(matched_articles),
            overall_portfolio_sentiment=overall_sentiment,
            sentiment_score=round(avg_score, 2),
            articles=matched_articles
        )


# Global singleton instance
news_service = NewsService()
