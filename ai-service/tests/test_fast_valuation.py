import pytest
from app.services.valuation_engine import RealtimeValuationEngine
from app.services.market_data.manager import market_data_manager


@pytest.mark.asyncio
async def test_fast_loop_portfolio_valuation_math():
    portfolio_doc = {
        "_id": "port_test_realtime",
        "name": "Live Realtime Portfolio",
        "currency": "INR"
    }

    holdings_docs = [
        {
            "_id": "h_1",
            "symbol": "RELIANCE.NS",
            "quantity": 10.0,
            "avg_buy_price": 1200.0  # Invested: 12,000 INR
        },
        {
            "_id": "h_2",
            "symbol": "TCS.NS",
            "quantity": 5.0,
            "avg_buy_price": 3000.0  # Invested: 15,000 INR
        }
    ]

    # Evaluate portfolio in fast loop (< 5ms)
    valuation = await RealtimeValuationEngine.evaluate_portfolio(portfolio_doc, holdings_docs)

    assert valuation.portfolio_id == "port_test_realtime"
    assert valuation.holdings_count == 2
    assert valuation.total_invested_value == 27000.0  # 12000 + 15000
    assert valuation.total_current_value > 0
    assert len(valuation.holdings) == 2

    # Verify portfolio weights sum to 100%
    total_weights = sum(h.portfolio_weight for h in valuation.holdings)
    assert round(total_weights, 1) == 100.0

    # Verify individual holding values match exact math
    for h in valuation.holdings:
        assert h.current_value == round(h.quantity * h.current_price, 2)
        assert h.unrealized_pnl == round(h.current_value - h.invested_value, 2)
        assert h.day_pnl == round(h.quantity * h.day_change, 2)


@pytest.mark.asyncio
async def test_empty_portfolio_valuation():
    portfolio_doc = {"_id": "port_empty", "name": "Empty"}
    valuation = await RealtimeValuationEngine.evaluate_portfolio(portfolio_doc, [])
    assert valuation.total_invested_value == 0.0
    assert valuation.total_current_value == 0.0
    assert valuation.holdings_count == 0
