import pytest
import numpy as np

from app.schemas.stress_test import MonteCarloRequest, CrisisStressRequest
from app.services.stress_testing_service import (
    run_monte_carlo_simulation,
    run_crisis_stress_test,
    get_all_crisis_scenarios,
    CRISIS_CATALOG
)


@pytest.fixture
def sample_portfolio_doc():
    return {
        "_id": "6aac24531f14350ce51e51cc",
        "name": "Institutional Flagship Alpha",
        "user_id": "test-user-123"
    }


@pytest.fixture
def sample_holdings():
    return [
        {
            "_id": "h1",
            "portfolio_id": "6aac24531f14350ce51e51cc",
            "user_id": "test-user-123",
            "symbol": "RELIANCE.NS",
            "company_name": "Reliance Industries Ltd",
            "asset_type": "Equity",
            "sector": "Oil Gas & Consumable Fuels",
            "quantity": 100,
            "avg_buy_price": 1250.0,
            "current_price": 1316.0
        },
        {
            "_id": "h2",
            "portfolio_id": "6aac24531f14350ce51e51cc",
            "user_id": "test-user-123",
            "symbol": "HDFCBANK.NS",
            "company_name": "HDFC Bank Ltd",
            "asset_type": "Equity",
            "sector": "Financial Services",
            "quantity": 200,
            "avg_buy_price": 700.0,
            "current_price": 726.95
        },
        {
            "_id": "h3",
            "portfolio_id": "6aac24531f14350ce51e51cc",
            "user_id": "test-user-123",
            "symbol": "TCS.NS",
            "company_name": "Tata Consultancy Services Ltd",
            "asset_type": "Equity",
            "sector": "Information Technology",
            "quantity": 50,
            "avg_buy_price": 3400.0,
            "current_price": 3550.0
        }
    ]


def test_crisis_scenarios_catalog():
    scenarios = get_all_crisis_scenarios()
    assert len(scenarios) == 4
    scenario_ids = [s.id for s in scenarios]
    assert "covid_2020" in scenario_ids
    assert "lehman_2008" in scenario_ids
    assert "rate_hike_2022" in scenario_ids
    assert "demonetization_2016" in scenario_ids

    for s in scenarios:
        assert s.benchmark_shock_pct < 0
        assert s.recovery_months > 0
        assert len(s.vulnerable_sectors) > 0


def test_monte_carlo_simulation_invariants(sample_portfolio_doc, sample_holdings):
    req = MonteCarloRequest(iterations=5000, horizon_days=252)
    res = run_monte_carlo_simulation(sample_portfolio_doc, sample_holdings, req)

    assert res.portfolio_id == "6aac24531f14350ce51e51cc"
    assert res.initial_value > 0
    assert len(res.trajectories) > 10

    # Test percentile hierarchy invariant for every trajectory point: P5 <= P25 <= P50 <= P75 <= P95
    for pt in res.trajectories:
        assert pt.p5 <= pt.p25 <= pt.p50 <= pt.p75 <= pt.p95

    # Test VaR and CVaR tail risk mathematical invariants
    var = res.var_metrics
    assert var.var_99_pct >= var.var_95_pct
    assert var.cvar_95_pct >= var.var_95_pct
    assert var.cvar_99_pct >= var.var_99_pct
    assert var.cvar_99_pct >= var.cvar_95_pct

    # Currency amounts match percentages
    expected_var_95_amt = round(res.initial_value * (var.var_95_pct / 100.0), 2)
    assert abs(var.var_95_amount - expected_var_95_amt) <= 1.0

    # Probabilities bounded between 0% and 100%
    assert 0.0 <= var.prob_loss_pct <= 100.0
    assert 0.0 <= var.prob_drawdown_10_pct <= 100.0
    assert 0.0 <= var.prob_drawdown_20_pct <= 100.0
    assert 0.0 <= var.prob_drawdown_30_pct <= 100.0


def test_crisis_stress_replay_covid(sample_portfolio_doc, sample_holdings):
    req = CrisisStressRequest(scenario_id="covid_2020")
    res = run_crisis_stress_test(sample_portfolio_doc, sample_holdings, req)

    assert res.scenario_id == "covid_2020"
    assert res.projected_portfolio_loss_pct < 0
    assert res.projected_portfolio_loss_amount > 0
    assert res.projected_final_value < res.portfolio_initial_value
    assert len(res.sector_damage_breakdown) > 0
    assert res.stress_verdict in ["RESILIENT", "MODERATE_VULNERABILITY", "HIGH_VULNERABILITY", "CRITICAL_RISK"]
    assert len(res.hedging_recommendations) > 0
    assert res.estimated_recovery_months == 5


def test_custom_black_swan_stress(sample_portfolio_doc, sample_holdings):
    req = CrisisStressRequest(
        scenario_id="covid_2020",
        custom_market_shock_pct=-45.0,
        custom_volatility_multiplier=1.5
    )
    res = run_crisis_stress_test(sample_portfolio_doc, sample_holdings, req)

    assert res.benchmark_loss_pct == -45.0
    assert res.projected_portfolio_loss_pct < -30.0
    assert res.stress_verdict in ["HIGH_VULNERABILITY", "CRITICAL_RISK"]


def test_empty_portfolio_fallback(sample_portfolio_doc):
    req = MonteCarloRequest(iterations=1000, horizon_days=60)
    res = run_monte_carlo_simulation(sample_portfolio_doc, [], req)
    assert res.initial_value == 100000.0  # Synthetic fallback
    assert len(res.trajectories) > 5
    assert res.var_metrics.var_95_pct > 0

    c_req = CrisisStressRequest(scenario_id="lehman_2008")
    c_res = run_crisis_stress_test(sample_portfolio_doc, [], c_req)
    assert c_res.projected_portfolio_loss_pct < 0
    assert len(c_res.sector_damage_breakdown) > 0
