import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

USER_A_TOKEN = "mock_token_user_a"
USER_B_TOKEN = "mock_token_user_b"


@pytest.mark.asyncio
async def test_portfolio_intelligence_with_holdings(mock_db):
    """
    Verifies that deep AI intelligence returns model provenance,
    human-readable SHAP drivers, 4-pillar health scorecard, and traceable recommendations.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a portfolio
        port_res = await client.post(
            "/api/v1/portfolios",
            json={"name": "Intelligence Test Portfolio", "currency": "INR"},
            headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
        )
        assert port_res.status_code == 201
        port_id = port_res.json()["id"]

        # 2. Add holdings via BUY transactions across multiple sectors
        await client.post(
            "/api/v1/transactions",
            json={
                "portfolio_id": port_id,
                "symbol": "RELIANCE",
                "transaction_type": "BUY",
                "quantity": 20,
                "price": 2400.0,
                "asset_type": "Equity"
            },
            headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
        )
        await client.post(
            "/api/v1/transactions",
            json={
                "portfolio_id": port_id,
                "symbol": "TCS",
                "transaction_type": "BUY",
                "quantity": 10,
                "price": 3400.0,
                "asset_type": "Equity"
            },
            headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
        )
        await client.post(
            "/api/v1/transactions",
            json={
                "portfolio_id": port_id,
                "symbol": "HDFCBANK",
                "transaction_type": "BUY",
                "quantity": 30,
                "price": 1500.0,
                "asset_type": "Equity"
            },
            headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
        )

        # 3. Query Deep Intelligence
        intel_res = await client.get(
            f"/api/v1/portfolios/{port_id}/intelligence",
            headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
        )
        assert intel_res.status_code == 200
        data = intel_res.json()

        # Model Provenance Checks
        assert data["provenance"]["model_name"] == "XGBoost Multiclass Portfolio Risk Classifier"
        assert data["provenance"]["data_sufficiency_status"] == "READY"
        assert "v1.2.0" in data["provenance"]["model_version"]

        # Risk Classification Checks
        assert data["risk_category"] in ["LOW", "MODERATE", "HIGH"]
        assert 0.0 <= data["confidence"] <= 1.0
        assert "LOW" in data["probabilities"]

        # 4-Pillar Health Scorecard Checks
        scorecard = data["health_scorecard"]
        assert 0 <= scorecard["overall_score"] <= 100
        assert scorecard["grade"] in ["A+", "A", "B", "C", "D"]
        assert len(scorecard["pillars"]) == 4
        assert {p["name"] for p in scorecard["pillars"]} == {
            "Diversification & Breadth",
            "Volatility & Beta Control",
            "Risk-Adjusted Efficiency",
            "Drawdown Resilience"
        }

        # Explainable SHAP Drivers
        assert len(data["risk_mitigators"]) > 0 or len(data["risk_amplifiers"]) > 0
        for driver in data["risk_mitigators"]:
            assert driver["direction"] == "RISK_MITIGATOR"
            assert driver["headline"] is not None
            assert driver["narrative"] is not None

        # Traceable Recommendations
        assert isinstance(data["recommendations"], list)
        for rec in data["recommendations"]:
            assert rec["priority_rank"] >= 1
            assert rec["trigger_condition"] is not None
            assert rec["suggested_review_action"] is not None


@pytest.mark.asyncio
async def test_portfolio_intelligence_empty_holdings(mock_db):
    """
    Verifies that a portfolio with 0 holdings passes through data sufficiency gate.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        port_res = await client.post(
            "/api/v1/portfolios",
            json={"name": "Empty Portfolio", "currency": "INR"},
            headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
        )
        port_id = port_res.json()["id"]

        intel_res = await client.get(
            f"/api/v1/portfolios/{port_id}/intelligence",
            headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
        )
        assert intel_res.status_code == 200
        data = intel_res.json()
        assert data["provenance"]["data_sufficiency_status"] == "INSUFFICIENT_HISTORY"
        assert data["health_scorecard"]["overall_score"] == 50


@pytest.mark.asyncio
async def test_what_if_simulation_sandbox_isolation(mock_db):
    """
    Verifies What-If simulation calculations and confirms ZERO database mutations.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        port_res = await client.post(
            "/api/v1/portfolios",
            json={"name": "Simulation Test Portfolio", "currency": "INR"},
            headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
        )
        port_id = port_res.json()["id"]

        # Add 1 holding via BUY transaction
        await client.post(
            "/api/v1/transactions",
            json={
                "portfolio_id": port_id,
                "symbol": "RELIANCE",
                "transaction_type": "BUY",
                "quantity": 10,
                "price": 2500.0,
                "asset_type": "Equity"
            },
            headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
        )

        # Run What-If Simulation
        sim_payload = {
            "simulated_allocations": {
                "equity_pct": 50,
                "etf_pct": 20,
                "debt_pct": 15,
                "gold_pct": 15,
                "crypto_pct": 0
            }
        }
        sim_res = await client.post(
            f"/api/v1/portfolios/{port_id}/simulate",
            json=sim_payload,
            headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
        )
        assert sim_res.status_code == 200
        sim_data = sim_res.json()

        assert sim_data["validation_status"] == "VALID"
        assert sim_data["simulated_health_score"] >= 0
        assert "metrics_comparison" in sim_data
        assert "annualized_volatility" in sim_data["metrics_comparison"]
        assert "sharpe_ratio" in sim_data["metrics_comparison"]

        # Confirm holdings count in DB is STILL exactly 1 (Zero database mutations!)
        holdings_res = await client.get(
            f"/api/v1/holdings?portfolio_id={port_id}",
            headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
        )
        assert len(holdings_res.json()) == 1


@pytest.mark.asyncio
async def test_intelligence_user_isolation(mock_db):
    """
    Verifies that User B cannot access User A's portfolio intelligence or simulate it.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        port_res = await client.post(
            "/api/v1/portfolios",
            json={"name": "User A Private Portfolio", "currency": "INR"},
            headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
        )
        port_id = port_res.json()["id"]

        # User B attempts to access intelligence
        unauth_intel = await client.get(
            f"/api/v1/portfolios/{port_id}/intelligence",
            headers={"Authorization": f"Bearer {USER_B_TOKEN}"}
        )
        assert unauth_intel.status_code == 404

        # User B attempts to run simulation
        unauth_sim = await client.post(
            f"/api/v1/portfolios/{port_id}/simulate",
            json={"simulated_allocations": {"equity_pct": 100}},
            headers={"Authorization": f"Bearer {USER_B_TOKEN}"}
        )
        assert unauth_sim.status_code == 404


def test_all_36_features_populated_at_inference():
    """
    FIX-11: Verifies that derive_institutional_features populates every single feature
    expected by the XGBoost risk model metadata (no missing 0.0 defaults).
    """
    from app.services.portfolio_analytics_service import derive_institutional_features
    from app.schemas.holding import HoldingResponse
    from app.services.model_loader import get_feature_metadata

    metadata = get_feature_metadata()
    feature_names = metadata["feature_names"]
    assert len(feature_names) == 36

    mock_holdings = [
        HoldingResponse(
            id="h1",
            portfolio_id="p1",
            user_id="u1",
            symbol="INFY",
            company_name="Infosys",
            asset_type="Equity",
            sector="Information Technology",
            quantity=10,
            avg_buy_price=1400.0,
            current_price=1500.0,
            invested_value=14000.0,
            current_value=15000.0,
            unrealized_pnl=1000.0,
            unrealized_pnl_pct=7.14,
            weight=50.0
        ),
        HoldingResponse(
            id="h2",
            portfolio_id="p1",
            user_id="u1",
            symbol="HDFCBANK",
            company_name="HDFC Bank",
            asset_type="Equity",
            sector="Financial Services",
            quantity=20,
            avg_buy_price=1450.0,
            current_price=1500.0,
            invested_value=29000.0,
            current_value=30000.0,
            unrealized_pnl=1000.0,
            unrealized_pnl_pct=3.45,
            weight=50.0
        )
    ]

    features = derive_institutional_features(mock_holdings, total_invested=43000.0, total_current_value=45000.0)

    for feat in feature_names:
        assert feat in features, f"Feature {feat} missing from derive_institutional_features output"
        assert features[feat] is not None
        assert isinstance(features[feat], (int, float))

    # Check sector proportions populated
    assert features["sector_information_technology_pct"] > 0.0
    assert features["sector_financial_services_pct"] > 0.0
    assert features["trading_days"] == 252


def test_risk_vocabulary_moderate_mapping():
    """
    FIX-12: Verifies that prediction_service returns MODERATE instead of MEDIUM
    so that frontend badges and risk categorizations match properly.
    """
    from app.services.prediction_service import RISK_MAPPING, predict_portfolio_risk
    assert RISK_MAPPING[1] == "MODERATE"

    test_input = {"annualized_volatility": 0.20, "portfolio_beta": 1.0, "trading_days": 252}
    pred = predict_portfolio_risk(test_input)
    assert pred["risk_category"] in ["LOW", "MODERATE", "HIGH"]
    assert "MODERATE" in pred["probabilities"]
    assert "MEDIUM" not in pred["probabilities"]


@pytest.mark.asyncio
async def test_intelligence_cache_invalidation_on_composition_change(mock_db):
    """
    FIX-13: Verifies that intelligence cache key incorporates holding signatures
    and invalidates immediately when a holding quantity changes.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        port_res = await client.post(
            "/api/v1/portfolios",
            json={"name": "Cache Test Portfolio", "currency": "INR"},
            headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
        )
        port_id = port_res.json()["id"]

        # Add initial holding
        await client.post(
            "/api/v1/transactions",
            json={
                "portfolio_id": port_id,
                "symbol": "TCS",
                "transaction_type": "BUY",
                "quantity": 10,
                "price": 3000.0,
                "asset_type": "Equity"
            },
            headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
        )

        res1 = await client.get(
            f"/api/v1/portfolios/{port_id}/intelligence",
            headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
        )
        assert res1.status_code == 200
        val1 = res1.json()["ai_decision_timeline"][-1]["portfolio_value"]

        # Buy more of same stock (composition change, but same holding count = 1)
        await client.post(
            "/api/v1/transactions",
            json={
                "portfolio_id": port_id,
                "symbol": "TCS",
                "transaction_type": "BUY",
                "quantity": 20,
                "price": 3000.0,
                "asset_type": "Equity"
            },
            headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
        )

        res2 = await client.get(
            f"/api/v1/portfolios/{port_id}/intelligence",
            headers={"Authorization": f"Bearer {USER_A_TOKEN}"}
        )
        assert res2.status_code == 200
        val2 = res2.json()["ai_decision_timeline"][-1]["portfolio_value"]
        # Value must reflect the updated quantity (30 shares instead of 10)
        assert val2 > val1

