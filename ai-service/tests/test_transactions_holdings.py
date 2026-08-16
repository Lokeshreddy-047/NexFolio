import pytest
from fastapi.testclient import TestClient


def test_stock_search(client: TestClient):
    res = client.get("/api/v1/stocks/search?q=TCS")
    assert res.status_code == 200
    results = res.json()
    assert len(results) > 0
    assert any("TCS" in s["symbol"] for s in results)
    assert results[0]["sector"] == "Information Technology"


def test_buy_sell_transactions_and_holdings_math(client: TestClient, user1_headers):
    # 1. Create a fresh test portfolio
    port_res = client.post(
        "/api/v1/portfolios",
        json={"name": "Transaction Math Test Portfolio"},
        headers=user1_headers
    )
    assert port_res.status_code == 201
    port_id = port_res.json()["id"]

    # 2. Record BUY 1: 10 shares of RELIANCE.NS at 2000 INR
    buy1 = client.post(
        "/api/v1/transactions",
        json={
            "portfolio_id": port_id,
            "symbol": "RELIANCE.NS",
            "transaction_type": "BUY",
            "quantity": 10,
            "price": 2000.0,
            "asset_type": "Equity"
        },
        headers=user1_headers
    )
    assert buy1.status_code == 201
    assert buy1.json()["total_amount"] == 20000.0

    # Verify holding created
    holdings_1 = client.get(f"/api/v1/holdings?portfolio_id={port_id}", headers=user1_headers).json()
    assert len(holdings_1) == 1
    rel_holding = holdings_1[0]
    assert rel_holding["quantity"] == 10.0
    assert rel_holding["avg_buy_price"] == 2000.0
    assert rel_holding["invested_value"] == 20000.0

    # 3. Record BUY 2: 10 more shares of RELIANCE.NS at 3000 INR
    # Expected weighted average: (10*2000 + 10*3000)/20 = 2500 INR
    buy2 = client.post(
        "/api/v1/transactions",
        json={
            "portfolio_id": port_id,
            "symbol": "RELIANCE.NS",
            "transaction_type": "BUY",
            "quantity": 10,
            "price": 3000.0,
            "asset_type": "Equity"
        },
        headers=user1_headers
    )
    assert buy2.status_code == 201

    holdings_2 = client.get(f"/api/v1/holdings?portfolio_id={port_id}", headers=user1_headers).json()
    assert len(holdings_2) == 1
    assert holdings_2[0]["quantity"] == 20.0
    assert holdings_2[0]["avg_buy_price"] == 2500.0
    assert holdings_2[0]["invested_value"] == 50000.0

    # 4. Add another holding: TCS (10 shares at 3500)
    client.post(
        "/api/v1/holdings",
        json={
            "portfolio_id": port_id,
            "symbol": "TCS.NS",
            "quantity": 10,
            "buy_price": 3500.0,
            "asset_type": "Equity"
        },
        headers=user1_headers
    )

    # 5. Check real-time portfolio analytics
    analytics_res = client.get(f"/api/v1/portfolios/{port_id}/analytics", headers=user1_headers)
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert "risk_category" in analytics_data
    assert analytics_data["risk_category"] in ["LOW", "MEDIUM", "HIGH"]
    assert "confidence" in analytics_data
    assert "portfolio_health_score" in analytics_data
    assert 0 <= analytics_data["portfolio_health_score"] <= 100
    assert len(analytics_data["recommendations"]) > 0

    # 6. Record SELL: Sell 5 shares of RELIANCE at 2800 INR
    # Realized P&L = (2800 - 2500) * 5 = +1500 INR
    sell_res = client.post(
        "/api/v1/transactions",
        json={
            "portfolio_id": port_id,
            "symbol": "RELIANCE.NS",
            "transaction_type": "SELL",
            "quantity": 5,
            "price": 2800.0
        },
        headers=user1_headers
    )
    assert sell_res.status_code == 201

    # Check remaining quantity: 20 - 5 = 15
    holdings_3 = client.get(f"/api/v1/holdings?portfolio_id={port_id}", headers=user1_headers).json()
    rel_post_sell = next(h for h in holdings_3 if "RELIANCE" in h["symbol"])
    assert rel_post_sell["quantity"] == 15.0
    assert rel_post_sell["avg_buy_price"] == 2500.0

    # Check transaction ledger
    tx_list = client.get(f"/api/v1/transactions?portfolio_id={port_id}", headers=user1_headers).json()
    assert len(tx_list) == 3
