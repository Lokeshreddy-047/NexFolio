import asyncio
import httpx
from datetime import datetime, timezone
import jwt
from app.main import app

def generate_mock_jwt(uid: str, email: str, name: str) -> str:
    now = int(datetime.now(timezone.utc).timestamp())
    payload = {
        "iss": "https://securetoken.google.com/nexfolio-dev",
        "aud": "nexfolio-dev",
        "auth_time": now,
        "user_id": uid,
        "sub": uid,
        "iat": now,
        "exp": now + 3600,
        "email": email,
        "email_verified": True,
        "name": name,
        "firebase": {"identities": {"email": [email]}, "sign_in_provider": "google.com"},
    }
    return jwt.encode(payload, "secret-key", algorithm="HS256")

async def run_audit():
    print("\n=======================================================")
    print("      NEXFOLIO MILESTONE 5: MARKETS & WATCHLIST AUDIT  ")
    print("=======================================================")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        token = generate_mock_jwt("user_trader_77", "trader77@nexfolio.internal", "Trader 77")
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Market Overview & Pulse
        print("\n[1/5] Testing Market Overview & Pulse (/api/v1/markets/overview)...")
        res = await client.get("/api/v1/markets/overview", headers=headers)
        assert res.status_code == 200, f"Failed: {res.text}"
        data = res.json()
        print(f"  [OK] Data Pedigree: {data['data_badge']}")
        print(f"  [OK] Market Mood: {data['pulse']['mood']} ({data['pulse']['advances_count']} Advances vs {data['pulse']['declines_count']} Declines)")
        print(f"  [OK] Strongest Sector: {data['pulse']['strongest_sector']} (+{data['pulse']['strongest_sector_gain_pct']}%)")
        print(f"  [OK] Weakest Sector: {data['pulse']['weakest_sector']} ({data['pulse']['weakest_sector_loss_pct']}%)")
        print(f"  [OK] Benchmark Indices Tracked: {len(data['indices'])} ({[i['symbol'] for i in data['indices']]})")
        print(f"  [OK] Top Gainers: {[g['base_symbol'] + ' (+' + str(g['day_change_pct']) + '%)' for g in data['top_gainers'][:3]]}")
        print(f"  [OK] Top Losers: {[l['base_symbol'] + ' (' + str(l['day_change_pct']) + '%)' for l in data['top_losers'][:3]]}")

        # 2. Stock Screener Presets & Search
        print("\n[2/5] Testing 289+ NSE Stock Screener (/api/v1/markets/stocks)...")
        res_all = await client.get("/api/v1/markets/stocks?limit=10", headers=headers)
        assert res_all.status_code == 200
        all_data = res_all.json()
        print(f"  [OK] Total Universe Count: {all_data['total_count']} Stocks")

        res_search = await client.get("/api/v1/markets/stocks?query=TATA", headers=headers)
        assert res_search.status_code == 200
        search_data = res_search.json()
        print(f"  [OK] Query 'TATA' Results: {search_data['total_count']} matches ({[s['base_symbol'] for s in search_data['stocks'][:4]]})")

        res_high = await client.get("/api/v1/markets/stocks?preset=NEAR_52W_HIGH&limit=5", headers=headers)
        assert res_high.status_code == 200
        high_data = res_high.json()
        print(f"  [OK] Preset 'NEAR_52W_HIGH': {high_data['total_count']} stocks within 6% of 52W High")

        # 3. Stock Detail & Historical Price Trajectory
        print("\n[3/5] Testing Stock Deep Detail (/api/v1/markets/stocks/RELIANCE.NS)...")
        res_rel = await client.get("/api/v1/markets/stocks/RELIANCE.NS", headers=headers)
        assert res_rel.status_code == 200
        rel_data = res_rel.json()
        print(f"  [OK] Symbol: {rel_data['symbol']} ({rel_data['company_name']})")
        print(f"  [OK] Sector: {rel_data['sector']} | Asset Type: {rel_data['asset_type']}")
        print(f"  [OK] Current Price: INR {rel_data['current_price']} (Day Change: {rel_data['day_change_pct']}%)")
        print(f"  [OK] 52W Range: INR {rel_data['low_52w']} - INR {rel_data['high_52w']} (Placement: {rel_data['position_in_52w_range_pct']}%)")
        print(f"  [OK] Beta (vs NIFTY 50): {rel_data['beta']} | Annualized Vol: {rel_data['annualized_volatility']*100}%")
        print(f"  [OK] Price History Candles: {len(rel_data['price_history'])} daily observations")
        if rel_data['price_history']:
            last_pt = rel_data['price_history'][-1]
            print(f"    -> Latest Candle Date: {last_pt['date']} | Close: INR {last_pt['close']} | SMA-20: INR {last_pt['sma_20']} | SMA-50: INR {last_pt['sma_50']}")

        # 4. Multi-Tenant Watchlists CRUD
        print("\n[4/5] Testing Multi-Tenant Watchlists CRUD (/api/v1/watchlists)...")
        res_wl = await client.get("/api/v1/watchlists", headers=headers)
        assert res_wl.status_code == 200
        wls = res_wl.json()
        print(f"  [OK] Auto-provisioned Watchlists: {len(wls)} ('{wls[0]['name']}' with {len(wls[0]['symbols'])} symbols)")
        primary_id = wls[0]["id"]

        # Toggle Ticker
        res_toggle = await client.post(f"/api/v1/watchlists/{primary_id}/toggle", json={"symbol": "ZOMATO.NS"}, headers=headers)
        assert res_toggle.status_code == 200
        updated_wl = res_toggle.json()
        print(f"  [OK] Toggled 'ZOMATO.NS' in Primary Watchlist -> Total Symbols: {len(updated_wl['symbols'])}")

        # Create Custom Watchlist
        res_create = await client.post("/api/v1/watchlists", json={"name": "Momentum Growth"}, headers=headers)
        assert res_create.status_code == 201
        custom_wl = res_create.json()
        print(f"  [OK] Created Custom Watchlist: '{custom_wl['name']}' (ID: {custom_wl['id']})")

        # Delete Custom Watchlist
        res_del = await client.delete(f"/api/v1/watchlists/{custom_wl['id']}", headers=headers)
        assert res_del.status_code == 204
        print(f"  [OK] Deleted Custom Watchlist (HTTP 204 No Content)")

        # 5. Summary
        print("\n=======================================================")
        print("    ALL MILESTONE 5 AUDIT CHECKS PASSED PERFECTLY!     ")
        print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_audit())
