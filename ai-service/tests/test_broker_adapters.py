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
