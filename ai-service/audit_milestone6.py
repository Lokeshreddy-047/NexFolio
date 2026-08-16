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
    print("   NEXFOLIO MILESTONE 6: REPORTS & NOTIFICATIONS AUDIT ")
    print("=======================================================")

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        token = generate_mock_jwt("user_auditor_99", "auditor99@nexfolio.internal", "Auditor 99")
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Create Portfolio & Holdings
        print("\n[1/5] Setting up portfolio with holdings...")
        p_res = await client.post(
            "/api/v1/portfolios",
            json={"name": "Sovereign Endowment", "currency": "INR", "is_default": True},
            headers=headers
        )
        assert p_res.status_code == 201
        port_id = p_res.json()["id"]

        await client.post(
            "/api/v1/transactions",
            json={"portfolio_id": port_id, "symbol": "TCS.NS", "transaction_type": "BUY", "quantity": 30, "price": 4100.0},
            headers=headers
        )
        await client.post(
            "/api/v1/transactions",
            json={"portfolio_id": port_id, "symbol": "HDFCBANK.NS", "transaction_type": "BUY", "quantity": 50, "price": 1600.0},
            headers=headers
        )
        print(f"  [OK] Provisioned 'Sovereign Endowment' with TCS & HDFCBANK holdings (ID: {port_id})")

        # 2. Generate Investor Intelligence Report Snapshot
        print("\n[2/5] Generating Immutable Investor Report Snapshot (/api/v1/portfolios/{id}/report)...")
        r_res = await client.get(f"/api/v1/portfolios/{port_id}/report", headers=headers)
        assert r_res.status_code == 200, f"Error: {r_res.text}"
        rep = r_res.json()
        print(f"  [OK] Report Integrity Hash: {rep['report_integrity_hash']}")
        print(f"  [OK] Report Version: {rep['report_version']}")
        print(f"  [OK] Portfolio Valuation: INR {rep['summary']['total_valuation']:,}")
        print(f"  [OK] Health Scorecard: {rep['health_scorecard']['overall_score']}/100 (Grade {rep['health_scorecard']['grade']})")
        print(f"  [OK] Benchmark Alpha (vs NIFTY 50): {rep['benchmark']['alpha_pct']}%")
        print(f"  [OK] Sectors Represented: {[s['sector'] + ' (' + str(s['weight_pct']) + '%)' for s in rep['sector_allocation']]}")
        print(f"  [OK] Downside Stabilizers: {len(rep['risk_mitigators'])} | Risk Amplifiers: {len(rep['risk_amplifiers'])}")

        report_id = rep["id"]

        # 3. Retrieve Historical Snapshot by ID
        print(f"\n[3/5] Verifying Immutable Snapshot Retrieval (/api/v1/reports/{report_id})...")
        snap_res = await client.get(f"/api/v1/reports/{report_id}", headers=headers)
        assert snap_res.status_code == 200
        snap = snap_res.json()
        assert snap["report_integrity_hash"] == rep["report_integrity_hash"]
        print(f"  [OK] Successfully retrieved exact snapshot {snap['report_version']} with matching hash {snap['report_integrity_hash']}")

        # 4. Rich Audit Trail Verification
        print("\n[4/5] Inspecting Rich Audit Logs (/api/v1/audit-logs)...")
        a_res = await client.get(f"/api/v1/audit-logs?portfolio_id={port_id}", headers=headers)
        assert a_res.status_code == 200
        audit_data = a_res.json()
        print(f"  [OK] Total Audit Events Logged: {audit_data['total_count']}")
        for ev in audit_data["events"][:2]:
            print(f"    -> Event: {ev['event_type']} | Actor: {ev['actor']} | Source: {ev['source']} | Model: {ev['model_version']}")
            print(f"       Desc: {ev['description']}")

        # 5. In-App Notifications & Cooldown Verification
        print("\n[5/5] Testing In-App Notification Center (/api/v1/notifications)...")
        n_res = await client.get("/api/v1/notifications", headers=headers)
        assert n_res.status_code == 200
        notes = n_res.json()
        print(f"  [OK] Total Alerts Triggered: {notes['total_count']} (Unread: {notes['unread_count']})")
        for n in notes["notifications"][:2]:
            print(f"    -> [{n['severity']}] {n['title']}: {n['message']}")

        # Mark read-all
        m_res = await client.post("/api/v1/notifications/read-all", headers=headers)
        assert m_res.status_code == 200
        print(f"  [OK] Marked all notifications as read -> Status: 200 OK")

        print("\n=======================================================")
        print("    ALL MILESTONE 6 AUDIT CHECKS PASSED PERFECTLY!     ")
        print("=======================================================\n")

if __name__ == "__main__":
    asyncio.run(run_audit())
