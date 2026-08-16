import asyncio
import json
from httpx import AsyncClient, ASGITransport
from app.main import app

async def run_milestone4_audit():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = "mock_token_audit_investor"
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Create Portfolio
        p_res = await client.post(
            "/api/v1/portfolios",
            json={"name": "Growth & Income Portfolio", "currency": "INR"},
            headers=headers
        )
        port_id = p_res.json()["id"]
        print(f"[1] Created Portfolio: {port_id}")

        # 2. Add 4 Holdings across IT, Energy, Financials
        holdings = [
            {"symbol": "RELIANCE", "quantity": 25, "price": 2450.0},
            {"symbol": "TCS", "quantity": 15, "price": 3550.0},
            {"symbol": "HDFCBANK", "quantity": 40, "price": 1520.0},
            {"symbol": "INFY", "quantity": 20, "price": 1480.0}
        ]
        for h in holdings:
            await client.post(
                "/api/v1/transactions",
                json={
                    "portfolio_id": port_id,
                    "symbol": h["symbol"],
                    "transaction_type": "BUY",
                    "quantity": h["quantity"],
                    "price": h["price"],
                    "asset_type": "Equity"
                },
                headers=headers
            )
        print(f"[2] Added 4 Holdings via Transaction Ledger")

        # 3. Fetch Deep Intelligence
        intel_res = await client.get(f"/api/v1/portfolios/{port_id}/intelligence", headers=headers)
        intel = intel_res.json()
        print("\n=======================================================")
        print("          NEXFOLIO INTELLIGENCE AUDIT REPORT           ")
        print("=======================================================")
        prov = intel["provenance"]
        print(f"Model Name:              {prov['model_name']}")
        print(f"Model Version:           {prov['model_version']}")
        print(f"Dataset Version:         {prov['feature_dataset_version']}")
        print(f"Data Sufficiency Status: {prov['data_sufficiency_status']}")
        print(f"Predicted Risk Category: {intel['risk_category']} ({intel['confidence']*100:.1f}% Confidence)")
        print(f"Class Probabilities:     {intel['probabilities']}")

        hs = intel["health_scorecard"]
        print(f"\n--- 4-PILLAR HEALTH SCORECARD: {hs['overall_score']}/100 (Grade {hs['grade']}) ---")
        for pillar in hs["pillars"]:
            print(f"  • {pillar['name']:<28} Score: {pillar['score']}/{pillar['max_score']} [{pillar['rating']}] ({pillar['key_metric_label']}: {pillar['key_metric_value']})")

        print(f"\n--- EXPLAINABLE SHAP RISK DRIVERS ---")
        print(f"Risk Mitigators ({len(intel['risk_mitigators'])} factors):")
        for m in intel["risk_mitigators"]:
            print(f"  [+] {m['headline']} (SHAP: +{abs(m['impact_score']):.3f})")
            print(f"      Observed: {m['observed_value']} vs Baseline: {m['benchmark_baseline']}")
            print(f"      Effect: {m['contextual_effect']}")
        print(f"Risk Amplifiers ({len(intel['risk_amplifiers'])} factors):")
        for a in intel["risk_amplifiers"]:
            print(f"  [-] {a['headline']} (SHAP: -{abs(a['impact_score']):.3f})")
            print(f"      Observed: {a['observed_value']} vs Baseline: {a['benchmark_baseline']}")
            print(f"      Effect: {a['contextual_effect']}")

        print(f"\n--- TRACEABLE RECOMMENDATIONS ({len(intel['recommendations'])} items) ---")
        for rec in intel["recommendations"]:
            print(f"  #{rec['priority_rank']} [{rec['severity']}] {rec['title']}")
            print(f"     Trigger:  {rec['trigger_condition']}")
            print(f"     Affected: {', '.join(rec['affected_holdings'])}")
            print(f"     Action:   {rec['suggested_review_action']}")

        # 4. What-If Simulation
        sim_payload = {
            "simulated_allocations": {
                "equity_pct": 50,
                "etf_pct": 25,
                "debt_pct": 15,
                "gold_pct": 10,
                "crypto_pct": 0
            }
        }
        sim_res = await client.post(f"/api/v1/portfolios/{port_id}/simulate", json=sim_payload, headers=headers)
        sim = sim_res.json()
        print("\n=======================================================")
        print("         WHAT-IF REBALANCING SIMULATION AUDIT          ")
        print("=======================================================")
        print(f"Allocations Evaluated:   {sim['allocations_used']}")
        print(f"Baseline Health Score:   {sim['current_health_score']}/100")
        print(f"Simulated Health Score:  {sim['simulated_health_score']}/100 ({sim['score_delta']:+} pts)")
        print(f"Baseline Risk Category:  {sim['current_risk_category']}")
        print(f"Simulated Risk Category: {sim['simulated_risk_category']}")
        print(f"Risk Level Shifted:      {sim['risk_level_changed']}")
        print("\nQuantitative Metric Deltas:")
        for k, v in sim["metrics_comparison"].items():
            print(f"  • {k:<25} Current: {v['current_value']:<8} -> Simulated: {v['simulated_value']:<8} Delta: {v['delta']} [{v['direction']}]")

if __name__ == "__main__":
    asyncio.run(run_milestone4_audit())
