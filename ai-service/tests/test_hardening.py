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


@pytest.mark.asyncio
async def test_cors_scoped_vercel_origins():
    """
    Verifies that CORS correctly allows verified NexFolio Vercel subdomains
    while rejecting rogue/arbitrary Vercel deployments and unauthorized origins.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Legitimate production Vercel app
        res_prod = await client.options(
            "/api/v1/health",
            headers={
                "Origin": "https://nexfolio.vercel.app",
                "Access-Control-Request-Method": "GET"
            }
        )
        assert res_prod.status_code == 200
        assert res_prod.headers.get("access-control-allow-origin") == "https://nexfolio.vercel.app"

        # 2. Legitimate branch preview Vercel app
        res_preview = await client.options(
            "/api/v1/health",
            headers={
                "Origin": "https://nexfolio-eta.vercel.app",
                "Access-Control-Request-Method": "GET"
            }
        )
        assert res_preview.status_code == 200
        assert res_preview.headers.get("access-control-allow-origin") == "https://nexfolio-eta.vercel.app"

        # 3. Rogue third-party Vercel app (MUST BE REJECTED)
        res_rogue = await client.options(
            "/api/v1/health",
            headers={
                "Origin": "https://malicious-attacker.vercel.app",
                "Access-Control-Request-Method": "GET"
            }
        )
        assert res_rogue.headers.get("access-control-allow-origin") != "https://malicious-attacker.vercel.app"
        assert res_rogue.headers.get("access-control-allow-origin") != "*"

        # 4. Completely unauthorized external origin (MUST BE REJECTED)
        res_evil = await client.options(
            "/api/v1/health",
            headers={
                "Origin": "https://evil-attacker.com",
                "Access-Control-Request-Method": "GET"
            }
        )
        assert res_evil.headers.get("access-control-allow-origin") != "https://evil-attacker.com"
        assert res_evil.headers.get("access-control-allow-origin") != "*"


@pytest.mark.asyncio
async def test_trusted_proxy_and_spoofed_forwarded_for_extraction():
    """
    Verifies that X-Forwarded-For is only trusted from authorized reverse proxies,
    and cannot be spoofed by untrusted direct connections to evade rate limits.
    """
    from starlette.requests import Request
    from app.middleware.rate_limit import SlidingWindowRateLimiter
    from app.config.settings import settings

    limiter = SlidingWindowRateLimiter(app=None)

    # 1. Untrusted client IP with spoofed X-Forwarded-For
    scope_untrusted = {
        "type": "http",
        "client": ("203.0.113.195", 12345),
        "headers": [(b"x-forwarded-for", b"198.51.100.1")]
    }
    req_untrusted = Request(scope_untrusted)
    client_key_untrusted = limiter._get_client_key(req_untrusted)
    # Must use actual client IP 203.0.113.195, NOT the spoofed 198.51.100.1
    assert client_key_untrusted == "ip:203.0.113.195"

    # 2. Trusted proxy (e.g. 127.0.0.1) forwarding legitimate client IP
    scope_trusted = {
        "type": "http",
        "client": ("127.0.0.1", 80),
        "headers": [(b"x-forwarded-for", b"198.51.100.1, 10.0.0.1")]
    }
    req_trusted = Request(scope_trusted)
    client_key_trusted = limiter._get_client_key(req_trusted)
    # Extracts the first IP in the chain from trusted reverse proxy
    assert client_key_trusted == "ip:198.51.100.1"
