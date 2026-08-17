import pytest
from app.services.news_service import news_service
from app.schemas.news import NewsCategory, NewsSentiment


@pytest.mark.asyncio
async def test_get_all_news_and_search_filter():
    all_news = await news_service.get_all_news()
    assert len(all_news) >= 5
    
    # Filter by category
    earnings = await news_service.get_all_news(category=NewsCategory.EARNINGS)
    assert len(earnings) >= 1
    assert all(n.category == NewsCategory.EARNINGS for n in earnings)
    
    # Filter by sentiment
    bullish = await news_service.get_all_news(sentiment=NewsSentiment.BULLISH)
    assert len(bullish) >= 2
    assert all(n.sentiment == NewsSentiment.BULLISH for n in bullish)
    
    # Search query
    rel_news = await news_service.get_all_news(search="Reliance")
    assert len(rel_news) >= 1
    assert any("RELIANCE" in s.symbol for n in rel_news for s in n.related_stocks)


@pytest.mark.asyncio
async def test_macro_indicators_and_overview():
    macro = await news_service.get_macro_indicators()
    assert len(macro) >= 5
    assert any(m.name == "RBI Repo Rate" for m in macro)
    assert any(m.name == "Brent Crude Oil" for m in macro)
    
    overview = await news_service.get_news_overview()
    assert len(overview.macro_indicators) >= 5
    assert len(overview.top_headlines) >= 1
    assert "bullish_pct" in overview.sentiment_ratio


@pytest.mark.asyncio
async def test_portfolio_impact_news_matching():
    holdings = ["RELIANCE.NS", "HDFCBANK.NS"]
    impact = await news_service.get_portfolio_impact_news(
        portfolio_id="test_port_1",
        portfolio_name="Alpha Tech Growth",
        holding_symbols=holdings
    )
    assert impact.total_relevant_news_count >= 2
    assert impact.overall_portfolio_sentiment == NewsSentiment.BULLISH
    assert len(impact.articles) >= 2
