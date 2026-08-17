import pytest
import asyncio
from app.schemas.market import DataBadge
from app.services.market_data.adapters.simulated_adapter import SimulatedLiveFeedAdapter
from app.services.market_data.adapters.live_broker_adapter import LiveBrokerAdapter


@pytest.mark.asyncio
async def test_simulated_adapter_lifecycle_and_ticks():
    adapter = SimulatedLiveFeedAdapter(tick_interval_seconds=0.1)
    received_ticks = []

    def on_tick(symbol, ltp, day_change, day_change_pct, volume):
        received_ticks.append({
            "symbol": symbol,
            "ltp": ltp,
            "day_change": day_change,
            "volume": volume
        })

    adapter.set_on_tick_callback(on_tick)
    assert adapter.data_badge == DataBadge.SIMULATED

    # Connect & Subscribe
    await adapter.connect()
    assert adapter.is_connected is True

    await adapter.subscribe(["RELIANCE.NS", "TCS.NS", "^NSEI"])
    snapshot = await adapter.fetch_snapshot(["RELIANCE.NS", "^NSEI"])
    assert "RELIANCE.NS" in snapshot
    assert "^NSEI" in snapshot
    assert snapshot["RELIANCE.NS"]["price"] > 0

    # Wait for simulated ticks
    await asyncio.sleep(0.3)
    await adapter.disconnect()
    assert adapter.is_connected is False
    assert len(received_ticks) > 0
    assert any(t["symbol"] == "RELIANCE.NS" or t["symbol"] == "TCS.NS" or t["symbol"] == "^NSEI" for t in received_ticks)


@pytest.mark.asyncio
async def test_live_broker_adapter_normalization():
    adapter = LiveBrokerAdapter(broker_name="angel_one_live")
    assert adapter.data_badge == DataBadge.LIVE

    received = []
    adapter.set_on_tick_callback(lambda s, l, d, dp, v: received.append((s, l, d, dp, v)))

    await adapter.connect()
    assert adapter.is_connected is True

    # Ingest broker tick with raw symbol "NSE:INFY"
    adapter.ingest_broker_tick("NSE:INFY", 1850.50, 15.20, 0.83, 1200000)

    assert len(received) == 1
    assert received[0][0] == "INFY.NS"
    assert received[0][1] == 1850.50

    snapshot = await adapter.fetch_snapshot(["INFY"])
    assert "INFY.NS" in snapshot
    assert snapshot["INFY.NS"]["price"] == 1850.50

    await adapter.disconnect()
    assert adapter.is_connected is False


@pytest.mark.asyncio
async def test_yahoo_adapter_symbol_normalization_and_structure():
    from app.services.market_data.adapters.yahoo_adapter import YahooFinanceAdapter
    from app.services.market_data.symbol_normalizer import SymbolNormalizer

    adapter = YahooFinanceAdapter(timeout_seconds=8.0)
    assert adapter.adapter_name == "yahoo_finance"

    # Test symbol normalization
    assert SymbolNormalizer.to_canonical("RELIANCE") == "RELIANCE.NS"
    assert SymbolNormalizer.to_canonical("TCS") == "TCS.NS"
    assert SymbolNormalizer.to_canonical("NIFTY50") == "^NSEI"
    assert SymbolNormalizer.to_canonical("NIFTYBANK") == "^NSEBANK"
    assert SymbolNormalizer.to_canonical("SENSEX") == "^BSESN"

    # Fetch live/closing quote for test symbol
    quote = await adapter.fetch_single_quote("RELIANCE")
    if quote:  # When external network is reachable
        assert quote["symbol"] == "RELIANCE.NS"
        assert quote["price"] > 0
        assert "previous_close" in quote
        assert "change" in quote
        assert "change_pct" in quote
        assert "volume" in quote
        assert "timestamp" in quote
        assert quote["data_source"] == "yahoo_finance"
        assert quote["data_status"] in ["LIVE", "DELAYED", "FALLBACK_REFERENCE"]


@pytest.mark.asyncio
async def test_yahoo_adapter_pedigree_determination():
    from datetime import datetime, timezone, timedelta
    from app.services.market_data.adapters.yahoo_adapter import YahooFinanceAdapter

    adapter = YahooFinanceAdapter()

    # 1. Missing timestamp -> FALLBACK_REFERENCE
    badge, note = adapter._determine_pedigree(None)
    assert badge == DataBadge.FALLBACK_REFERENCE

    # 2. Past timestamp (e.g. 5 hours ago) -> DELAYED
    old_ts = datetime.now(timezone.utc) - timedelta(hours=5)
    badge, note = adapter._determine_pedigree(old_ts)
    assert badge == DataBadge.DELAYED

    # 3. Dynamic evaluation for recent timestamp
    recent_ts = datetime.now(timezone.utc) - timedelta(seconds=10)
    badge, note = adapter._determine_pedigree(recent_ts)
    assert badge in [DataBadge.LIVE, DataBadge.DELAYED]


@pytest.mark.asyncio
async def test_yahoo_adapter_batch_snapshot_and_caching():
    from datetime import datetime, timezone
    from app.services.market_data.adapters.yahoo_adapter import YahooFinanceAdapter

    adapter = YahooFinanceAdapter()
    await adapter.connect()
    assert adapter.is_connected is True

    # Pre-populate simulated cached entry to test cache hit without network
    now = datetime.now(timezone.utc)
    adapter._quotes_cache["TCS.NS"] = {
        "symbol": "TCS.NS",
        "price": 3850.0,
        "previous_close": 3800.0,
        "change": 50.0,
        "change_pct": 1.32,
        "day_change": 50.0,
        "day_change_pct": 1.32,
        "volume": 250000,
        "timestamp": now.isoformat(),
        "updated_at": now,
        "data_source": "yahoo_finance",
        "data_status": "DELAYED"
    }

    snapshot = await adapter.fetch_snapshot(["TCS", "TCS.NS"])
    assert "TCS.NS" in snapshot
    assert snapshot["TCS.NS"]["price"] == 3850.0

    health = await adapter.health_check()
    assert health["status"] == "HEALTHY"
    assert health["cached_symbols_count"] >= 1

    await adapter.disconnect()
    assert adapter.is_connected is False
