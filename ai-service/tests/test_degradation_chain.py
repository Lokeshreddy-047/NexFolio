import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from app.schemas.market import DataBadge
from app.services.market_data.reference_provider import ReferenceMarketProvider
from app.services.market_data.live_provider import LiveMarketProvider
from app.services.market_data.adapters.simulated_adapter import SimulatedLiveFeedAdapter
from app.services.market_data.adapters.live_broker_adapter import LiveBrokerAdapter


@pytest.mark.asyncio
async def test_full_market_data_degradation_chain():
    """
    Tests the complete explicit degradation and recovery state machine:
    1. Reference Provider -> REFERENCE
    2. Simulated Adapter -> SIMULATED
    3. Healthy Live Broker -> LIVE
    4. Broker Latency Spike -> DELAYED
    5. Broker Disconnect -> FALLBACK_REFERENCE
    6. Broker Reconnect -> LIVE
    And verifies ZERO ML inference calls occur during market feed operations.
    """

    # Mock ML models to ensure they are NEVER called during tick and market feed processing
    with patch("app.services.prediction_service.predict_portfolio_risk") as mock_ml_predict, \
         patch("app.services.explainability_service.explain_portfolio_risk") as mock_ml_explain:

        # Step 1: Reference Provider -> REFERENCE
        ref_provider = ReferenceMarketProvider()
        overview_ref = await ref_provider.get_market_overview()
        assert overview_ref.data_badge == DataBadge.REFERENCE.value

        # Step 2: Simulated Adapter -> SIMULATED
        sim_adapter = SimulatedLiveFeedAdapter(reference_provider=ref_provider)
        await sim_adapter.connect()
        sim_provider = LiveMarketProvider(adapter=sim_adapter, reference_fallback=ref_provider)
        overview_sim = await sim_provider.get_market_overview()
        assert overview_sim.data_badge == DataBadge.SIMULATED.value
        await sim_adapter.disconnect()

        # Step 3: Healthy Live Broker -> LIVE
        broker_adapter = LiveBrokerAdapter(broker_name="nse_prod_broker")
        await broker_adapter.connect()
        live_provider = LiveMarketProvider(
            adapter=broker_adapter,
            reference_fallback=ref_provider,
            max_staleness_seconds=10.0
        )
        # Update tick to ensure fresh heartbeat
        broker_adapter.ingest_broker_tick("RELIANCE.NS", 1350.0, 15.0, 1.1, 800000)

        overview_live = await live_provider.get_market_overview()
        assert overview_live.data_badge == DataBadge.LIVE.value
        assert overview_live.is_stale is False

        # Step 4: Broker Latency Spike -> DELAYED
        broker_adapter._last_heartbeat = datetime.now(timezone.utc) - timedelta(seconds=120)
        overview_delayed = await live_provider.get_market_overview()
        assert overview_delayed.data_badge == DataBadge.DELAYED.value
        assert overview_delayed.is_stale is True

        # Step 5: Broker Disconnect -> FALLBACK_REFERENCE
        await broker_adapter.disconnect()
        overview_fallback = await live_provider.get_market_overview()
        assert overview_fallback.data_badge == DataBadge.FALLBACK_REFERENCE.value
        assert overview_fallback.fallback_reason is not None

        # Step 6: Broker Reconnect -> LIVE
        await broker_adapter.connect()
        broker_adapter.ingest_broker_tick("RELIANCE.NS", 1352.0, 17.0, 1.25, 850000)
        overview_recovered = await live_provider.get_market_overview()
        assert overview_recovered.data_badge == DataBadge.LIVE.value
        assert overview_recovered.is_stale is False

        # Step 7: Verify zero ML engine calls occurred throughout all feed state transitions!
        assert mock_ml_predict.call_count == 0
        assert mock_ml_explain.call_count == 0
