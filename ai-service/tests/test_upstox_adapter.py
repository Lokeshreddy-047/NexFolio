import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import patch

from app.schemas.market import DataBadge
from app.services.market_data.adapters.upstox_adapter import UpstoxBrokerAdapter
from app.services.market_data.live_provider import LiveMarketProvider
from app.services.market_data.reference_provider import ReferenceMarketProvider


def test_upstox_token_translation_mapping():
    """Verifies bidirectional mapping between Upstox instrument keys and canonical symbols."""
    # Index translations
    assert UpstoxBrokerAdapter.to_instrument_key("^NSEI") == "NSE_INDEX|Nifty 50"
    assert UpstoxBrokerAdapter.to_instrument_key("^NSEBANK") == "NSE_INDEX|Nifty Bank"
    assert UpstoxBrokerAdapter.from_instrument_key("NSE_INDEX|Nifty 50") == "^NSEI"
    assert UpstoxBrokerAdapter.from_instrument_key("NSE_INDEX|Nifty Bank") == "^NSEBANK"

    # Known ISIN Equity translations
    assert UpstoxBrokerAdapter.to_instrument_key("RELIANCE.NS") == "NSE_EQ|INE002A01018"
    assert UpstoxBrokerAdapter.to_instrument_key("TCS.NS") == "NSE_EQ|INE467B01029"
    assert UpstoxBrokerAdapter.to_instrument_key("INFY.NS") == "NSE_EQ|INE009A01021"

    assert UpstoxBrokerAdapter.from_instrument_key("NSE_EQ|INE002A01018") == "RELIANCE.NS"
    assert UpstoxBrokerAdapter.from_instrument_key("NSE_EQ|INE467B01029") == "TCS.NS"
    assert UpstoxBrokerAdapter.from_instrument_key("NSE_EQ|INE009A01021") == "INFY.NS"

    # Generic Equity translation fallback
    assert UpstoxBrokerAdapter.to_instrument_key("TATAMOTORS.NS") == "NSE_EQ|TATAMOTORS"
    assert UpstoxBrokerAdapter.from_instrument_key("NSE_EQ|TATAMOTORS") == "TATAMOTORS.NS"


@pytest.mark.asyncio
async def test_upstox_adapter_lifecycle_and_sanitized_state():
    """Verifies that missing credentials degrade safely without crashing."""
    # 1. Without credentials
    adapter_no_creds = UpstoxBrokerAdapter(api_key="", api_secret="", access_token="")
    assert adapter_no_creds.has_credentials is False
    connected = await adapter_no_creds.connect()
    assert connected is False
    assert adapter_no_creds.is_connected is False
    assert adapter_no_creds.connection_state == "CONFIGURED"

    # 2. With credentials
    adapter_creds = UpstoxBrokerAdapter(access_token="mock_token_for_testing")
    assert adapter_creds.has_credentials is True
    connected = await adapter_creds.connect()
    assert connected is True
    assert adapter_creds.is_connected is True
    assert adapter_creds.connection_state == "LIVE"

    await adapter_creds.disconnect()
    assert adapter_creds.is_connected is False
    assert adapter_creds.connection_state == "FALLBACK_REFERENCE"


@pytest.mark.asyncio
async def test_upstox_tick_ingestion_and_cache():
    """Verifies tick parsing from Upstox raw feeds into normalized quotes."""
    adapter = UpstoxBrokerAdapter(access_token="mock_token")
    await adapter.connect()

    received_ticks = []

    def on_tick(symbol, ltp, day_change, day_change_pct, volume):
        received_ticks.append({
            "symbol": symbol,
            "ltp": ltp,
            "day_change": day_change,
            "day_change_pct": day_change_pct,
            "volume": volume
        })

    adapter.set_on_tick_callback(on_tick)

    # Ingest Upstox raw ticks
    adapter.ingest_upstox_tick("NSE_INDEX|Nifty 50", 24850.50, 150.25, 0.61, 5000000)
    adapter.ingest_upstox_tick("NSE_EQ|INE002A01018", 1350.00, 15.00, 1.12, 1200000)

    assert len(received_ticks) == 2
    assert received_ticks[0]["symbol"] == "^NSEI"
    assert received_ticks[0]["ltp"] == 24850.50
    assert received_ticks[1]["symbol"] == "RELIANCE.NS"
    assert received_ticks[1]["ltp"] == 1350.00

    # Snapshot check
    snapshot = await adapter.fetch_snapshot(["^NSEI", "RELIANCE.NS"])
    assert "^NSEI" in snapshot
    assert snapshot["^NSEI"]["price"] == 24850.50
    assert "RELIANCE.NS" in snapshot
    assert snapshot["RELIANCE.NS"]["price"] == 1350.00

    await adapter.disconnect()
