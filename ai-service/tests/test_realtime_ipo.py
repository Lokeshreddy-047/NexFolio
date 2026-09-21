"""Automated Unit & Integration Tests for Real-Time IPO Radar & AI Risk Intelligence."""

import pytest
from app.services.live_ipo_ingestion import live_ipo_aggregator
from app.services.ipo_service import ipo_service
from app.schemas.ipo import IPOStatus, IPOMarketType, IPORiskVerdict


@pytest.mark.asyncio
async def test_live_ipo_ingestion_structure():
    """Verify live IPO aggregator returns typed IPO items with valid schema fields."""
    ipos = await live_ipo_aggregator.get_live_ipos(force_refresh=True)
    assert len(ipos) >= 4

    for ipo in ipos:
        assert ipo.id is not None
        assert len(ipo.company_name) > 0
        assert ipo.status in [IPOStatus.OPEN, IPOStatus.UPCOMING, IPOStatus.CLOSED, IPOStatus.LISTED]
        assert ipo.market_type in [IPOMarketType.MAINBOARD, IPOMarketType.SME]
        assert ipo.price_band_high >= ipo.price_band_low
        assert ipo.lot_size > 0
        assert ipo.min_investment > 0
        assert ipo.total_issue_size_cr > 0
        assert ipo.ai_analysis.quality_score >= 0 and ipo.ai_analysis.quality_score <= 100
        assert ipo.ai_analysis.verdict in [
            IPORiskVerdict.STRONG_SUBSCRIBE,
            IPORiskVerdict.SUBSCRIBE_LONG_TERM,
            IPORiskVerdict.NEUTRAL,
            IPORiskVerdict.AVOID
        ]


@pytest.mark.asyncio
async def test_live_listed_performance_and_cmp():
    """Verify newly listed IPO cohort has valid prices and calculated gains."""
    listed = await live_ipo_aggregator.get_live_listed_performance(force_refresh=True)
    assert len(listed) >= 4

    for stock in listed:
        assert stock.issue_price > 0
        assert stock.current_price > 0
        expected_gain = round(((stock.current_price - stock.issue_price) / stock.issue_price) * 100.0, 2)
        assert abs(stock.gain_since_listing_pct - expected_gain) < 0.1
        assert stock.status in ["STRONG_OUTPERFORMER", "MODERATE_GAIN", "CONSOLIDATING", "BELOW_ISSUE_PRICE"]


@pytest.mark.asyncio
async def test_live_overview_metrics_calculation():
    """Verify top-level KPI metrics aggregate dynamically."""
    metrics = await live_ipo_aggregator.get_live_overview_metrics(force_refresh=True)
    assert metrics.active_bidding_count >= 1
    assert metrics.total_capital_raised_cr > 0
    assert metrics.average_listing_gain_pct != 0
    assert len(metrics.top_gmp_pick) > 0
    assert metrics.top_gmp_pct >= 0


@pytest.mark.asyncio
async def test_ipo_service_filtering():
    """Verify IPOService filters by status and market type accurately."""
    open_ipos = await ipo_service.get_all_ipos(status=IPOStatus.OPEN)
    for ipo in open_ipos:
        assert ipo.status == IPOStatus.OPEN

    sme_ipos = await ipo_service.get_all_ipos(market_type=IPOMarketType.SME)
    for ipo in sme_ipos:
        assert ipo.market_type == IPOMarketType.SME


@pytest.mark.asyncio
async def test_ipo_by_id_lookup():
    """Verify individual IPO detail lookup returns complete data."""
    ipo = await ipo_service.get_ipo_by_id("ipo_ntpc_green")
    assert ipo is not None
    assert ipo.symbol == "NTPCGREEN"
    assert len(ipo.peers) >= 1
    assert len(ipo.financials.historical_revenue) >= 1
