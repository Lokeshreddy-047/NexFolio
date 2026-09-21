import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.live_news_ingestion import live_news_aggregator
from app.services.news_service import news_service
from app.schemas.news import NewsSentiment, NewsCategory, NewsItem


@pytest.mark.asyncio
async def test_live_news_aggregator_direct_fetch():
    """Verify that live_news_aggregator runs and returns structured NewsItem objects."""
    items = await live_news_aggregator.fetch_live_news()
    assert isinstance(items, list)
    if len(items) > 0:
        first = items[0]
        assert isinstance(first, NewsItem)
        assert len(first.headline) >= 10
        assert first.sentiment in [NewsSentiment.BULLISH, NewsSentiment.BEARISH, NewsSentiment.NEUTRAL]
        assert first.category in list(NewsCategory)
        assert -1.0 <= first.sentiment_score <= 1.0
        assert first.source != ""


def test_entity_extraction_and_sector_mapping():
    """Verify company registry entity recognition and sector mapping."""
    text = "Reliance Industries and HDFC Bank signed a mega renewable energy contract with Infosys."
    chips, sectors = live_news_aggregator._extract_entities(text)
    symbols = {c.base_symbol for c in chips}
    assert "RELIANCE" in symbols
    assert "HDFCBANK" in symbols
    assert "INFY" in symbols
    assert "Oil Gas & Consumable Fuels" in sectors or "Financial Services" in sectors or "Information Technology" in sectors


def test_nlp_sentiment_scoring_bounds():
    """Verify that bullish terminology scores positive and bearish terminology scores negative."""
    bull_text = "Reliance Q3 profit jumps 24% to record high, beats estimates with strong EBITDA growth"
    sentiment_b, score_b, impact_b = live_news_aggregator._analyze_sentiment(bull_text)
    assert sentiment_b == NewsSentiment.BULLISH
    assert score_b > 0.20

    bear_text = "Adani shares plunge 12% as SEBI issues notice after probe over default concerns"
    sentiment_bear, score_bear, impact_bear = live_news_aggregator._analyze_sentiment(bear_text)
    assert sentiment_bear == NewsSentiment.BEARISH
    assert score_bear < -0.20


@pytest.mark.asyncio
async def test_news_service_get_all_news_with_filters():
    """Verify NewsService filtering by category, sentiment, and search."""
    all_news = await news_service.get_all_news()
    assert len(all_news) > 0

    # Search filter test
    sample_keyword = all_news[0].headline.split()[0]
    searched = await news_service.get_all_news(search=sample_keyword)
    assert len(searched) > 0
    assert any(sample_keyword.lower() in n.headline.lower() or sample_keyword.lower() in n.summary.lower() or any(sample_keyword.lower() in s.base_symbol.lower() for s in n.related_stocks) for n in searched)

    # Sentiment filter test
    bullish_news = await news_service.get_all_news(sentiment=NewsSentiment.BULLISH)
    for n in bullish_news:
        assert n.sentiment == NewsSentiment.BULLISH


@pytest.mark.asyncio
async def test_news_overview_metrics():
    """Verify NewsOverviewResponse aggregation metrics."""
    overview = await news_service.get_news_overview()
    assert overview.total_articles_count > 0
    assert len(overview.macro_indicators) > 0
    assert "bullish_pct" in overview.sentiment_ratio
    assert "bearish_pct" in overview.sentiment_ratio
    assert "neutral_pct" in overview.sentiment_ratio
    total_pct = overview.sentiment_ratio["bullish_pct"] + overview.sentiment_ratio["bearish_pct"] + overview.sentiment_ratio["neutral_pct"]
    assert 99.0 <= total_pct <= 101.0  # Float rounding tolerance


@pytest.mark.asyncio
async def test_portfolio_impact_news_matching():
    """Verify portfolio impact news matching for given constituent holdings."""
    holdings = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS"]
    impact = await news_service.get_portfolio_impact_news(
        portfolio_id="test_port_123",
        portfolio_name="Alpha Portfolio",
        holding_symbols=holdings
    )
    assert impact.portfolio_id == "test_port_123"
    assert impact.total_relevant_news_count >= 1
    for article in impact.articles:
        assert any(s.base_symbol in ["RELIANCE", "TCS", "HDFCBANK"] for s in article.related_stocks)


@pytest.mark.asyncio
async def test_news_api_endpoint_via_client():
    """Verify GET /api/v1/news returns HTTP 200 with list of NewsItem schemas."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/news")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "headline" in data[0]
        assert "sentiment" in data[0]
        assert "ai_takeaway" in data[0]
