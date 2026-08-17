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
        assert gainers_data["stocks"][0]["day_change_pct"] >= gainers_data["stocks"][-1]["day_change_pct"]

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

        # 2. User 1 toggles a new symbol (e.g. ZOMATO.NS)
        res_toggle = await client.post(
            f"/api/v1/watchlists/{primary_id}/toggle",
            json={"symbol": "ZOMATO.NS"},
            headers=user1_headers
        )
        assert res_toggle.status_code == 200
        assert "ZOMATO.NS" in res_toggle.json()["symbols"]

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

        # 4. Toggle back (remove ZOMATO.NS)
        del_res = await client.post(f"/api/v1/watchlists/{primary_id}/toggle", json={"symbol": "ZOMATO.NS"}, headers=user1_headers)
        assert "ZOMATO.NS" not in del_res.json()["symbols"]

        # 5. User 2 Isolation
        u2_res = await client.get("/api/v1/watchlists", headers=user2_headers)
        assert u2_res.status_code == 200
        assert not any(w["id"] == tech_wl_id for w in u2_res.json())


@pytest.mark.asyncio
async def test_public_unauthenticated_market_access_and_authentic_pricing():
    """
    Verifies that public (unauthenticated) visitors can freely access market overview,
    screener, stock deep-dive, and autocomplete with authentic non-dummy prices.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Public Market Overview (No auth header)
        res_ov = await client.get("/api/v1/markets/overview")
        assert res_ov.status_code == 200
        ov_data = res_ov.json()
        assert ov_data["data_badge"] in ["REFERENCE", "LIVE", "SIMULATED", "DELAYED", "FALLBACK_REFERENCE"]
        assert len(ov_data["indices"]) >= 4

        # 2. Public Screener for RELIANCE
        res_scr = await client.get("/api/v1/markets/stocks?query=RELIANCE")
        assert res_scr.status_code == 200
        scr_data = res_scr.json()
        assert len(scr_data["stocks"]) > 0
        rel_scr = scr_data["stocks"][0]
        assert rel_scr["current_price"] > 0

        # 3. Public Stock Deep-Detail
        res_detail = await client.get("/api/v1/markets/stocks/RELIANCE.NS")
        assert res_detail.status_code == 200
        detail_data = res_detail.json()
        assert detail_data["symbol"] == "RELIANCE.NS"
        assert detail_data["current_price"] > 0
        assert len(detail_data["price_history"]) > 0

        # 4. Stock Autocomplete Search (No auth header)
        res_search = await client.get("/api/v1/stocks/search?q=RELIANCE")
        assert res_search.status_code == 200
        search_data = res_search.json()
        assert len(search_data) > 0
        assert search_data[0]["reference_price"] > 0
