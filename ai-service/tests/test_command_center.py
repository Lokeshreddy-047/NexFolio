import pytest


def test_command_center_consolidated_overview(client, user1_headers):
    # 1. Create a test portfolio
    create_res = client.post(
        "/api/v1/portfolios",
        json={"name": "Alpha Growth Portfolio", "currency": "INR"},
        headers=user1_headers
    )
    assert create_res.status_code == 201
    port_id = create_res.json()["id"]

    # 2. Add two stock holdings (TCS and RELIANCE)
    h1 = client.post(
        "/api/v1/holdings",
        json={
            "portfolio_id": port_id,
            "symbol": "TCS",
            "quantity": 10,
            "buy_price": 3500.0,
            "current_price": 3800.0
        },
        headers=user1_headers
    )
    assert h1.status_code == 201

    h2 = client.post(
        "/api/v1/holdings",
        json={
            "portfolio_id": port_id,
            "symbol": "RELIANCE",
            "quantity": 20,
            "buy_price": 2400.0,
            "current_price": 2600.0
        },
        headers=user1_headers
    )
    assert h2.status_code == 201

    # 3. Call consolidated Command Center endpoint
    cc_res = client.get(f"/api/v1/portfolios/{port_id}/command-center", headers=user1_headers)
    assert cc_res.status_code == 200
    data = cc_res.json()

    # Verify Pulse Metrics
    assert "pulse" in data
    pulse = data["pulse"]
    assert pulse["total_value"] == (10 * 3800.0) + (20 * 2600.0)  # 38000 + 52000 = 90000
    assert pulse["invested_capital"] == (10 * 3500.0) + (20 * 2400.0)  # 35000 + 48000 = 83000
    assert pulse["total_pnl"] == 90000 - 83000  # 7000
    assert pulse["data_badge"] == "REFERENCE"

    # Verify Top Movers
    assert "top_movers" in data
    assert "gainers" in data["top_movers"]

    # Verify Concentration Intelligence
    assert "concentration" in data
    conc = data["concentration"]
    assert conc["largest_holding_symbol"] in ["TCS", "TCS.NS", "RELIANCE", "RELIANCE.NS"]
    assert conc["top_5_concentration_pct"] == 100.0  # Since only 2 holdings

    # Verify Health Indicators
    assert "health" in data
    health = data["health"]
    assert 0 <= health["health_score"] <= 100
    assert health["risk_category"] in ["LOW", "MODERATE", "HIGH"]

    # Verify Allocations & Holdings
    assert len(data["asset_allocation"]) > 0
    assert len(data["sector_allocation"]) > 0
    assert len(data["holdings"]) == 2


def test_timeline_performance_and_snapshot_checkpoint(client, user1_headers):
    # 1. Create portfolio
    create_res = client.post(
        "/api/v1/portfolios",
        json={"name": "Timeline Test Portfolio"},
        headers=user1_headers
    )
    port_id = create_res.json()["id"]

    # 2. Add holding
    client.post(
        "/api/v1/holdings",
        json={
            "portfolio_id": port_id,
            "symbol": "INFY",
            "quantity": 100,
            "buy_price": 1400.0,
            "current_price": 1550.0
        },
        headers=user1_headers
    )

    # 3. Create an explicit snapshot checkpoint (force_new=True)
    snap_res = client.post(f"/api/v1/portfolios/{port_id}/snapshots", headers=user1_headers)
    assert snap_res.status_code == 201
    snap_data = snap_res.json()
    assert snap_data["total_value"] == 155000.0
    assert snap_data["invested_capital"] == 140000.0

    # 4. Check timeline performance endpoint
    perf_res = client.get(f"/api/v1/portfolios/{port_id}/performance?range=ALL", headers=user1_headers)
    assert perf_res.status_code == 200
    perf_data = perf_res.json()
    assert perf_data["portfolio_id"] == port_id
    assert perf_data["data_badge"] == "REFERENCE"
    # Should have initial created_at snapshot + explicit snapshot checkpoint (>= 2 snapshots)
    assert perf_data["has_sufficient_history"] is True
    assert len(perf_data["data_points"]) >= 2


def test_transaction_to_valuation_consistency(client, user1_headers):
    # 1. Create portfolio
    create_res = client.post(
        "/api/v1/portfolios",
        json={"name": "Transaction Consistency Portfolio"},
        headers=user1_headers
    )
    port_id = create_res.json()["id"]

    # 2. Record BUY transaction
    tx_res = client.post(
        "/api/v1/transactions",
        json={
            "portfolio_id": port_id,
            "symbol": "HDFCBANK",
            "transaction_type": "BUY",
            "quantity": 50,
            "price": 1600.0
        },
        headers=user1_headers
    )
    assert tx_res.status_code == 201

    # 3. Verify Command Center has the holding and reflects the BUY transaction
    cc_res = client.get(f"/api/v1/portfolios/{port_id}/command-center", headers=user1_headers)
    assert cc_res.status_code == 200
    cc_data = cc_res.json()
    assert cc_data["pulse"]["invested_capital"] == 50 * 1600.0
    assert len(cc_data["recent_activity"]) == 1
    assert cc_data["recent_activity"][0]["symbol"] in ["HDFCBANK", "HDFCBANK.NS"]
