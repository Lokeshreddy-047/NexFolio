import pytest
from app.services.ipo_service import ipo_service
from app.schemas.ipo import IPOStatus, IPOMarketType, IPORiskVerdict


@pytest.mark.asyncio
async def test_get_all_ipos_and_filters():
    all_ipos = await ipo_service.get_all_ipos()
    assert len(all_ipos) >= 4
    
    # Filter by OPEN status
    open_ipos = await ipo_service.get_all_ipos(status=IPOStatus.OPEN)
    assert len(open_ipos) >= 1
    assert all(i.status == IPOStatus.OPEN for i in open_ipos)
    
    # Filter by SME market type
    sme_ipos = await ipo_service.get_all_ipos(market_type=IPOMarketType.SME)
    assert len(sme_ipos) >= 1
    assert all(i.market_type == IPOMarketType.SME for i in sme_ipos)


@pytest.mark.asyncio
async def test_ipo_ai_analysis_score_and_catalysts():
    ntpc = await ipo_service.get_ipo_by_id("ipo_ntpc_green")
    assert ntpc is not None
    assert ntpc.company_name == "NTPC Green Energy Limited"
    assert ntpc.ai_analysis.quality_score >= 70
    assert ntpc.ai_analysis.verdict in [IPORiskVerdict.STRONG_SUBSCRIBE, IPORiskVerdict.SUBSCRIBE_LONG_TERM]
    assert len(ntpc.ai_analysis.top_catalysts) >= 2
    assert ntpc.ai_analysis.estimated_allotment_odds_pct > 0
    assert ntpc.ai_analysis.estimated_profit_per_lot > 0


@pytest.mark.asyncio
async def test_ipo_overview_metrics_and_listed_performance():
    metrics = await ipo_service.get_overview_metrics()
    assert metrics.active_bidding_count >= 1
    assert metrics.total_capital_raised_cr > 0
    assert metrics.top_gmp_pct > 0
    
    listed = await ipo_service.get_listed_performance()
    assert len(listed) >= 3
    assert any(l.symbol == "WAAREE.NS" for l in listed)
