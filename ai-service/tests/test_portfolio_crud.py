import pytest
from fastapi.testclient import TestClient


def test_create_and_list_portfolios(client: TestClient, user1_headers):
    # Create portfolio for User 1
    create_res = client.post(
        "/api/v1/portfolios",
        json={"name": "Long Term Alpha", "description": "Core retirement holdings", "currency": "INR"},
        headers=user1_headers
    )
    assert create_res.status_code == 201
    port_data = create_res.json()
    assert port_data["name"] == "Long Term Alpha"
    port_id = port_data["id"]

    # List portfolios for User 1
    list_res = client.get("/api/v1/portfolios", headers=user1_headers)
    assert list_res.status_code == 200
    portfolios = list_res.json()
    assert any(p["id"] == port_id for p in portfolios)

    # Get details
    detail_res = client.get(f"/api/v1/portfolios/{port_id}", headers=user1_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == port_id

    # Update portfolio
    update_res = client.put(
        f"/api/v1/portfolios/{port_id}",
        json={"name": "Long Term Alpha (Updated)"},
        headers=user1_headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Long Term Alpha (Updated)"


def test_portfolio_user_isolation(client: TestClient, user1_headers, user2_headers):
    # User 1 creates portfolio
    create_res = client.post(
        "/api/v1/portfolios",
        json={"name": "Confidential Alpha Portfolio"},
        headers=user1_headers
    )
    assert create_res.status_code == 201
    alpha_port_id = create_res.json()["id"]

    # User 2 tries to access User 1's portfolio -> 404
    forbidden_get = client.get(f"/api/v1/portfolios/{alpha_port_id}", headers=user2_headers)
    assert forbidden_get.status_code == 404

    # User 2 tries to update User 1's portfolio -> 404
    forbidden_put = client.put(
        f"/api/v1/portfolios/{alpha_port_id}",
        json={"name": "Hacked Portfolio"},
        headers=user2_headers
    )
    assert forbidden_put.status_code == 404

    # User 2 tries to delete User 1's portfolio -> 404
    forbidden_delete = client.delete(f"/api/v1/portfolios/{alpha_port_id}", headers=user2_headers)
    assert forbidden_delete.status_code == 404

    # User 2's list does not include User 1's portfolio
    beta_list = client.get("/api/v1/portfolios", headers=user2_headers).json()
    assert not any(p["id"] == alpha_port_id for p in beta_list)


def test_portfolio_cascade_deletion(client: TestClient, user1_headers):
    # 1. Create a portfolio
    create_res = client.post(
        "/api/v1/portfolios",
        json={"name": "Cascade Test Portfolio", "currency": "INR"},
        headers=user1_headers
    )
    assert create_res.status_code == 201
    port_id = create_res.json()["id"]

    # 2. Add a holding
    hold_res = client.post(
        "/api/v1/holdings",
        json={
            "portfolio_id": port_id,
            "symbol": "TCS.NS",
            "quantity": 10,
            "buy_price": 3500.0
        },
        headers=user1_headers
    )
    assert hold_res.status_code == 201

    # 3. Add a transaction
    tx_res = client.post(
        "/api/v1/transactions",
        json={
            "portfolio_id": port_id,
            "symbol": "TCS.NS",
            "transaction_type": "BUY",
            "quantity": 5,
            "price": 3600.0
        },
        headers=user1_headers
    )
    assert tx_res.status_code in (200, 201)

    # 4. Take a snapshot
    snap_res = client.post(
        f"/api/v1/portfolios/{port_id}/snapshots",
        headers=user1_headers
    )
    assert snap_res.status_code in (200, 201)

    # 5. Delete the portfolio
    del_res = client.delete(f"/api/v1/portfolios/{port_id}", headers=user1_headers)
    assert del_res.status_code == 204

    # 6. Verify portfolio is deleted
    assert client.get(f"/api/v1/portfolios/{port_id}", headers=user1_headers).status_code == 404

    # 7. Verify holdings query on deleted portfolio returns 404 (or empty)
    holdings_res = client.get(f"/api/v1/holdings?portfolio_id={port_id}", headers=user1_headers)
    assert holdings_res.status_code == 404

    # 8. Verify transactions list returns empty
    tx_list = client.get(f"/api/v1/transactions?portfolio_id={port_id}", headers=user1_headers)
    assert tx_list.status_code == 200
    assert len(tx_list.json()) == 0

