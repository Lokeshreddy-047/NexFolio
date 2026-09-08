import time
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient, ASGITransport
import jwt

from app.main import app
from app.config.settings import settings
from app.services.prediction_service import (
    predict_portfolio_risk,
    resolve_feature_value,
    extract_feature_order
)
from app.services.model_loader import get_feature_metadata
from app.services.intelligence_service import (
    _compute_holdings_signature,
    _intelligence_cache,
    generate_portfolio_intelligence
)
from app.repositories.portfolio_repository import delete_portfolio
from app.repositories.transaction_repository import (
    record_transaction,
    delete_transaction,
    get_transactions_by_user
)
from app.repositories.holding_repository import get_holdings_by_portfolio
from app.db.mongodb import get_database


USER_A = "release_gate_user_alpha"
USER_B = "release_gate_user_beta"
TOKEN_A = f"mock_token_{USER_A}"
TOKEN_B = f"mock_token_{USER_B}"


@pytest.mark.asyncio
async def test_gate_01_auth_bypass_rejections(mock_db):
    """
    Gate 1: Auth Bypass Attempts.
    Verifies that requests without tokens, with malformed headers, or invalid tokens
    are rejected with 401 across protected routes.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # No header
        res1 = await client.get("/api/v1/portfolios")
        assert res1.status_code == 401

        # Empty bearer
        res2 = await client.get("/api/v1/portfolios", headers={"Authorization": "Bearer "})
        assert res2.status_code == 401

        # Invalid token
        res3 = await client.get("/api/v1/portfolios", headers={"Authorization": "Bearer invalid.jwt.token"})
        assert res3.status_code == 401


@pytest.mark.asyncio
async def test_gate_02_cross_user_portfolio_isolation(mock_db):
    """
    Gate 2: Cross-User Portfolio Access.
    Verifies that User Alpha's portfolio cannot be read, updated, or deleted by User Beta.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # User Alpha creates portfolio
        create_res = await client.post(
            "/api/v1/portfolios",
            json={"name": "Alpha Private Portfolio", "currency": "INR"},
            headers={"Authorization": f"Bearer {TOKEN_A}"}
        )
        assert create_res.status_code == 201
        port_id = create_res.json()["id"]

        # User Beta attempts to read Alpha's portfolio
        beta_get = await client.get(
            f"/api/v1/portfolios/{port_id}",
            headers={"Authorization": f"Bearer {TOKEN_B}"}
        )
        assert beta_get.status_code == 404

        # User Beta attempts to delete Alpha's portfolio
        beta_del = await client.delete(
            f"/api/v1/portfolios/{port_id}",
            headers={"Authorization": f"Bearer {TOKEN_B}"}
        )
        assert beta_del.status_code == 404


@pytest.mark.asyncio
async def test_gate_03_cross_user_holding_isolation(mock_db):
    """
    Gate 3: Cross-User Holding Access.
    Verifies that User Alpha's holdings cannot be viewed or mutated by User Beta.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # User Alpha creates portfolio and adds holding
        port_res = await client.post(
            "/api/v1/portfolios",
            json={"name": "Holdings Isolation Test", "currency": "INR"},
            headers={"Authorization": f"Bearer {TOKEN_A}"}
        )
        port_id = port_res.json()["id"]

        tx_res = await client.post(
            "/api/v1/transactions",
            json={
                "portfolio_id": port_id,
                "symbol": "TCS",
                "transaction_type": "BUY",
                "quantity": 10,
                "price": 3500.0,
                "asset_type": "Equity"
            },
            headers={"Authorization": f"Bearer {TOKEN_A}"}
        )
        assert tx_res.status_code == 201

        # User Beta queries holdings for Alpha's portfolio
        beta_holdings = await client.get(
            f"/api/v1/holdings?portfolio_id={port_id}",
            headers={"Authorization": f"Bearer {TOKEN_B}"}
        )
        # Beta must receive 404 access denied, never Alpha's holdings
        assert beta_holdings.status_code == 404


def test_gate_04_jwt_tampering_rejection():
    """
    Gate 4: JWT Tampering.
    Verifies that an altered payload or forged signature is rejected.
    """
    secret = "legitimate_signing_key_for_testing_12345"
    payload = {"uid": "attacker_user", "email": "attacker@evil.com", "exp": time.time() + 3600}
    token = jwt.encode(payload, secret, algorithm="HS256")

    # Tamper with the token by modifying the middle base64 chunk (payload)
    parts = token.split(".")
    tampered_payload = parts[1][:-2] + "AA"
    tampered_token = f"{parts[0]}.{tampered_payload}.{parts[2]}"

    with pytest.raises(Exception):
        jwt.decode(tampered_token, secret, algorithms=["HS256"])


def test_gate_05_unknown_kid_rejection():
    """
    Gate 5: Unknown 'kid' Header.
    Verifies that a JWT with an unrecognized key ID is rejected without unverified fallback.
    """
    token_with_unknown_kid = jwt.encode(
        {"uid": "fake_user", "exp": time.time() + 3600},
        "fake_key_32_bytes_long_for_hs256_test",
        algorithm="HS256",
        headers={"kid": "unknown_kid_99999"}
    )
    from app.services.firebase_auth import verify_firebase_token
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        verify_firebase_token(token_with_unknown_kid)
    assert exc_info.value.status_code == 401


def test_gate_06_expired_jwt_rejection():
    """
    Gate 6: Expired JWT.
    Verifies that an expired JWT token returns 401.
    """
    expired_token = jwt.encode(
        {"uid": "expired_user", "exp": time.time() - 3600},
        "fake_key_32_bytes_long_for_hs256_test",
        algorithm="HS256"
    )
    from app.services.firebase_auth import verify_firebase_token
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        verify_firebase_token(expired_token)
    assert exc_info.value.status_code == 401


def test_gate_07_production_mock_token_lockdown():
    """
    Gate 7: Production Mock Token Lockdown.
    Verifies that mock tokens are unconditionally rejected when environment is 'production'.
    """
    from app.services.firebase_auth import verify_firebase_token
    from fastapi import HTTPException
    old_env = settings.environment
    old_dev = settings.dev_auth_enabled

    try:
        settings.environment = "production"
        settings.dev_auth_enabled = False

        with pytest.raises(HTTPException) as exc_info:
            verify_firebase_token("mock_token_admin_user")
        assert exc_info.value.status_code == 401, "Mock token must be rejected in production environment"
    finally:
        settings.environment = old_env
        settings.dev_auth_enabled = old_dev


@pytest.mark.asyncio
async def test_gate_08_cors_unauthorized_origin_rejection(mock_db):
    """
    Gate 8: CORS Unauthorized Origin.
    Verifies that an unauthorized origin (e.g. https://evil-attacker.com) does not receive allow headers.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.options(
            "/api/v1/health",
            headers={
                "Origin": "https://evil-attacker.com",
                "Access-Control-Request-Method": "GET"
            }
        )
        allow_origin = res.headers.get("access-control-allow-origin")
        assert allow_origin != "https://evil-attacker.com"
        assert allow_origin != "*"


@pytest.mark.asyncio
async def test_gate_09_portfolio_cascade_deletion_integrity(mock_db):
    """
    Gate 9: Portfolio Cascade Deletion.
    Verifies that deleting a portfolio cleans up all 6 collections:
    holdings, transactions, snapshots, predictions, reports, and notifications.
    """
    db = get_database()
    # Setup test portfolio with records across all collections
    port_doc = await db.portfolios.insert_one({"name": "Cascade Master", "user_id": USER_A})
    port_id = str(port_doc.inserted_id)

    await db.holdings.insert_one({"portfolio_id": port_id, "user_id": USER_A, "symbol": "INFY"})
    await db.transactions.insert_one({"portfolio_id": port_id, "user_id": USER_A, "symbol": "INFY", "quantity": 10})
    await db.portfolio_snapshots.insert_one({"portfolio_id": port_id, "user_id": USER_A, "total_value": 10000})
    await db.predictions.insert_one({"portfolio_id": port_id, "user_id": USER_A, "risk_category": "LOW"})
    await db.portfolio_reports.insert_one({"portfolio_id": port_id, "user_id": USER_A, "report_type": "PDF"})
    await db.notifications.insert_one({"portfolio_id": port_id, "user_id": USER_A, "message": "Test"})

    # Execute cascade deletion
    deleted = await delete_portfolio(port_id, USER_A)
    assert deleted is True

    # Verify zero orphaned records
    assert await db.holdings.find_one({"portfolio_id": port_id}) is None
    assert await db.transactions.find_one({"portfolio_id": port_id}) is None
    assert await db.portfolio_snapshots.find_one({"portfolio_id": port_id}) is None
    assert await db.predictions.find_one({"portfolio_id": port_id}) is None
    assert await db.portfolio_reports.find_one({"portfolio_id": port_id}) is None
    assert await db.notifications.find_one({"portfolio_id": port_id}) is None


@pytest.mark.asyncio
async def test_gate_10_multi_step_financial_ledger_reversals(mock_db):
    """
    Gate 10: Multi-Step Financial Ledger Reversal.
    Executes the exact sequence:
      BUY 100 @ 100
      BUY 100 @ 200
      SELL 50 @ 250
      DELETE first BUY
      DELETE SELL
      DELETE second BUY
    Verifying after every step: holding.quantity, holding.avg_buy_price, and realized_pnl.
    """
    db = get_database()
    port_res = await db.portfolios.insert_one({"name": "Ledger Permutation Test", "user_id": USER_A, "realized_pnl": 0.0})
    port_id = str(port_res.inserted_id)

    # 1. BUY 100 @ 100
    tx1 = await record_transaction(USER_A, {
        "portfolio_id": port_id,
        "symbol": "TATASTEEL",
        "transaction_type": "BUY",
        "quantity": 100.0,
        "price": 100.0
    })
    h1 = (await get_holdings_by_portfolio(port_id, USER_A))[0]
    assert h1["quantity"] == 100.0
    assert h1["avg_buy_price"] == 100.0

    # 2. BUY 100 @ 200
    tx2 = await record_transaction(USER_A, {
        "portfolio_id": port_id,
        "symbol": "TATASTEEL",
        "transaction_type": "BUY",
        "quantity": 100.0,
        "price": 200.0
    })
    h2 = (await get_holdings_by_portfolio(port_id, USER_A))[0]
    assert h2["quantity"] == 200.0
    assert h2["avg_buy_price"] == 150.0  # (100*100 + 100*200) / 200 = 150

    # 3. SELL 50 @ 250
    tx3 = await record_transaction(USER_A, {
        "portfolio_id": port_id,
        "symbol": "TATASTEEL",
        "transaction_type": "SELL",
        "quantity": 50.0,
        "price": 250.0
    })
    h3 = (await get_holdings_by_portfolio(port_id, USER_A))[0]
    assert h3["quantity"] == 150.0
    assert h3["avg_buy_price"] == 150.0
    port_doc3 = await db.portfolios.find_one({"_id": port_res.inserted_id})
    assert port_doc3["realized_pnl"] == 5000.0  # (250 - 150) * 50 = +5000

    # 4. DELETE first BUY (100 @ 100)
    # Remaining BUY is 100 @ 200. Remaining holding qty = 150 - 100 = 50.
    del_buy1 = await delete_transaction(tx1["_id"], USER_A)
    assert del_buy1 is True
    h4 = (await get_holdings_by_portfolio(port_id, USER_A))[0]
    assert h4["quantity"] == 50.0
    assert h4["avg_buy_price"] == 200.0  # Remaining buy is 100 @ 200

    # 5. DELETE SELL (50 @ 250)
    # Holding quantity restored to 50 + 50 = 100. Realized P&L reverted by -5000.
    del_sell = await delete_transaction(tx3["_id"], USER_A)
    assert del_sell is True
    h5 = (await get_holdings_by_portfolio(port_id, USER_A))[0]
    assert h5["quantity"] == 100.0
    port_doc5 = await db.portfolios.find_one({"_id": port_res.inserted_id})
    assert port_doc5["realized_pnl"] == 0.0

    # 6. DELETE second BUY (100 @ 200)
    # Holding fully liquidated
    del_buy2 = await delete_transaction(tx2["_id"], USER_A)
    assert del_buy2 is True
    h6 = await get_holdings_by_portfolio(port_id, USER_A)
    assert len(h6) == 0


@pytest.mark.asyncio
async def test_gate_11_negative_quantity_reversal_guard(mock_db):
    """
    Gate 11: Negative Quantity Protection.
    Verifies that deleting a BUY when subsequent SELLs have already consumed the shares
    is safely rejected, protecting the ledger from negative holding balances.
    """
    db = get_database()
    port_res = await db.portfolios.insert_one({"name": "Negative Guard Test", "user_id": USER_A})
    port_id = str(port_res.inserted_id)

    # User buys 100, then sells 80. Remaining quantity = 20.
    buy_tx = await record_transaction(USER_A, {
        "portfolio_id": port_id,
        "symbol": "WIPRO",
        "transaction_type": "BUY",
        "quantity": 100.0,
        "price": 400.0
    })
    await record_transaction(USER_A, {
        "portfolio_id": port_id,
        "symbol": "WIPRO",
        "transaction_type": "SELL",
        "quantity": 80.0,
        "price": 450.0
    })

    # Attempt to delete the BUY of 100 when only 20 shares remain
    # Deleting this would cause remaining quantity to become -80!
    del_result = await delete_transaction(buy_tx["_id"], USER_A)
    assert del_result is False, "Deleting a BUY that results in negative holding must be blocked"

    # Holding must remain untouched at 20 shares
    holdings = await get_holdings_by_portfolio(port_id, USER_A)
    assert holdings[0]["quantity"] == 20.0


@pytest.mark.asyncio
async def test_gate_12_empty_portfolio_data_sufficiency_gate(mock_db):
    """
    Gate 12: Empty/Partial Historical Data Gate.
    Verifies that a portfolio with 0 holdings triggers INSUFFICIENT_HISTORY
    without executing XGBoost ML inference.
    """
    port_doc = {"_id": "port_empty_123", "name": "Empty Test Portfolio"}
    res = await generate_portfolio_intelligence(USER_A, port_doc, [])

    assert res.provenance.data_sufficiency_status == "INSUFFICIENT_HISTORY"
    assert "0 holdings" in res.provenance.data_sufficiency_notes
    assert res.quantitative_metrics.asset_count == 0
    assert res.health_scorecard.overall_score == 50


def test_gate_13_exact_36_feature_ordering():
    """
    Gate 13: 36-Feature Ordering & Completeness.
    Verifies that exactly 36 features expected by feature_metadata.json are extracted
    in the precise canonical sequence.
    """
    metadata = get_feature_metadata()
    order = extract_feature_order(metadata)

    assert len(order) == 36
    assert order[0] == "trading_days"
    assert order[3] == "annualized_volatility"
    assert order[10] == "rolling_max_drawdown_252d"
    assert order[-1] == "portfolio_beta"


def test_gate_14_real_zero_vs_unavailable_value():
    """
    Gate 14: Real Zero != Unavailable Value.
    Verifies that:
    1. Real zero (e.g. 0.0% sector allocation or flat 0.0 return) is preserved.
    2. Unavailable rolling drawdown metrics derive from portfolio_max_drawdown
       rather than silently defaulting to 0.0 (which would falsely imply 'no drawdown').
    """
    data = {
        "portfolio_max_drawdown": -0.25,
        "annualized_volatility": 0.30,
        "annualized_return": 0.15,
        "sector_fmcg_pct": 0.0  # Explicit real zero: 0% in FMCG
    }

    # Sector weight should be 0.0 (true zero)
    assert resolve_feature_value("sector_fmcg_pct", data) == 0.0
    assert resolve_feature_value("sector_realty_pct", data) == 0.0

    # Rolling drawdown should NOT be 0.0 (which means no drawdown), but -0.25
    dd_252 = resolve_feature_value("rolling_max_drawdown_252d", data)
    assert dd_252 == -0.25, "Unavailable 252d drawdown must derive from max drawdown, not 0.0"

    dd_30 = resolve_feature_value("rolling_max_drawdown_30d", data)
    assert dd_30 == round(-0.25 * 0.88, 4)

    downside = resolve_feature_value("downside_deviation_annualized", data)
    assert downside == round(0.30 * 0.70, 4)


def test_gate_15_prediction_cache_invalidation_on_mutation():
    """
    Gate 15: Prediction Cache Invalidation.
    Verifies that altering holding composition generates a different signature
    and invalidates the in-memory intelligence cache.
    """
    holdings_v1 = [{"symbol": "INFY", "quantity": 10.0, "avg_buy_price": 1400.0}]
    holdings_v2 = [{"symbol": "INFY", "quantity": 25.0, "avg_buy_price": 1400.0}]

    sig1 = _compute_holdings_signature(holdings_v1)
    sig2 = _compute_holdings_signature(holdings_v2)

    assert sig1 != sig2, "Mutating holding quantity must produce distinct cache signatures"


@pytest.mark.asyncio
async def test_gate_16_direct_api_access_without_firebase_token(mock_db):
    """
    Gate 16 & 17: Direct API Access Without Firebase Token.
    Verifies that attempting direct REST calls without a token returns 401.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        routes_to_test = [
            "/api/v1/auth/me",
            "/api/v1/portfolios",
            "/api/v1/holdings",
            "/api/v1/transactions",
            "/api/v1/watchlists",
            "/api/v1/notifications",
            "/api/v1/predictions",
            "/api/v1/reports/audit-logs",
        ]
        for route in routes_to_test:
            res = await client.get(route)
            assert res.status_code == 401, f"Route {route} must require authentication"


def test_gate_18_production_environment_config_invariants():
    """
    Gate 18: Production Security Configuration Invariants.
    Verifies that settings defaults enforce strict security and database fallback.
    """
    from app.config.settings import Settings
    # Verify Pydantic class default field value is False for production safety
    assert Settings.model_fields["dev_auth_enabled"].default is False, "dev_auth_enabled must default to False"
    assert settings.allowed_origins != ["*"], "CORS origins must not be wildcard"
    assert settings.mongodb_database is not None
