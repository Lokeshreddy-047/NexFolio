import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_security_headers_and_request_id(user1_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Check security headers and request ID on health endpoint
        res = await client.get("/api/v1/health")
        assert res.status_code == 200
        assert "X-Request-ID" in res.headers
        assert res.headers["X-Content-Type-Options"] == "nosniff"
        assert res.headers["X-Frame-Options"] == "DENY"

        # Check rate limit headers on standard API route
        api_res = await client.get("/api/v1/markets/overview", headers=user1_headers)
        assert api_res.status_code == 200
        assert "X-RateLimit-Limit" in api_res.headers
        assert "X-RateLimit-Remaining" in api_res.headers


@pytest.mark.asyncio
async def test_readiness_probe(user1_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/health/ready")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ("READY", "NOT_READY")
        assert "database" in data["checks"]
        assert "ml_model" in data["checks"]
        assert "market_data" in data["checks"]


@pytest.mark.asyncio
async def test_standardized_error_envelope():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. 404 Not Found error test
        res = await client.get("/api/v1/unknown-endpoint-404")
        assert res.status_code == 404
        data = res.json()
        assert "error" in data
        assert data["error"]["code"] == "NOT_FOUND"
        assert "request_id" in data["error"]

        # 2. 422 Validation error test
        bad_res = await client.post("/api/v1/portfolios", json={"invalid_field": 123}, headers={"Authorization": "Bearer mock_token_user_alpha"})
        assert bad_res.status_code == 422
        bad_data = bad_res.json()
        assert bad_data["error"]["code"] == "VALIDATION_ERROR"
        assert "details" in bad_data["error"]


@pytest.mark.asyncio
async def test_rate_limiting_enforcement():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        test_headers = {"Authorization": "Bearer mock_token_rate_tester"}
        # Send 10 rapid requests to test rate limit tracking
        responses = []
        for _ in range(10):
            r = await client.get("/api/v1/markets/overview", headers=test_headers)
            responses.append(r)

        # Check remaining counter decreases from limit of 300
        last_resp = responses[-1]
        assert "X-RateLimit-Remaining" in last_resp.headers
        remaining = int(last_resp.headers["X-RateLimit-Remaining"])
        assert remaining <= 290
        assert int(last_resp.headers["X-RateLimit-Limit"]) == 300
