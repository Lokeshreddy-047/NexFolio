from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from app.schemas.news import (
    NewsItem,
    NewsCategory,
    NewsSentiment,
    MacroIndicator,
    PortfolioNewsImpact,
    NewsOverviewResponse
)
from app.services.news_service import news_service
from app.dependencies.auth import get_current_user
from app.schemas.user import UserPrincipal
from app.repositories.portfolio_repository import get_portfolio_by_id_and_user
from app.repositories.holding_repository import get_holdings_by_portfolio

router = APIRouter()


@router.get("", response_model=List[NewsItem], summary="Get curated financial news")
async def get_market_news(
    category: Optional[NewsCategory] = Query(None, description="Filter by news category"),
    sentiment: Optional[NewsSentiment] = Query(None, description="Filter by AI sentiment (BULLISH, BEARISH, NEUTRAL)"),
    sector: Optional[str] = Query(None, description="Filter by impacted industry sector"),
    search: Optional[str] = Query(None, description="Search query by keyword or stock symbol")
):
    """Returns real-time financial market news with AI sentiment scores and impacted tickers."""
    return await news_service.get_all_news(category=category, sentiment=sentiment, sector=sector, search=search)


@router.get("/overview", response_model=NewsOverviewResponse, summary="Get news overview and macro indicators")
async def get_news_overview():
    """Returns top macroeconomic indicators, breaking news, and market sentiment ratios."""
    return await news_service.get_news_overview()


@router.get("/macro", response_model=List[MacroIndicator], summary="Get macroeconomic indicators")
async def get_macro_indicators():
    """Returns live indicators including RBI Repo Rate, Brent Crude, India 10Y Yield, and FII/DII net flows."""
    return await news_service.get_macro_indicators()


@router.get("/stock/{symbol}", response_model=List[NewsItem], summary="Get news for specific stock")
async def get_stock_news(symbol: str):
    """Returns all financial news articles affecting a specific stock symbol."""
    return await news_service.get_stock_news(symbol)


@router.get("/portfolio/{portfolio_id}", response_model=PortfolioNewsImpact, summary="Get portfolio impact news")
async def get_portfolio_impact_news(
    portfolio_id: str,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """Returns curated news articles impacting the specific holdings of an active user portfolio."""
    port = await get_portfolio_by_id_and_user(portfolio_id, current_user.uid)
    if not port:
        raise HTTPException(status_code=404, detail="Portfolio not found or access denied.")

    holdings = await get_holdings_by_portfolio(portfolio_id)
    symbols = [h.get("symbol", "") for h in holdings]

    return await news_service.get_portfolio_impact_news(
        portfolio_id=portfolio_id,
        portfolio_name=port.get("name", "Portfolio"),
        holding_symbols=symbols
    )
