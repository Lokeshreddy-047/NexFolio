import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_market_overview_endpoint(user1_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/markets/overview", headers=user1_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["data_badge"] in ["REFERENCE", "LIVE", "SIMULATED", "DELAYED", "FALLBACK_REFERENCE"]
        assert "pulse" in data
        assert data["pulse"]["mood"] in ["BULLISH", "BEARISH", "NEUTRAL"]
        assert len(data["indices"]) >= 4
        assert len(data["top_gainers"]) > 0
        assert len(data["top_losers"]) > 0
        assert len(data["sector_performance"]) > 0


@pytest.mark.asyncio
async def test_market_screener_query_and_presets(user1_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Search Query
        res = await client.get("/api/v1/markets/stocks?query=RELIANCE", headers=user1_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["total_count"] >= 1
        assert any("RELIANCE" in s["symbol"] for s in data["stocks"])

        # 2. Preset TOP_GAINERS
        res_gainers = await client.get("/api/v1/markets/stocks?preset=TOP_GAINERS&limit=10", headers=user1_headers)
        assert res_gainers.status_code == 200
        gainers_data = res_gainers.json()
        assert len(gainers_data["stocks"]) > 0
        assert all(s["day_change_pct"] >= 0 for s in gainers_data["stocks"])

        # 3. Preset NEAR_52W_HIGH
        res_high = await client.get("/api/v1/markets/stocks?preset=NEAR_52W_HIGH&limit=10", headers=user1_headers)
        assert res_high.status_code == 200
        high_data = res_high.json()
        assert isinstance(high_data["stocks"], list)


@pytest.mark.asyncio
async def test_stock_detail_and_history(user1_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/markets/stocks/RELIANCE.NS", headers=user1_headers)
        assert res.status_code == 200
        data = res.json()
        assert data["symbol"] == "RELIANCE.NS"
        assert data["base_symbol"] == "RELIANCE"
        assert data["current_price"] > 0
        assert data["high_52w"] >= data["low_52w"]
        assert 0 <= data["position_in_52w_range_pct"] <= 100
        assert "price_history" in data
        assert "portfolio_exposure" in data


@pytest.mark.asyncio
async def test_watchlists_crud_and_user_isolation(user1_headers, user2_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. User 1 lists watchlists (should auto-provision Primary Watchlist)
        res1 = await client.get("/api/v1/watchlists", headers=user1_headers)
        assert res1.status_code == 200
        wls1 = res1.json()
        assert len(wls1) >= 1
        primary_id = wls1[0]["id"]
        assert wls1[0]["name"] == "Primary Watchlist"

        # 2. User 1 toggles a symbol (e.g. INFY.NS)
        res_toggle = await client.post(
            f"/api/v1/watchlists/{primary_id}/toggle",
            json={"symbol": "INFY.NS"},
            headers=user1_headers
        )
        assert res_toggle.status_code == 200

        # 3. User 1 creates custom watchlist
        res_create = await client.post(
            "/api/v1/watchlists",
            json={"name": "Tech Titans"},
            headers=user1_headers
        )
        assert res_create.status_code == 201
        created_wl = res_create.json()
        assert created_wl["name"] == "Tech Titans"
        tech_wl_id = created_wl["id"]

        # 4. User 2 cannot access or delete User 1's watchlist
        res_u2_del = await client.delete(f"/api/v1/watchlists/{tech_wl_id}", headers=user2_headers)
        assert res_u2_del.status_code == 404

        # 5. User 1 deletes their custom watchlist
        res_u1_del = await client.delete(f"/api/v1/watchlists/{tech_wl_id}", headers=user1_headers)
        assert res_u1_del.status_code == 204
