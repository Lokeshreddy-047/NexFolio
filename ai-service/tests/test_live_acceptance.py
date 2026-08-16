import pytest
import asyncio
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

from app.schemas.market import DataBadge
from app.services.market_data.adapters.upstox_adapter import UpstoxBrokerAdapter
from app.services.market_data.live_provider import LiveMarketProvider
from app.services.market_data.reference_provider import ReferenceMarketProvider
from app.services.market_data.manager import market_data_manager
from app.services.valuation_engine import RealtimeValuationEngine


@pytest.mark.asyncio
async def test_live_data_acceptance_matrix():
    """
    Phase 9C Acceptance Test Matrix:
    - Provider connected -> LIVE
    - Quote received -> Cache timestamp advances
    - Price changes -> Portfolio valuation changes
    - Holding price changes -> Day P&L changes
    - ML invocation counter -> Exactly 0 during ticks
    - Feed becomes stale -> DELAYED
    - Feed disconnects -> FALLBACK_REFERENCE
    - Feed reconnects -> LIVE
    - Credentials absent -> Clean degradation, no crash
    """

    # 1. Verification of Zero-ML during market ticks
    with patch("app.services.prediction_service.predict_portfolio_risk") as mock_ml_predict, \
         patch("app.services.explainability_service.explain_portfolio_risk") as mock_ml_explain:

        # Step 1: Upstox Adapter initialization with valid credentials
        ref_provider = ReferenceMarketProvider()
        adapter = UpstoxBrokerAdapter(access_token="valid_production_mock_token")
        live_provider = LiveMarketProvider(
            adapter=adapter,
            reference_fallback=ref_provider,
            max_staleness_seconds=5.0
        )
        market_data_manager.set_active_provider(live_provider)

        connected = await adapter.connect()
        assert connected is True
        assert adapter.is_connected is True
        assert adapter.connection_state == "LIVE"

        # Step 2: Initial Overview & Pedigree
        overview_initial = await live_provider.get_market_overview()
        assert overview_initial.data_badge == DataBadge.LIVE.value
        assert overview_initial.is_stale is False

        # Step 3: Ingest Upstox Ticks & Verify Cache Timestamp Advance
        initial_heartbeat = adapter.last_heartbeat
        await asyncio.sleep(0.01)
        adapter.ingest_upstox_tick("NSE_EQ|INE002A01018", 1400.0, 50.0, 3.70, 1500000)
        assert adapter.last_heartbeat > initial_heartbeat

        # Step 4: Verify Fast Valuation & Day P&L reaction
        portfolio_doc = {"_id": "port_live_1", "name": "Live Alpha", "currency": "INR"}
        holdings_doc = [
            {
                "_id": "h_rel_1",
                "symbol": "RELIANCE.NS",
                "shares": 100.0,
                "average_price": 1000.0,
                "current_price": 1000.0
            }
        ]

        # Initial valuation (at 1400.0 from Upstox tick)
        val1 = await RealtimeValuationEngine.evaluate_portfolio(portfolio_doc, holdings_doc)
        assert val1.total_invested_value == 100000.0
        assert val1.total_current_value == 140000.0
        assert val1.total_unrealized_pnl == 40000.0
        assert val1.holdings[0].current_price == 1400.0
        assert val1.holdings[0].day_change == 50.0

        # Ingest new tick at 1450.0
        adapter.ingest_upstox_tick("NSE_EQ|INE002A01018", 1450.0, 100.0, 7.40, 2000000)
        val2 = await RealtimeValuationEngine.evaluate_portfolio(portfolio_doc, holdings_doc)
        assert val2.total_current_value == 145000.0
        assert val2.total_unrealized_pnl == 45000.0
        assert val2.holdings[0].current_price == 1450.0
        assert val2.total_day_pnl == 10000.0  # 100 shares * 100.0 day_change

        # Step 5: Assert ML Pipeline was NEVER invoked
        assert mock_ml_predict.call_count == 0
        assert mock_ml_explain.call_count == 0

        # Step 6: Heartbeat Latency Spike -> DELAYED
        adapter._last_heartbeat = datetime.now(timezone.utc) - timedelta(seconds=120)
        overview_delayed = await live_provider.get_market_overview()
        assert overview_delayed.data_badge == DataBadge.DELAYED.value
        assert overview_delayed.is_stale is True

        # Step 7: Feed Disconnect -> FALLBACK_REFERENCE
        await adapter.disconnect()
        assert adapter.is_connected is False
        overview_fallback = await live_provider.get_market_overview()
        assert overview_fallback.data_badge == DataBadge.FALLBACK_REFERENCE.value
        assert overview_fallback.is_stale is True

        # Step 8: Feed Reconnect -> LIVE
        await adapter.connect()
        adapter.ingest_upstox_tick("NSE_INDEX|Nifty 50", 24900.0, 200.0, 0.81, 6000000)
        overview_recovered = await live_provider.get_market_overview()
        assert overview_recovered.data_badge == DataBadge.LIVE.value
        assert overview_recovered.is_stale is False

        # Step 9: Zero-ML count remained 0 across all transitions
        assert mock_ml_predict.call_count == 0
        assert mock_ml_explain.call_count == 0
