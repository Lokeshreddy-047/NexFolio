import pytest
from datetime import datetime, timezone, timedelta

from app.services.tax_service import (
    match_transactions_fifo,
    compute_capital_gains_schedule,
    resolve_tax_year_from_date,
    calculate_calendar_holding_period,
    generate_itr_schedule_csv,
    get_tax_rule_set
)
from app.schemas.tax import RealizedTradeLot, LegacyTaxLoss


def test_tax_year_and_law_resolution():
    # August 2026 (Income-tax Act, 2025)
    dt1 = datetime(2026, 8, 16, 12, 0, tzinfo=timezone.utc)
    assert resolve_tax_year_from_date(dt1) == "Tax Year 2026-27"

    # January 2027 (Income-tax Act, 2025)
    dt2 = datetime(2027, 1, 15, 12, 0, tzinfo=timezone.utc)
    assert resolve_tax_year_from_date(dt2) == "Tax Year 2026-27"

    # June 2025 (Income-tax Act, 1961)
    dt3 = datetime(2025, 6, 1, 10, 0, tzinfo=timezone.utc)
    assert resolve_tax_year_from_date(dt3) == "FY 2025-26"

    # February 2025 (Income-tax Act, 1961)
    dt4 = datetime(2025, 2, 1, 10, 0, tzinfo=timezone.utc)
    assert resolve_tax_year_from_date(dt4) == "FY 2024-25"


def test_calendar_holding_period_and_leap_year_handling():
    # Regular 12-month calendar delta: Buy Jan 10, 2026 -> Sell Jan 9, 2027 (Short Term)
    buy_1 = datetime(2026, 1, 10, tzinfo=timezone.utc)
    sell_st = datetime(2027, 1, 9, tzinfo=timezone.utc)
    m1, d1, is_lt1 = calculate_calendar_holding_period(buy_1, sell_st)
    assert is_lt1 is False
    assert m1 == 11

    # Buy Jan 10, 2026 -> Sell Jan 11, 2027 (Long Term > 12 calendar months)
    sell_lt = datetime(2027, 1, 11, tzinfo=timezone.utc)
    m2, d2, is_lt2 = calculate_calendar_holding_period(buy_1, sell_lt)
    assert is_lt2 is True
    assert m2 == 12

    # Leap year handling: Feb 29, 2024 -> March 1, 2025 (Long term)
    buy_leap = datetime(2024, 2, 29, tzinfo=timezone.utc)
    sell_leap = datetime(2025, 3, 1, tzinfo=timezone.utc)
    m3, d3, is_lt3 = calculate_calendar_holding_period(buy_leap, sell_leap)
    assert is_lt3 is True


def test_fifo_matching_with_buyback_promoter_rates():
    # Buy 100 shares @ ₹1000 on Jan 1, 2026
    # Normal Sell 40 shares @ ₹1500 on Aug 1, 2026
    # Corporate Buyback 30 shares @ ₹2000 on Sep 1, 2026 (Promoter Domestic Company -> 22% effective)
    raw_txs = [
        {
            "id": "tx1",
            "symbol": "RELIANCE.NS",
            "company_name": "Reliance Industries",
            "transaction_type": "BUY",
            "quantity": 100,
            "price": 1000.0,
            "transaction_date": datetime(2026, 1, 1, tzinfo=timezone.utc)
        },
        {
            "id": "tx2",
            "symbol": "RELIANCE.NS",
            "company_name": "Reliance Industries",
            "transaction_type": "SELL",
            "quantity": 40,
            "price": 1500.0,
            "transaction_date": datetime(2026, 8, 1, tzinfo=timezone.utc)
        },
        {
            "id": "tx3",
            "symbol": "RELIANCE.NS",
            "company_name": "Reliance Industries",
            "transaction_type": "BUYBACK",
            "quantity": 30,
            "price": 2000.0,
            "promoter_category": "PROMOTER_DOMESTIC_COMPANY",
            "transaction_date": datetime(2026, 9, 1, tzinfo=timezone.utc)
        }
    ]

    realized_lots, open_lots = match_transactions_fifo(raw_txs)
    assert len(realized_lots) == 2

    # Normal Sale lot
    assert realized_lots[0].quantity == 40
    assert realized_lots[0].realized_pnl == 20000.0  # 40 * 500
    assert realized_lots[0].classification == "STCG_111A"
    assert realized_lots[0].base_tax_rate == 0.20

    # Corporate Buyback lot
    assert realized_lots[1].quantity == 30
    assert realized_lots[1].is_buyback is True
    assert realized_lots[1].promoter_category == "PROMOTER_DOMESTIC_COMPANY"
    assert realized_lots[1].realized_pnl == 30000.0  # 30 * 1000
    assert realized_lots[1].classification == "BUYBACK_PROMOTER_DOMESTIC"
    assert realized_lots[1].base_tax_rate == 0.22

    # 30 shares remaining in open queue
    assert open_lots["RELIANCE.NS"][0]["quantity"] == 30


def test_section_112a_annual_threshold_and_cess():
    # LTCG Gain of ₹2,25,000 in Tax Year 2026-27 (Threshold ₹1,25,000)
    lot = RealizedTradeLot(
        lot_id="LOT_0001",
        transaction_id="tx_lt",
        symbol="TCS.NS",
        company_name="Tata Consultancy Services",
        buy_date=datetime(2025, 1, 1, tzinfo=timezone.utc),
        sell_date=datetime(2026, 6, 1, tzinfo=timezone.utc),
        holding_period_months=17,
        holding_period_days=516,
        quantity=100,
        buy_price=2000.0,
        sell_price=4250.0,
        cost_basis=200000.0,
        sale_proceeds=425000.0,
        realized_pnl=225000.0,
        realized_pnl_pct=112.5,
        classification="LTCG_112A",
        base_tax_rate=0.125
    )

    sched = compute_capital_gains_schedule(
        realized_lots=[lot],
        target_tax_year="Tax Year 2026-27"
    )

    assert sched.section_112a.gross_112a_gains == 225000.0
    assert sched.section_112a.threshold_consumed == 125000.0
    assert sched.section_112a.threshold_remaining == 0.0
    assert sched.section_112a.taxable_112a_ltcg == 100000.0
    # 12.5% of ₹1,00,000 = ₹12,500 Base Tax
    assert sched.section_112a.estimated_112a_base_tax == 12500.0
    assert sched.total_base_tax == 12500.0
    # 4% Cess on ₹12,500 = ₹500
    assert sched.cess_amount == 500.0
    # Total Tax = ₹12,500 + ₹500 = ₹13,000
    assert sched.total_estimated_tax_liability == 13000.0


def test_stcl_and_ltcl_multi_stage_setoff_sequence():
    # STCG: +₹50,000
    # STCL: -₹20,000
    # 112A LTCG: +₹2,00,000
    # LTCL: -₹50,000
    lot_stcg = RealizedTradeLot(
        lot_id="L1", transaction_id="t1", symbol="HDFC.NS", company_name="HDFC",
        buy_date=datetime(2026, 4, 1, tzinfo=timezone.utc), sell_date=datetime(2026, 7, 1, tzinfo=timezone.utc),
        holding_period_months=3, holding_period_days=91, quantity=10, buy_price=1000.0, sell_price=6000.0,
        cost_basis=10000.0, sale_proceeds=60000.0, realized_pnl=50000.0, realized_pnl_pct=500.0,
        classification="STCG_111A", base_tax_rate=0.20
    )
    lot_stcl = RealizedTradeLot(
        lot_id="L2", transaction_id="t2", symbol="ICICI.NS", company_name="ICICI",
        buy_date=datetime(2026, 4, 1, tzinfo=timezone.utc), sell_date=datetime(2026, 6, 1, tzinfo=timezone.utc),
        holding_period_months=2, holding_period_days=61, quantity=10, buy_price=3000.0, sell_price=1000.0,
        cost_basis=30000.0, sale_proceeds=10000.0, realized_pnl=-20000.0, realized_pnl_pct=-66.7,
        classification="STCL", base_tax_rate=0.0
    )
    lot_ltcg = RealizedTradeLot(
        lot_id="L3", transaction_id="t3", symbol="INFY.NS", company_name="Infosys",
        buy_date=datetime(2024, 1, 1, tzinfo=timezone.utc), sell_date=datetime(2026, 5, 1, tzinfo=timezone.utc),
        holding_period_months=28, holding_period_days=851, quantity=100, buy_price=1000.0, sell_price=3000.0,
        cost_basis=100000.0, sale_proceeds=300000.0, realized_pnl=200000.0, realized_pnl_pct=200.0,
        classification="LTCG_112A", base_tax_rate=0.125
    )
    lot_ltcl = RealizedTradeLot(
        lot_id="L4", transaction_id="t4", symbol="WIPRO.NS", company_name="Wipro",
        buy_date=datetime(2024, 1, 1, tzinfo=timezone.utc), sell_date=datetime(2026, 5, 1, tzinfo=timezone.utc),
        holding_period_months=28, holding_period_days=851, quantity=100, buy_price=1500.0, sell_price=1000.0,
        cost_basis=150000.0, sale_proceeds=100000.0, realized_pnl=-50000.0, realized_pnl_pct=-33.3,
        classification="LTCL", base_tax_rate=0.0
    )

    sched = compute_capital_gains_schedule(
        realized_lots=[lot_stcg, lot_stcl, lot_ltcg, lot_ltcl],
        target_tax_year="Tax Year 2026-27"
    )

    # Net STCG = ₹50,000 - ₹20,000 = ₹30,000 -> Tax @ 20% = ₹6,000
    assert sched.net_stcg == 30000.0
    assert sched.estimated_stcg_base_tax == 6000.0

    # Net 112A LTCG before exemption = ₹2,00,000 - ₹50,000 = ₹1,50,000
    assert sched.section_112a.net_112a_ltcg_before_exemption == 150000.0
    assert sched.section_112a.threshold_consumed == 125000.0
    assert sched.section_112a.taxable_112a_ltcg == 25000.0
    # 12.5% of ₹25,000 = ₹3,125
    assert sched.section_112a.estimated_112a_base_tax == 3125.0

    # Total Base Tax = ₹6,000 + ₹3,125 = ₹9,125
    assert sched.total_base_tax == 9125.0
    # 4% Cess = ₹365.0
    assert sched.cess_amount == 365.0
    # Total Tax = ₹9,125 + ₹365 = ₹9,490.0
    assert sched.total_estimated_tax_liability == 9490.0


def test_legacy_1961_act_loss_migration():
    # Pre-2026 Legacy Loss of ₹20,000 STCL migrated into IT Act 2025
    legacy_loss = LegacyTaxLoss(
        source_tax_year="FY 2024-25",
        source_law="Income-tax Act, 1961",
        loss_type="STCL",
        original_amount=20000.0,
        utilized_amount=0.0,
        remaining_amount=20000.0,
        expiry_tax_year="Tax Year 2032-33",
        migrated_to_act_2025=True
    )

    # Current STCG of ₹30,000
    lot_stcg = RealizedTradeLot(
        lot_id="L_LEG", transaction_id="t_leg", symbol="SBI.NS", company_name="State Bank of India",
        buy_date=datetime(2026, 4, 1, tzinfo=timezone.utc), sell_date=datetime(2026, 7, 1, tzinfo=timezone.utc),
        holding_period_months=3, holding_period_days=91, quantity=100, buy_price=500.0, sell_price=800.0,
        cost_basis=50000.0, sale_proceeds=80000.0, realized_pnl=30000.0, realized_pnl_pct=60.0,
        classification="STCG_111A", base_tax_rate=0.20
    )

    sched = compute_capital_gains_schedule(
        realized_lots=[lot_stcg],
        target_tax_year="Tax Year 2026-27",
        legacy_losses=[legacy_loss]
    )

    # ₹20,000 absorbed, remaining taxable STCG is ₹10,000
    assert sched.legacy_losses_absorbed == 20000.0
    assert sched.taxable_stcg == 10000.0
    assert sched.estimated_stcg_base_tax == 2000.0
    assert legacy_loss.utilized_amount == 20000.0
    assert legacy_loss.remaining_amount == 0.0


def test_endpoint_and_itr_csv_export(client, user1_headers, mock_db, monkeypatch):
    """
    Verifies the tax report endpoint and ITR schedule-compatible CSV download with ZERO ML invocations.
    """
    ml_invocations = 0

    def mock_predict(*args, **kwargs):
        nonlocal ml_invocations
        ml_invocations += 1
        return {"risk_category": "LOW"}

    monkeypatch.setattr("app.services.intelligence_service.predict_portfolio_risk", mock_predict)

    # 1. Create Portfolio
    port_res = client.post("/api/v1/portfolios", json={
        "name": "Tax Year 2026-27 Account",
        "description": "Institutional Tax Engine Test",
        "currency": "INR"
    }, headers=user1_headers)
    assert port_res.status_code == 201
    port_id = port_res.json()["id"]

    # 2. Record BUY transaction
    client.post("/api/v1/transactions", json={
        "portfolio_id": port_id,
        "symbol": "TCS.NS",
        "transaction_type": "BUY",
        "quantity": 10,
        "price": 5000.0,
        "asset_type": "Equity"
    }, headers=user1_headers)

    # 3. GET /tax-report
    res = client.get(f"/api/v1/portfolios/{port_id}/tax-report", headers=user1_headers)
    assert res.status_code == 200
    data = res.json()

    assert data["rule_set"]["law"] == "Income-tax Act, 2025"
    assert data["rule_set"]["tax_year"] == "Tax Year 2026-27"
    assert data["rule_set"]["equity_stcg_rate"] == 0.20
    assert data["rule_set"]["equity_ltcg_rate"] == 0.125
    assert data["rule_set"]["cess_rate"] == 0.04
    assert "tax_loss_bank" in data
    assert "section_112a" in data["capital_gains"]

    # 4. GET /tax-report/export-csv
    csv_res = client.get(f"/api/v1/portfolios/{port_id}/tax-report/export-csv", headers=user1_headers)
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Lot ID,Tax Year,Governing Law,Symbol" in csv_res.text

    # Zero ML Invocations Guarantee
    assert ml_invocations == 0, "Tax calculations must NEVER invoke ML prediction models"
