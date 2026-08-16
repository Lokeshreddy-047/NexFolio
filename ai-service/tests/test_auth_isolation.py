import pytest
from fastapi.testclient import TestClient


def test_public_health(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_public_risk_prediction(client: TestClient, sample_portfolio_payload):
    response = client.post(
        "/api/v1/predict-risk",
        json=sample_portfolio_payload["portfolio_data"]
    )
    assert response.status_code == 200
    data = response.json()
    assert "risk_category" in data
    assert data["risk_category"] in ["LOW", "MEDIUM", "HIGH"]
    assert "confidence" in data
    assert "probabilities" in data


def test_public_explain_risk(client: TestClient, sample_portfolio_payload):
    response = client.post(
        "/api/v1/explain-risk",
        json=sample_portfolio_payload["portfolio_data"]
    )
    assert response.status_code == 200
    data = response.json()
    assert "top_positive_contributors" in data
    assert "top_negative_contributors" in data


def test_unauthenticated_requests_fail(client: TestClient, sample_portfolio_payload):
    # 1. Profile requires auth
    res1 = client.get("/api/v1/auth/me")
    assert res1.status_code == 401

    # 2. Prediction history requires auth
    res2 = client.get("/api/v1/predictions")
    assert res2.status_code == 401

    # 3. Saving prediction requires auth
    res3 = client.post("/api/v1/predictions/save", json=sample_portfolio_payload)
    assert res3.status_code == 401


def test_invalid_token_rejected(client: TestClient):
    res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer totally_invalid_token_xyz"}
    )
    assert res.status_code == 401


def test_authenticated_profile(client: TestClient, user1_headers):
    response = client.get("/api/v1/auth/me", headers=user1_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["uid"] == "user_alpha"
    assert "user_alpha" in data["email"]


def test_user_data_isolation_between_accounts(
    client: TestClient,
    user1_headers,
    user2_headers,
    sample_portfolio_payload
):
    # User 1 (Alpha) saves a prediction
    save_res = client.post(
        "/api/v1/predictions/save",
        json=sample_portfolio_payload,
        headers=user1_headers
    )
    assert save_res.status_code == 200
    save_data = save_res.json()
    prediction_id = save_data.get("prediction_id")

    if prediction_id and prediction_id != "offline":
        # User 1 (Alpha) can access their own prediction details
        alpha_res = client.get(
            f"/api/v1/predictions/{prediction_id}",
            headers=user1_headers
        )
        assert alpha_res.status_code == 200
        assert alpha_res.json()["user_id"] == "user_alpha"

        # User 2 (Beta) MUST be rejected with 404 when trying to access Alpha's prediction
        beta_res = client.get(
            f"/api/v1/predictions/{prediction_id}",
            headers=user2_headers
        )
        assert beta_res.status_code == 404

        # In prediction history list, Alpha sees their item
        alpha_history = client.get("/api/v1/predictions", headers=user1_headers).json()
        assert any(item["prediction_id"] == prediction_id for item in alpha_history)

        # In prediction history list, Beta does NOT see Alpha's item
        beta_history = client.get("/api/v1/predictions", headers=user2_headers).json()
        assert not any(item["prediction_id"] == prediction_id for item in beta_history)
