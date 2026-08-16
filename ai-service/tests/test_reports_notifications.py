import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_investor_report_generation_and_snapshot(user1_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create a portfolio
        p_res = await client.post(
            "/api/v1/portfolios",
            json={"name": "Institutional Growth", "currency": "INR", "is_default": True},
            headers=user1_headers
        )
        assert p_res.status_code == 201
        port_id = p_res.json()["id"]

        # 2. Add holding via transaction
        t_res = await client.post(
            "/api/v1/transactions",
            json={
                "portfolio_id": port_id,
                "symbol": "RELIANCE.NS",
                "transaction_type": "BUY",
                "quantity": 50,
                "price": 1300.0
            },
            headers=user1_headers
        )
        assert t_res.status_code == 201

        # 3. Generate Investor Intelligence Report
        r_res = await client.get(f"/api/v1/portfolios/{port_id}/report", headers=user1_headers)
        assert r_res.status_code == 200
        report = r_res.json()
        assert report["portfolio_id"] == port_id
        assert report["report_integrity_hash"].startswith("NXF-")
        assert report["report_version"].startswith("v")
        assert report["summary"]["total_valuation"] > 0
        assert report["health_scorecard"]["overall_score"] > 0
        assert len(report["holdings"]) == 1
        assert report["holdings"][0]["base_symbol"] == "RELIANCE"

        report_id = report["id"]

        # 4. Fetch historical report by ID
        r_snap = await client.get(f"/api/v1/reports/{report_id}", headers=user1_headers)
        assert r_snap.status_code == 200
        assert r_snap.json()["report_integrity_hash"] == report["report_integrity_hash"]

        # 5. List historical reports
        h_list = await client.get(f"/api/v1/portfolios/{port_id}/reports", headers=user1_headers)
        assert h_list.status_code == 200
        assert len(h_list.json()) >= 1


@pytest.mark.asyncio
async def test_notifications_lifecycle(user1_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Fetch initial notifications
        n_res = await client.get("/api/v1/notifications", headers=user1_headers)
        assert n_res.status_code == 200
        notes_data = n_res.json()
        assert "unread_count" in notes_data
        assert isinstance(notes_data["notifications"], list)

        # 2. Mark all as read
        m_res = await client.post("/api/v1/notifications/read-all", headers=user1_headers)
        assert m_res.status_code == 200


@pytest.mark.asyncio
async def test_audit_logs_retrieval(user1_headers):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        a_res = await client.get("/api/v1/audit-logs", headers=user1_headers)
        assert a_res.status_code == 200
        logs = a_res.json()
        assert "total_count" in logs
        assert isinstance(logs["events"], list)
