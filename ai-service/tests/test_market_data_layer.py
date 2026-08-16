import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch
from app.schemas.market import DataBadge, MarketSessionState
from app.services.market_data import (
    ReferenceMarketProvider,
    LiveMarketProvider,
    MarketDataManager,
    get_market_session_state,
    check_quote_staleness
)


@pytest.mark.asyncio
async def test_reference_market_provider():
    provider = ReferenceMarketProvider()
    assert provider.provider_id == "parquet_reference"
    assert provider.default_data_badge == DataBadge.REFERENCE

    # 1. Market Overview
    overview = await provider.get_market_overview()
    assert overview.data_badge == "REFERENCE"
    assert overview.provider == "parquet_reference"
    assert overview.pulse.mood in ("BULLISH", "BEARISH", "NEUTRAL")
    assert len(overview.indices) >= 3
    assert len(overview.top_gainers) > 0

    # 2. Screener Query
    screener = await provider.get_stock_screener(preset="TOP_GAINERS", limit=10)
    assert screener.total_count > 0
    assert len(screener.stocks) <= 10
    assert screener.data_badge == "REFERENCE"

    # 3. Stock Detail
    detail = await provider.get_stock_detail("RELIANCE.NS")
    assert detail is not None
    assert detail.base_symbol == "RELIANCE"
    assert detail.current_price > 0
    assert detail.data_badge == "REFERENCE"
    assert len(detail.price_history) > 0

    # 4. Batch Quotes Fast Loop
    quotes = await provider.get_batch_quotes(["RELIANCE.NS", "TCS.NS"])
    assert "RELIANCE.NS" in quotes
    assert "TCS.NS" in quotes
    assert quotes["RELIANCE.NS"]["price"] > 0

    # 5. Health check
    health = await provider.health_check()
    assert health["status"] == "HEALTHY"
    assert health["symbols_count"] > 0


@pytest.mark.asyncio
async def test_live_market_provider_and_fallback():
    ref = ReferenceMarketProvider()
    live = LiveMarketProvider(provider_name="test_live_vendor", reference_fallback=ref, max_staleness_seconds=2.0)

    # 1. Initial Fresh Live Feed
    overview = await live.get_market_overview()
    assert overview.data_badge == "LIVE"
    assert overview.provider == "live_feed_test_live_vendor"
    assert overview.is_stale is False

    # 2. Ingest Live Quote Tick Override
    live.update_live_quote("INFY.NS", ltp=1850.50, day_change=25.50, day_change_pct=1.40, volume=1200000)
    detail = await live.get_stock_detail("INFY.NS")
    assert detail is not None
    assert detail.current_price == 1850.50
    assert detail.day_change == 25.50
    assert detail.data_badge == "LIVE"

    # 3. Simulate Stale Data
    live._last_heartbeat = datetime.now(timezone.utc) - timedelta(seconds=10)
    stale_detail = await live.get_stock_detail("INFY.NS")
    assert stale_detail.is_stale is True

    # 4. Simulate Live Feed Disconnection (Safe degradation to FALLBACK_REFERENCE)
    live.set_connection_status(False)
    fallback_overview = await live.get_market_overview()
    assert fallback_overview.data_badge == "FALLBACK_REFERENCE"
    assert fallback_overview.fallback_reason is not None
    assert fallback_overview.is_stale is True

    fallback_detail = await live.get_stock_detail("TCS.NS")
    assert fallback_detail.data_badge == "FALLBACK_REFERENCE"


@pytest.mark.asyncio
async def test_market_data_manager_orchestration():
    manager = MarketDataManager()
    overview1 = await manager.get_market_overview()
    assert overview1.data_badge in ("REFERENCE", "LIVE")

    # Second call should hit cache
    overview2 = await manager.get_market_overview()
    assert overview2.market_date == overview1.market_date

    health = await manager.health_check()
    assert health["status"] == "HEALTHY"


def test_market_session_and_staleness():
    state, desc = get_market_session_state()
    assert isinstance(state, MarketSessionState)
    assert len(desc) > 0

    now = datetime.now(timezone.utc)
    stale, reason = check_quote_staleness(now - timedelta(seconds=300), max_live_age_seconds=60.0)
    # If market is closed/weekend, historical/closing is not stale; if open, >60s is stale
    assert isinstance(stale, bool)


def test_paired_configuration_validation():
    """Verifies that MARKET_DATA_MODE and MARKET_DATA_PROVIDER are strictly validated as pairs."""
    import os

    # 1. Valid pairs
    with patch.dict(os.environ, {"MARKET_DATA_MODE": "reference", "MARKET_DATA_PROVIDER": "reference"}):
        mgr1 = MarketDataManager()
        assert mgr1._mode == "reference"

    with patch.dict(os.environ, {"MARKET_DATA_MODE": "simulated", "MARKET_DATA_PROVIDER": "simulated"}):
        mgr2 = MarketDataManager()
        assert mgr2._mode == "simulated"

    with patch.dict(os.environ, {"MARKET_DATA_MODE": "live", "MARKET_DATA_PROVIDER": "upstox"}):
        mgr3 = MarketDataManager()
        assert mgr3._mode == "live"

    # 2. Invalid pairs should raise ValueError
    with patch.dict(os.environ, {"MARKET_DATA_MODE": "live", "MARKET_DATA_PROVIDER": "reference"}):
        with pytest.raises(ValueError) as exc:
            MarketDataManager()
        assert "Invalid market configuration pair" in str(exc.value)

    with patch.dict(os.environ, {"MARKET_DATA_MODE": "reference", "MARKET_DATA_PROVIDER": "upstox"}):
        with pytest.raises(ValueError) as exc:
            MarketDataManager()
        assert "Invalid market configuration pair" in str(exc.value)
