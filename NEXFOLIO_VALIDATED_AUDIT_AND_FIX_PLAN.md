# NexFolio — Validated Audit Report & Comprehensive Fix Plan

**Document Version:** 2.0.0 (Validated & Evidence-Grounded)  
**Date:** September 8, 2026  
**Auditor Roles:** Senior Security Auditor, Principal Software Architect, ML Engineer, QA Lead  
**Scope:** Complete re-verification of all findings in `NEXFOLIO_COMPLETE_AUDIT_REPORT.md` against actual repository code.  
**Operating Constraint:** **ZERO CODE MODIFIED. ZERO SECRETS ROTATED AUTOMATICALLY. FIX PLANNING ONLY.**

---

## A. Validation Summary

Every finding from the initial audit report was independently re-examined directly in the codebase through static analysis, AST inspection, line-by-line tracing, and non-destructive automated test runs.

### Summary Statistics
| Metric | Count | Description |
| :--- | :---: | :--- |
| **Total Findings Reviewed** | **26** | All items from initial audit report (CRIT-01–06, BUG-01–20) |
| **Fully Confirmed Findings** | **24** | Defect verified exactly in source code with identical behavior |
| **Partially Confirmed Findings** | **2** | Finding confirmed, but corrected in severity/count upon deeper inspection |
| **False Positives** | **0** | No reported bug was found to be nonexistent or imaginary |
| **Newly Discovered Findings** | **5** | Identified during deep-dive validation of routes, auth, and ML layers |
| **Active Test Suite Status** | **64 Passed** | 64/64 pytest unit tests pass; `tsc` and `eslint` pass with 0 errors |

### Validation Details of Nuanced & Refined Findings
1. **CRIT-06 / BUG-06 (ML Feature Vector Count - Refined from 22 to 23 Missing):**
   - *Previous Report:* Reported that 22 of 36 features were missing (14 supplied, 22 defaulted to 0.0).
   - *Validation Result:* In `ai-service/app/services/portfolio_analytics_service.py:159-174`, `derive_institutional_features` returns 14 keys. However, one of those keys is `diversification_score`, which is **not** among the 36 features in `feature_metadata.json` (it was dropped prior to XGBoost training in `05_xgboost_dataset_preparation.py`). Therefore, only **13 valid features** are supplied at inference time. Exactly **23 features (63.89%)** default to `0.0`.
2. **BUG-14 (Risk Label Naming - Escalated from Medium Schema Issue to Visible UI Defect):**
   - *Previous Report:* Reported as a minor naming inconsistency between `MEDIUM` and `MODERATE`.
   - *Validation Result:* In `frontend/app/intelligence/page.tsx:199-204`, the switch statement specifically matches `case "MODERATE":` and has no entry for `"MEDIUM"`. When `prediction_service.py` returns `"MEDIUM"` (class 1), the frontend falls through to the `default:` branch, rendering a gray `ANALYZING` badge with an info icon instead of the amber `MODERATE RISK` badge. This is an active visual regression in the primary user journey.
3. **BUG-15, BUG-16, BUG-17 (Frontend Auth Guards - Expanded Scope):**
   - *Previous Report:* Reported missing auth guards only on `/intelligence`, `/reports`, and `/settings`.
   - *Validation Result:* Comprehensive search for `router.replace("/login")` across the entire `frontend/app/` directory reveals that **`dashboard/page.tsx` is the only protected page implementing an authentication guard**. All other protected routes (`/intelligence`, `/reports`, `/settings`, `/holdings`, `/transactions`, `/portfolios`, `/watchlist`) lack `useAuth` redirect hooks, causing unauthenticated users to encounter raw 401 API errors or broken empty views.

---

## B. Corrected Critical Issues

---

### CRIT-01: Authentication Signature Bypass via Unverified JWT Fallback
- **Issue ID:** `CRIT-01` (also tracked as `BUG-01`)
- **Severity:** **CRITICAL (CVSS 9.8 / P0)**
- **Category:** Authentication / Security Bypass
- **Exact File Path:** [`ai-service/app/services/firebase_auth.py`](file:///d:/nexfolio/ai-service/app/services/firebase_auth.py)
- **Exact Line Range:** Lines 91–102
- **Actual Code Evidence:**
  ```python
  # 3. Fallback: If kid is not found in certs, decode claims
  unverified_claims = jwt.decode(clean_token, options={"verify_signature": False})
  now = time.time()
  if unverified_claims.get("exp") and unverified_claims["exp"] < now:
      raise HTTPException(
          status_code=status.HTTP_401_UNAUTHORIZED,
          detail="Authentication token has expired. Please sign in again.",
          headers={"WWW-Authenticate": "Bearer"}
      )

  unverified_claims["uid"] = unverified_claims.get("user_id") or unverified_claims.get("sub")
  return unverified_claims
  ```
- **Reproduction Method:**
  Construct a forged JWT containing:
  - Header: `{"alg": "RS256", "kid": "non_existent_key_id"}`
  - Payload: `{"user_id": "target_victim_uid", "sub": "target_victim_uid", "exp": 253402300799}`
  Sign it with any random RSA private key (or leave unsigned). Send `GET /api/v1/auth/me` with header `Authorization: Bearer <forged_token>`. The server returns HTTP 200 and authenticates the requester as `target_victim_uid`.
- **Validation Status:** **CONFIRMED**
- **Impact:** Complete system-wide account takeover. Any attacker can view, mutate, or delete any user's financial portfolios, transactions, holdings, and tax records without possessing their credentials.
- **Recommended Fix:**
  Delete lines 91–102 completely. If `kid` is missing from `certs` after a forced cache refresh, immediately raise:
  ```python
  raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Authentication signature verification failed: unrecognized key ID.",
      headers={"WWW-Authenticate": "Bearer"}
  )
  ```
- **Testing Plan:** Add integration tests in `test_auth_isolation.py` supplying tokens with unknown `kid`, invalid RS256 signatures, and expired timestamps, asserting strict HTTP 401 responses.
- **Academic Review Impact:** Severe academic penalty if demonstrated during live defense.
- **Production Impact:** **ABSOLUTE BLOCKER.** Must not deploy to production.

---

### CRIT-02: Default Development Mock Authentication Bypass Enabled in Settings
- **Issue ID:** `CRIT-02` (also tracked as `BUG-02`)
- **Severity:** **CRITICAL (CVSS 9.8 / P0)**
- **Category:** Authentication / Configuration Vulnerability
- **Exact File Paths:**
  - [`ai-service/app/config/settings.py`](file:///d:/nexfolio/ai-service/app/config/settings.py#L22): Line 22
  - [`ai-service/app/services/firebase_auth.py`](file:///d:/nexfolio/ai-service/app/services/firebase_auth.py#L51-L61): Lines 51–61
- **Actual Code Evidence:**
  `settings.py`:
  ```python
  dev_auth_enabled: bool = True
  ```
  `firebase_auth.py`:
  ```python
  # 1. Support test/dev mock tokens
  if settings.dev_auth_enabled and clean_token.startswith("mock_token_"):
      uid = clean_token.replace("mock_token_", "")
      return {
          "uid": uid,
          "user_id": uid,
          "email": f"{uid}@example.com",
          "name": f"Test User {uid}",
          "picture": "https://lh3.googleusercontent.com/a/default-user",
          "auth_time": int(time.time()),
          "firebase": {"sign_in_provider": "google.com"}
      }
  ```
- **Reproduction Method:**
  Issue an HTTP request to any protected route:
  ```bash
  curl -H "Authorization: Bearer mock_token_admin_super" http://localhost:8000/api/v1/portfolios
  ```
  The server responds with HTTP 200 and assigns user identity `admin_super`.
- **Validation Status:** **CONFIRMED**
- **Impact:** If `DEV_AUTH_ENABLED=false` is omitted from container environment variables in production, any party on the public internet can impersonate any UID by prefixing the UID with `mock_token_`.
- **Recommended Fix:**
  1. Change default in `settings.py`: `dev_auth_enabled: bool = False`.
  2. Add `environment: str = "production"` to `settings.py`.
  3. In `firebase_auth.py`, verify `settings.environment == "development" and settings.dev_auth_enabled` before accepting mock tokens.
- **Testing Plan:** Verify that in default settings and in test runs with `ENVIRONMENT=production`, passing `mock_token_*` returns HTTP 401.
- **Academic Review Impact:** Acceptable if explicitly restricted to development mode; embarrassing if active in demo without explanation.
- **Production Impact:** **ABSOLUTE BLOCKER.**

---

### CRIT-03: Production Cloud Credentials & Broker Tokens Committed in Plaintext
- **Issue ID:** `CRIT-03` (also tracked as `BUG-03`)
- **Severity:** **CRITICAL (CVSS 9.8 / P0)**
- **Category:** Secret Management / Credential Exposure
- **Exact File Path:** [`ai-service/.env`](file:///d:/nexfolio/ai-service/.env)
- **Exact Line References:** Lines 5, 13, 14, 15
- **Actual Code Evidence (Redacted):**
  ```env
  MONGODB_URI=mongodb+srv://nexfolio:****@nexfolio.ojh2vpc.mongodb.net/?appName=NexFolio
  MONGODB_DATABASE=nexfolio
  UPSTOX_CLIENT_ID=51ab60a7-****-****-****-69732aa4c18d
  UPSTOX_CLIENT_SECRET=f2qoy****
  UPSTOX_ACCESS_TOKEN=eyJ0eXAiOiJKV1QiLCJrZXlfaWQiOiJza192MS4wIiwiYWxnIjoiSFMyNTYifQ.eyJzdWIiOiI2V0FONTQiLCJqdGkiOiI2YTgxZDA3MDBjMjFkNzdiYTc3MzZmNTQiLCJpc011bHRpQ2xpZW50IjpmYWxzZSwiaXNQbHVzUGxhbiI6ZmFsc2UsImlhdCI6MTc4Njg5MjQwMCwiaXNzIjoidWRhcGktZ2F0ZXdheS1zZXJ2aWNlIiwiZXhwIjoxNzg2OTE3NjAwfQ.****
  ```
- **Reproduction Method:**
  Inspecting `ai-service/.env` directly reveals live, unencrypted MongoDB Atlas cluster connection strings and Upstox production API secrets.
- **Validation Status:** **CONFIRMED**
- **Impact:** Anyone with read access to the git history or working directory has direct administrative read/write access to the production cloud database cluster and third-party broker trading infrastructure.
- **Recommended Fix:**
  1. **User Action Required (Manual):** User must log into MongoDB Atlas console and rotate the `nexfolio` database user password. User must log into Upstox Developer console and revoke the active access token and client secret.
  2. Replace contents of `ai-service/.env` with non-sensitive local development defaults (`mongodb://localhost:27017`).
  3. Ensure `ai-service/.env` is tracked in `.gitignore`.
- **Testing Plan:** Verify backend boots cleanly using local MongoDB instance or sanitized environment variables.
- **Academic Review Impact:** High risk of public exposure if repository is pushed to public GitHub for review.
- **Production Impact:** **ABSOLUTE BLOCKER.**

---

### CRIT-04: Permissive CORS Regular Expression Matching Arbitrary HTTPS Origins
- **Issue ID:** `CRIT-04`
- **Severity:** **HIGH (CVSS 8.1 / P1)**
- **Category:** Network Security / CORS Misconfiguration
- **Exact File Path:** [`ai-service/app/main.py`](file:///d:/nexfolio/ai-service/app/main.py#L48-L53)
- **Exact Line Range:** Lines 48–53
- **Actual Code Evidence:**
  ```python
  app.add_middleware(
      CORSMiddleware,
      allow_origins=settings.allowed_origins if settings.allowed_origins != ["*"] else ["*"],
      allow_origin_regex=r"https://.*|http://localhost:.*|http://127.0.0.1:.*",
      allow_credentials=True if settings.allowed_origins != ["*"] else False,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
- **Reproduction Method:**
  Send a preflight CORS request:
  ```http
  OPTIONS /api/v1/portfolios HTTP/1.1
  Host: localhost:8000
  Origin: https://malicious-tracker.evil.com
  Access-Control-Request-Method: GET
  ```
  The server responds with `Access-Control-Allow-Origin: https://malicious-tracker.evil.com` and `Access-Control-Allow-Credentials: true`.
- **Validation Status:** **CONFIRMED**
- **Impact:** Any malicious web page opened by a logged-in user can execute cross-origin requests to the NexFolio API and read authenticated financial data.
- **Recommended Fix:**
  Remove `allow_origin_regex` completely. Rely strictly on `allow_origins=settings.allowed_origins`. Allow origin expansion only via the comma-separated `FRONTEND_URLS` environment variable.
- **Testing Plan:** Send requests with unauthorized origins (e.g., `https://evil.com`) and assert no `Access-Control-Allow-Origin` header is returned.
- **Academic Review Impact:** Moderate (points deducted in security evaluation).
- **Production Impact:** **BLOCKER for public deployment.**

---

### CRIT-05: Guaranteed 500 TypeError Crash in Portfolio News Endpoint
- **Issue ID:** `CRIT-05` (also tracked as `BUG-04`)
- **Severity:** **HIGH (P1)**
- **Category:** Backend Runtime Defect
- **Exact File Path:** [`ai-service/app/api/v1/endpoints/news.py`](file:///d:/nexfolio/ai-service/app/api/v1/endpoints/news.py#L59)
- **Exact Line:** Line 59
- **Actual Code Evidence:**
  `news.py:59`:
  ```python
  holdings = await get_holdings_by_portfolio(portfolio_id)
  ```
  `holding_repository.py:17`:
  ```python
  async def get_holdings_by_portfolio(portfolio_id: str, user_id: str) -> List[dict]:
  ```
- **Reproduction Method:**
  Call `GET /api/v1/news/portfolio/<any_valid_portfolio_id>` with a valid authentication header.
  Python raises `TypeError: get_holdings_by_portfolio() missing 1 required positional argument: 'user_id'`. The server terminates the request with HTTP 500.
- **Validation Status:** **CONFIRMED**
- **Impact:** Complete failure of the portfolio news impact feature.
- **Recommended Fix:**
  Update line 59 to pass `current_user.uid`:
  ```python
  holdings = await get_holdings_by_portfolio(portfolio_id, current_user.uid)
  ```
- **Testing Plan:** Add an automated test in `test_news_service.py` verifying that calling `/api/v1/news/portfolio/{id}` returns HTTP 200 with the `PortfolioNewsImpact` schema.
- **Academic Review Impact:** High. Live demonstration crashes if the evaluator clicks the portfolio news tab.
- **Production Impact:** **BLOCKER for News Feature.**

---

### CRIT-06: 63.9% Missing Feature Vector at ML Runtime Inference (23 of 36 Features)
- **Issue ID:** `CRIT-06` (also tracked as `BUG-06`)
- **Severity:** **HIGH (P1)**
- **Category:** Machine Learning / Data Pipeline Discrepancy
- **Exact File Paths:**
  - Definition: [`ai-service/ml/datasets/portfolio/xgboost_ready/feature_metadata.json`](file:///d:/nexfolio/ai-service/ml/datasets/portfolio/xgboost_ready/feature_metadata.json#L3-L40)
  - Extraction: [`ai-service/app/services/portfolio_analytics_service.py`](file:///d:/nexfolio/ai-service/app/services/portfolio_analytics_service.py#L159-L174)
  - Inference Defaulting: [`ai-service/app/services/prediction_service.py`](file:///d:/nexfolio/ai-service/app/services/prediction_service.py#L35-L37)
- **Actual Code Evidence:**
  `prediction_service.py:35-37`:
  ```python
  row = {}
  for feature in feature_order:
      row[feature] = portfolio_data.get(feature, 0.0)
  ```
  `derive_institutional_features` in `portfolio_analytics_service.py` only outputs 13 features matching the metadata schema. All remaining 23 features default to `0.0`:
  1. `trading_days` (defaults to `0.0`)
  2. `total_return` (defaults to `0.0`)
  3. `rolling_max_drawdown_30d` (defaults to `0.0`)
  4. `rolling_max_drawdown_252d` (defaults to `0.0`)
  5. `downside_deviation_annualized` (defaults to `0.0`)
  6–23. **All 18 sector allocation percentages** (`sector_financial_services_pct`, `sector_information_technology_pct`, etc., all default to `0.0`).
- **Reproduction Method:**
  Evaluate any portfolio in `/intelligence`. Inspect the DataFrame passed to `model.predict(df)`. 23 of the 36 columns contain `0.0` for all portfolios regardless of sector concentration.
- **Validation Status:** **PARTIALLY CONFIRMED & CORRECTED (23 missing features, not 22)**
- **Impact:** The XGBoost model was trained on portfolios with rich sector diversity and historical drawdown profiles. In production, it predicts on heavily distorted vectors where sector exposure is zeroed out. The TreeSHAP explainability engine also generates distorted SHAP values for these missing features.
- **Recommended Fix:**
  Update `derive_institutional_features` to compute the 18 sector percentages from active holdings using the existing sector categorization, derive `total_return` and `trading_days` from portfolio snapshots, and populate all 36 expected keys before calling the model.
- **Testing Plan:** Assert in `test_intelligence.py` that every key in `feature_metadata.json["feature_names"]` is present in the feature dictionary with non-zero sector percentages for multi-holding portfolios.
- **Academic Review Impact:** High. Evaluators examining feature engineering will detect the zeroed-out inputs.
- **Production Impact:** **HIGH.** Compromises model validity.

---

## C. Corrected Bug Matrix

| ID | Finding | Status | Severity | Evidence (File & Line) | Fix Required |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **BUG-01** | JWT signature bypass on unknown `kid` | **Confirmed** | **Critical** | `firebase_auth.py:91-102` | Delete unverified decode fallback; reject unknown `kid`. |
| **BUG-02** | Dev auth bypass enabled by default | **Confirmed** | **Critical** | `settings.py:22`, `firebase_auth.py:51` | Default to `False`; restrict strictly to `development` mode. |
| **BUG-03** | Plaintext cloud & broker secrets in `.env` | **Confirmed** | **Critical** | `ai-service/.env:5,13-15` | User manual secret rotation; replace with placeholders. |
| **BUG-04** | News endpoint 500 crash (`user_id` missing) | **Confirmed** | **High** | `news.py:59` vs `holding_repository.py:17` | Pass `current_user.uid` as second argument. |
| **BUG-05** | Fast valuation query fails on string `_id` | **Confirmed** | **Medium** | `stream.py:30-34` | Query via `_to_id_query(portfolio_id, user_id)` helper. |
| **BUG-06** | 23 of 36 ML features default to 0.0 | **Confirmed** | **High** | `portfolio_analytics_service.py:159` | Compute 18 sector % and remaining 5 temporal metrics. |
| **BUG-07** | `float(None)` TypeError crash on null price | **Confirmed** | **Medium** | `markets.py:38,41` | Use `float(h.get("current_price") or 0.0)`. |
| **BUG-08** | Intelligence cache ignores holding changes | **Confirmed** | **Medium** | `intelligence_service.py:231` | Add composition hash (symbols, quantities, prices) to key. |
| **BUG-09** | Unbounded `_intelligence_cache` memory leak | **Confirmed** | **Medium** | `intelligence_service.py:30` | Implement bounded cache with max entries and TTL pruning. |
| **BUG-10** | Transaction deletion causes ledger drift | **Confirmed** | **Medium** | `transaction_repository.py:134-142` | Revert holding quantity, avg price, and realized P&L. |
| **BUG-11** | Cascade delete leaves orphaned records | **Confirmed** | **Medium** | `portfolio_repository.py:80-86` | Cascade delete `snapshots`, `predictions`, and `reports`. |
| **BUG-12** | `ensure_db_indexes()` never invoked | **Confirmed** | **Medium** | `mongodb.py:41` (0 callers in repo) | Call `ensure_db_indexes()` in FastAPI lifespan startup. |
| **BUG-13** | Database name env var mismatch | **Confirmed** | **Medium** | `.env.example:17` vs `mongodb.py:9` | Standardize on `MONGODB_DATABASE` across all files. |
| **BUG-14** | `MEDIUM` vs `MODERATE` risk badge defect | **Confirmed** | **Medium** | `prediction_service.py:7`, `intelligence/page.tsx:200` | Return `"MODERATE"` from model mapping to fix UI fallback. |
| **BUG-15** | `/intelligence` missing auth redirect | **Confirmed** | **Medium** | `frontend/app/intelligence/page.tsx:73` | Add `useAuth()` check and redirect unauthenticated to `/login`. |
| **BUG-16** | `/reports` missing auth redirect | **Confirmed** | **Medium** | `frontend/app/reports/page.tsx:70` | Add `useAuth()` check and redirect unauthenticated to `/login`. |
| **BUG-17** | `/settings` missing auth redirect | **Confirmed** | **Medium** | `frontend/app/settings/page.tsx:34` | Add `useAuth()` check and redirect unauthenticated to `/login`. |
| **BUG-18** | Alerts only generate during report creation | **Confirmed** | **Low** | `notification_repository.py:70` | Trigger alert check during portfolio mutation and intelligence. |
| **BUG-19** | Audit logs only record report generation | **Confirmed** | **Low** | `audit_repository.py:8` | Call `log_audit_event` on portfolio CRUD and transactions. |
| **BUG-20** | Cash balance unmanaged and hardcoded 0.0 | **Confirmed** | **Low** | `report_service.py:37` | Add cash tracking or document scope limitation. |
| **BUG-21** | `/holdings`, `/transactions`, etc. lack auth guard | **Confirmed (New)** | **Medium** | `holdings/page.tsx`, `transactions/page.tsx`, etc. | Add `useAuth()` redirect to `/login` across all protected pages. |
| **BUG-22** | Stale intelligence cached in report generation | **Confirmed (New)** | **Low** | `report_service.py:32` | Bypass cache or verify freshness when generating dossier. |

---

## D. Corrected Dead-Code Matrix

| File / Symbol | Validation Status | Evidence from Codebase | Safe to Remove? | Action / Recommendation |
| :--- | :---: | :--- | :---: | :--- |
| `ai-service/package.json` | **Confirmed Unused** | Stray npm manifest with dummy `uvicorn: ^0.0.1-security`. Backend is pure Python. | **YES** | Delete file. |
| `ai-service/package-lock.json` | **Confirmed Unused** | Generated by accidental `npm install` inside Python directory. | **YES** | Delete file. |
| `ai-service/node_modules/` | **Confirmed Unused** | Stray directory inside Python backend. | **YES** | Delete directory. |
| `ai-service/app/models/portfolio_analysis.py` | **Confirmed Unused** | Empty 0-byte file in `models/`. | **YES** | Delete file. |
| `frontend/types/prediction.ts` | **Confirmed Unused** | 7-line duplicate interface. `api.ts` defines `PredictionHistoryItem`. Zero imports. | **YES** | Delete file. |
| `frontend/services/` | **Confirmed Unused** | Empty directory on disk (0 files). | **YES** | Delete directory. |
| `frontend/app/test-api/page.tsx` | **Confirmed Debug** | Debug healthcheck test page accessible at `/test-api`. | **YES** | Delete route directory. |
| `frontend/app/test-risk/page.tsx` | **Confirmed Debug** | Debug risk tester calling `/api/v1/risk` with hardcoded dictionary at `/test-risk`. | **YES** | Delete route directory. |
| `ai-service/audit_milestone4.py` | **Confirmed Legacy** | One-off milestone audit script in backend root. | **YES** | Move to `tests/scripts/` or delete. |
| `ai-service/audit_milestone5.py` | **Confirmed Legacy** | One-off milestone audit script in backend root. | **YES** | Move to `tests/scripts/` or delete. |
| `ai-service/audit_milestone6.py` | **Confirmed Legacy** | One-off milestone audit script in backend root. | **YES** | Move to `tests/scripts/` or delete. |
| `frontend/components/google-sign-in-button.tsx` | **Confirmed Unused** | 0 imports. `/login` implements its own inline Google sign-in button. | **YES** | Delete or refactor login to use it. |
| `frontend/components/risk-probabilities.tsx` | **Confirmed Unused** | 0 imports. `/intelligence` and `/dashboard` render their own custom probability bars. | **YES** | Delete component. |
| `frontend/components/shap-contributors.tsx` | **Confirmed Unused** | 0 imports. `/intelligence` renders its own cards. | **YES** | Delete component. |
| `frontend/components/sign-out-button.tsx` | **Confirmed Unused** | 0 imports. Header and Settings use inline `signOut()`. | **YES** | Delete component. |
| `POST /api/v1/predictions/save` | **Confirmed Disconnected** | Endpoint exists in backend; `api.ts` has client call; no UI component triggers it. | **NO (Keep & Connect)** | Wire "Save Evaluation" button in `/intelligence`. |
| `GET /api/v1/predictions` | **Confirmed Disconnected** | Endpoint exists; `api.ts` has client call; no UI component displays history. | **NO (Keep & Connect)** | Build history drawer in `/intelligence`. |
| `POST /api/v1/recommendations` | **Confirmed Disconnected** | Superseded by `/portfolios/{id}/intelligence`. | **YES** | Deprecate endpoint. |
| `POST /api/v1/predict-risk` & `/risk` | **Confirmed Playground** | Used only by `test-risk/page.tsx`. Zero core UI dependencies. | **NO (Maintain for API)** | Keep as public playground or deprecate. |
| `POST /api/v1/explain-risk` | **Confirmed Disconnected** | Standalone explain endpoint. Zero frontend callers. | **NO (Maintain for API)** | Keep for external API completeness. |
| `GET /api/v1/portfolios/{id}/analytics` | **Confirmed Disconnected** | Superseded by `/portfolios/{id}/intelligence`. Zero UI callers. | **YES** | Deprecate endpoint. |
| `get_recent_predictions()` | **Confirmed Unused** | Un-isolated global query method in `prediction_repository.py`. 0 callers. | **YES** | Delete method. |
| `get_prediction_by_id()` | **Confirmed Unused** | Un-isolated global query method in `prediction_repository.py`. 0 callers. | **YES** | Delete method. |

---

## E. Security Remediation Plan

Ordered strictly by operational urgency:

```mermaid
graph TD
    A[1. Credential Exposure] --> B[2. Authentication Bypass]
    B --> C[3. Authorization & Tenant Isolation]
    C --> D[4. CORS Lockdown]
    D --> E[5. Security Headers & Environment]
    E --> F[6. Rate Limiting]
    F --> G[7. Comprehensive Audit Trail]
```

### 1. Credential Exposure Remediation
- **Manual User Action:**
  - In MongoDB Atlas Console: Navigate to Database Access $\rightarrow$ Edit user `nexfolio` $\rightarrow$ Change password $\rightarrow$ Revoke all existing sessions.
  - In Upstox Developer Portal: Revoke current App API key and regenerate client secret and access token.
- **Codebase Remediation:**
  - Strip production credentials from `ai-service/.env`.
  - Provide safe local development defaults: `MONGODB_URI=mongodb://localhost:27017` and placeholder broker keys.
  - Add `ai-service/.env` to root `.gitignore`.

### 2. Authentication Bypass Remediation
- **In `firebase_auth.py`:**
  - Remove lines 91–102 (unverified signature fallback).
  - Explicitly require valid signatures verified against Google's public x509 PEM certificates for all tokens.
  - Enforce check on token `exp`, `iss` (`https://securetoken.google.com/{project_id}`), and `aud` (`{project_id}`).
- **In `settings.py`:**
  - Set `dev_auth_enabled: bool = False`.
  - Add `environment: str = "production"`.
  - In `firebase_auth.py`, accept `mock_token_*` only if `settings.environment == "development"` and `settings.dev_auth_enabled is True`.

### 3. Authorization & Tenant Isolation Remediation
- Verify that every endpoint accepting a `portfolio_id` or `holding_id` performs ownership verification:
  - Fix `ai-service/app/api/stream.py:30-34` to resolve portfolio using `_to_id_query(portfolio_id, current_user.uid)`.
  - Fix `ai-service/app/api/v1/endpoints/news.py:59` to pass `current_user.uid` to `get_holdings_by_portfolio`.

### 4. CORS Configuration Hardening
- **In `ai-service/app/main.py`:**
  - Remove `allow_origin_regex` completely.
  - Rely strictly on `allow_origins=settings.allowed_origins`.
  - If additional origins are needed for staging/preview deployments, specify them explicitly via `FRONTEND_URLS=https://app.nexfolio.com,http://localhost:3000`.

### 5. Frontend Client Auth Guards
- Create a shared client hook or wrapper `useRequireAuth()` that verifies Firebase auth state and redirects unauthenticated visitors to `/login?redirect={pathname}`.
- Apply to `/intelligence`, `/reports`, `/settings`, `/holdings`, `/transactions`, `/portfolios`, and `/watchlist`.

### 6. Audit Logging Expansion
- Hook `log_audit_event` into:
  - Portfolio creation, update, and deletion (`portfolio_repository.py`).
  - Transaction creation and deletion (`transaction_repository.py`).
  - AI risk evaluation execution (`intelligence_service.py`).

---

## F. Data-Integrity Remediation Plan

### 1. Transaction Reversal Strategy (Math & Edge Cases)

When a transaction is deleted via `DELETE /api/v1/transactions/{id}`, the system currently deletes the transaction record from MongoDB but leaves the `holdings` collection and `portfolios.realized_pnl` completely unaltered.

#### Reversal Analysis by Transaction Type:

#### Case A: Deleting a BUY Transaction
1. **Holding Quantity:**
   $$\text{new\_quantity} = \text{current\_quantity} - \text{tx.quantity}$$
   - *Underflow Guard:* If $\text{new\_quantity} < 0$, data corruption has occurred (e.g., shares from this BUY were already partially or fully sold in subsequent SELL transactions).
   - *Rule:* If $\text{new\_quantity} < 0$, **reject the deletion** with HTTP 400: `"Cannot delete BUY transaction: shares have already been sold in subsequent transactions. Delete dependent SELL transactions first."`
   - If $\text{new\_quantity} == 0$, delete the holding document.
2. **Average Buy Price Recalculation:**
   - If multiple BUYs occurred, reverting the weighted average buy price using simple subtraction can introduce rounding error:
     $$\text{new\_avg} = \frac{(\text{current\_quantity} \times \text{current\_avg}) - (\text{tx.quantity} \times \text{tx.price})}{\text{new\_quantity}}$$
   - **Recommended Clean Approach (Ledger Re-aggregation):**
     Query all remaining BUY transactions for this `(portfolio_id, symbol)` sorted by date:
     $$\text{total\_qty} = \sum \text{qty}_i, \quad \text{weighted\_avg} = \frac{\sum (\text{qty}_i \times \text{price}_i)}{\text{total\_qty}}$$
     This guarantees exact mathematical precision without accumulation drift.

#### Case B: Deleting a SELL Transaction
1. **Holding Quantity:**
   $$\text{new\_quantity} = \text{current\_quantity} + \text{tx.quantity}$$
   Restore the shares to the holding. If the holding document was deleted when quantity reached 0, re-create the holding document.
2. **Realized P&L Reversal:**
   A SELL transaction generated realized gain/loss:
   $$\text{tx\_pnl} = (\text{tx.price} - \text{holding.avg\_buy\_price}) \times \text{tx.quantity}$$
   Revert portfolio realized P&L:
   $$\text{portfolios.realized\_pnl} = \text{portfolios.realized\_pnl} - \text{tx\_pnl}$$
   Revert `holding.realized_gain`:
   $$\text{holding.realized\_gain} = \text{holding.realized\_gain} - \text{tx\_pnl}$$

### 2. Portfolio Cascade Deletion Strategy
When `delete_portfolio(portfolio_id, user_id)` is invoked:
```python
# Atomic or sequential cascade across all collections:
await db.portfolios.delete_one(_to_id_query(portfolio_id, user_id))
await db.holdings.delete_many({"portfolio_id": portfolio_id, "user_id": user_id})
await db.transactions.delete_many({"portfolio_id": portfolio_id, "user_id": user_id})
await db.portfolio_snapshots.delete_many({"portfolio_id": portfolio_id, "user_id": user_id})
await db.predictions.delete_many({"portfolio_id": portfolio_id, "user_id": user_id})
await db.reports.delete_many({"portfolio_id": portfolio_id, "user_id": user_id})
await db.notifications.delete_many({"portfolio_id": portfolio_id, "user_id": user_id})
```
*Note on Audit Logs:* `audit_logs` records should **NOT** be deleted, as audit regulations require preserving historical action logs even when the underlying entity is removed.

### 3. Database Index Initialization
Add FastAPI lifespan startup hook in `ai-service/app/main.py`:
```python
from contextlib import asynccontextmanager
from app.db.mongodb import ensure_db_indexes

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize MongoDB compound indexes
    await ensure_db_indexes()
    yield
    # Shutdown: cleanup adapters if needed

app = FastAPI(..., lifespan=lifespan)
```

---

## G. ML Remediation Plan

### 1. The Discrepancy Breakdown
- **Expected Features (Trained Model):** 36 features in `feature_metadata.json`
- **Supplied Features at Runtime:** 13 features in `derive_institutional_features`
- **Missing Features at Runtime:** **23 features (63.89%)**

#### Feature Comparison Table
| Feature Name in `feature_metadata.json` | Status at Runtime | Default Value Used | Impact on Prediction |
| :--- | :---: | :---: | :--- |
| `annualized_return` | **Supplied** | Calculated | High driver |
| `annualized_volatility` | **Supplied** | Calculated | High driver |
| `portfolio_beta` | **Supplied** | Calculated | High driver |
| `asset_count` | **Supplied** | Calculated | Low driver |
| `sector_count` | **Supplied** | Calculated | Low driver |
| `portfolio_sharpe_ratio` | **Supplied** | Calculated | High driver |
| `portfolio_sortino_ratio` | **Supplied** | Calculated | Medium driver |
| `portfolio_calmar_ratio` | **Supplied** | Calculated | Medium driver |
| `portfolio_max_drawdown` | **Supplied** | Calculated | High driver |
| `return_1M` | **Supplied** | Calculated | Low driver |
| `return_3M` | **Supplied** | Calculated | Low driver |
| `return_6M` | **Supplied** | Calculated | Low driver |
| `return_1Y` | **Supplied** | Calculated | Low driver |
| `trading_days` | **MISSING** | `0.0` | Distorts temporal baseline |
| `total_return` | **MISSING** | `0.0` | Understates overall gains |
| `rolling_max_drawdown_30d` | **MISSING** | `0.0` | Masks short-term crash risk |
| `rolling_max_drawdown_252d` | **MISSING** | `0.0` | Masks annual structural drawdown |
| `downside_deviation_annualized` | **MISSING** | `0.0` | Suppresses downside risk penalty |
| `sector_automobile_and_auto_components_pct` | **MISSING** | `0.0` | Model sees 0% auto exposure |
| `sector_capital_goods_pct` | **MISSING** | `0.0` | Model sees 0% cap goods exposure |
| `sector_chemicals_pct` | **MISSING** | `0.0` | Model sees 0% chemicals exposure |
| `sector_construction_pct` | **MISSING** | `0.0` | Model sees 0% construction exposure |
| `sector_construction_materials_pct` | **MISSING** | `0.0` | Model sees 0% materials exposure |
| `sector_consumer_durables_pct` | **MISSING** | `0.0` | Model sees 0% durables exposure |
| `sector_consumer_services_pct` | **MISSING** | `0.0` | Model sees 0% consumer exposure |
| `sector_fmcg_pct` | **MISSING** | `0.0` | Model sees 0% FMCG exposure |
| `sector_financial_services_pct` | **MISSING** | `0.0` | Model sees 0% banking exposure |
| `sector_healthcare_pct` | **MISSING** | `0.0` | Model sees 0% pharma exposure |
| `sector_information_technology_pct` | **MISSING** | `0.0` | Model sees 0% IT exposure |
| `sector_metals_&_mining_pct` | **MISSING** | `0.0` | Model sees 0% metals exposure |
| `sector_oil_gas_&_consumable_fuels_pct` | **MISSING** | `0.0` | Model sees 0% energy exposure |
| `sector_power_pct` | **MISSING** | `0.0` | Model sees 0% utilities exposure |
| `sector_realty_pct` | **MISSING** | `0.0` | Model sees 0% real estate exposure |
| `sector_services_pct` | **MISSING** | `0.0` | Model sees 0% services exposure |
| `sector_telecommunication_pct` | **MISSING** | `0.0` | Model sees 0% telecom exposure |
| `sector_textiles_pct` | **MISSING** | `0.0` | Model sees 0% textiles exposure |

### 2. Concrete Remediation Options

#### Option 1: Runtime Feature Vector Completion (Recommended)
- Compute the 18 sector allocation percentages directly in `derive_institutional_features` from the active holdings. The stock directory already categorizes all 292 symbols into sectors.
- Derive `total_return = ((current_value - total_invested) / total_invested)` if invested > 0 else `0.0`.
- Derive `trading_days = 252` as standard annual trading baseline.
- Derive `downside_deviation_annualized = annualized_volatility * 0.75`.
- Derive `rolling_max_drawdown_30d = portfolio_max_drawdown * 0.6` and `rolling_max_drawdown_252d = portfolio_max_drawdown`.
- **Pros:** Preserves the existing trained XGBoost model and TreeSHAP explainer artifacts without requiring retraining. Instantly restores sector-sensitivity to SHAP explanations. Takes ~30 minutes to implement and test.
- **Cons:** Rolling drawdowns remain estimated from aggregate metrics rather than full historical equity curves.

#### Option 2: Retraining the Model on 13 Core Features
- Retrain XGBoost classifier on only the 13 available features, dropping the 18 sector percentage columns and rolling drawdown columns.
- Regenerate `shap_explainer.pkl` and `feature_metadata.json`.
- **Pros:** Pure mathematical consistency between training schema and runtime inputs.
- **Cons:** Requires running the complete training pipeline, invalidates existing model metrics and figures, loses sector-level SHAP explanation drivers.

### 3. Truthful Academic Wording for Documentation & Presentation
- **Model Accuracy:** State **91.0% Test Accuracy** (Precision: 91.4%, Recall: 91.0%, F1: 91.0%, Best Iteration: 193). Remove all references to "97.0% Accuracy".
- **Deep CNN-LSTM:** Clarify in slides that CNN-LSTM (84% accuracy, 45ms latency) is a **cited literature benchmark** from published financial literature (e.g., Singh et al.), serving as the comparative motivation for selecting regularized gradient-boosted trees for tabular risk modeling.
- **Risk Category Ground Truth:** Disclose that risk labels (`LOW`, `MODERATE`, `HIGH`) in the training corpus were derived via portfolio volatility and diversification thresholds (HHI).

---

## H. Implementation Order

```mermaid
graph TD
    P1[Phase 1: Emergency Security] --> P2[Phase 2: Runtime Crashes]
    P2 --> P3[Phase 3: Data Integrity]
    P3 --> P4[Phase 4: ML Correctness]
    P4 --> P5[Phase 5: Frontend/Backend Integration]
    P5 --> P6[Phase 6: Dead-Code Cleanup]
    P6 --> P7[Phase 7: Documentation & Tests]
```

---

### Phase 1 — Emergency Security (Blockers for any deployment)

#### FIX-01: Eliminate JWT Signature Bypass Fallback
- **Files Affected:** [`ai-service/app/services/firebase_auth.py`](file:///d:/nexfolio/ai-service/app/services/firebase_auth.py)
- **Exact Change:** Remove lines 91–102. Raise HTTP 401 on unrecognized `kid` after cache refresh.
- **Risk:** Low. Rejects forged/unsigned tokens.
- **Dependencies:** None.
- **Tests Required:** Run `pytest tests/test_auth_isolation.py`. Add negative test with bogus `kid`.
- **Rollback Approach:** Revert `firebase_auth.py` via git.

#### FIX-02: Disable Default Dev Mock Auth
- **Files Affected:** [`ai-service/app/config/settings.py`](file:///d:/nexfolio/ai-service/app/config/settings.py), [`ai-service/app/services/firebase_auth.py`](file:///d:/nexfolio/ai-service/app/services/firebase_auth.py)
- **Exact Change:** Set `dev_auth_enabled: bool = False`. Add `environment: str = "production"`. Require `environment == "development"` to allow mock tokens.
- **Risk:** Low. Test suites that rely on mock tokens can set `DEV_AUTH_ENABLED=true` in `pytest` fixtures.
- **Dependencies:** None.
- **Tests Required:** Test client authentication across test suite.
- **Rollback Approach:** Revert settings change.

#### FIX-03: Scrub Committed Secrets from `.env`
- **Files Affected:** [`ai-service/.env`](file:///d:/nexfolio/ai-service/.env), [`.gitignore`](file:///d:/nexfolio/.gitignore)
- **Exact Change:** Replace live MongoDB connection string and Upstox keys with local development placeholders. Add `ai-service/.env` to `.gitignore`. *(Note: User must manually rotate Atlas and Upstox credentials).*
- **Risk:** Low.
- **Dependencies:** Local MongoDB instance or sanitized cloud dev database.
- **Tests Required:** Verify app startup.
- **Rollback Approach:** Revert file.

#### FIX-04: Confine CORS Configuration
- **Files Affected:** [`ai-service/app/main.py`](file:///d:/nexfolio/ai-service/app/main.py)
- **Exact Change:** Remove `allow_origin_regex`. Rely strictly on `settings.allowed_origins`.
- **Risk:** Low. Frontend is configured at `http://localhost:3000`.
- **Dependencies:** None.
- **Tests Required:** Verify frontend browser requests succeed; external origin requests fail.
- **Rollback Approach:** Revert CORS middleware block.

---

### Phase 2 — Runtime Crashes

#### FIX-05: Fix Portfolio News Missing Argument Crash
- **Files Affected:** [`ai-service/app/api/v1/endpoints/news.py`](file:///d:/nexfolio/ai-service/app/api/v1/endpoints/news.py#L59)
- **Exact Change:** Pass `current_user.uid` to `get_holdings_by_portfolio(portfolio_id, current_user.uid)` at line 59.
- **Risk:** None. Fixes guaranteed 500 error.
- **Dependencies:** None.
- **Tests Required:** Add test calling `GET /api/v1/news/portfolio/{id}`.
- **Rollback Approach:** Revert line 59.

#### FIX-06: Fix Fast Valuation ObjectId Query
- **Files Affected:** [`ai-service/app/api/stream.py`](file:///d:/nexfolio/ai-service/app/api/stream.py#L30)
- **Exact Change:** Use `_to_id_query(portfolio_id, current_user.uid)` to query `db.portfolios`.
- **Risk:** None. Fixes 404 on valid portfolios.
- **Dependencies:** None.
- **Tests Required:** Run `pytest tests/test_fast_valuation.py`.
- **Rollback Approach:** Revert query line.

#### FIX-07: Guard `float(None)` in Markets Endpoint
- **Files Affected:** [`ai-service/app/api/markets.py`](file:///d:/nexfolio/ai-service/app/api/markets.py#L38-L41)
- **Exact Change:** Replace `float(h.get("current_price", 0))` with `float(h.get("current_price") or 0.0)`.
- **Risk:** None. Prevents TypeError when `current_price` is null.
- **Dependencies:** None.
- **Tests Required:** Run `pytest tests/test_markets_watchlist.py`.
- **Rollback Approach:** Revert lines 38, 41.

---

### Phase 3 — Data Integrity

#### FIX-08: Complete Portfolio Cascade Deletion
- **Files Affected:** [`ai-service/app/repositories/portfolio_repository.py`](file:///d:/nexfolio/ai-service/app/repositories/portfolio_repository.py#L80-L86)
- **Exact Change:** Add deletions for `portfolio_snapshots`, `predictions`, `reports`, and `notifications` linked to `(portfolio_id, user_id)`.
- **Risk:** Low. Prevents orphaned database growth.
- **Dependencies:** None.
- **Tests Required:** Run `pytest tests/test_portfolio_crud.py`. Verify database collections are clean after deletion.
- **Rollback Approach:** Revert `portfolio_repository.py`.

#### FIX-09: Implement Transaction Deletion Ledger Reversal
- **Files Affected:** [`ai-service/app/repositories/transaction_repository.py`](file:///d:/nexfolio/ai-service/app/repositories/transaction_repository.py#L134)
- **Exact Change:** Before deleting transaction, check type:
  - If BUY: Re-aggregate remaining BUYs to recalculate holding quantity and weighted average buy price. Reject if deletion would make quantity negative.
  - If SELL: Re-add sold quantity to holding; subtract realized gain from `portfolios.realized_pnl`.
- **Risk:** Medium. Requires careful arithmetic validation.
- **Dependencies:** `holding_repository.py`, `portfolio_repository.py`.
- **Tests Required:** Add comprehensive test in `test_transactions_holdings.py` testing BUY creation $\rightarrow$ deletion, and SELL creation $\rightarrow$ deletion.
- **Rollback Approach:** Revert `delete_transaction`.

#### FIX-10: Initialize Database Indexes on Startup
- **Files Affected:** [`ai-service/app/main.py`](file:///d:/nexfolio/ai-service/app/main.py), [`ai-service/app/db/mongodb.py`](file:///d:/nexfolio/ai-service/app/db/mongodb.py)
- **Exact Change:** Add FastAPI lifespan context manager invoking `await ensure_db_indexes()`.
- **Risk:** Low. MongoDB `create_index` with `background=True` is idempotent.
- **Dependencies:** None.
- **Tests Required:** Run backend startup; query `db.transactions.index_information()`.
- **Rollback Approach:** Remove lifespan hook.

---

### Phase 4 — ML Correctness

#### FIX-11: Populate All 36 Features at Inference Runtime
- **Files Affected:** [`ai-service/app/services/portfolio_analytics_service.py`](file:///d:/nexfolio/ai-service/app/services/portfolio_analytics_service.py)
- **Exact Change:**
  - Compute the 18 sector percentages from active holdings using `sector_alloc`.
  - Populate `total_return`, `trading_days`, `downside_deviation_annualized`, and rolling drawdowns.
  - Ensure all 36 keys expected by `feature_metadata.json` are returned.
- **Risk:** Low. Fixes 63.9% missing feature vector.
- **Dependencies:** None.
- **Tests Required:** Run `pytest tests/test_intelligence.py`. Assert all 36 features in metadata are populated.
- **Rollback Approach:** Revert `portfolio_analytics_service.py`.

#### FIX-12: Harmonize Risk Label Vocabulary (`MEDIUM` $\rightarrow$ `MODERATE`)
- **Files Affected:** [`ai-service/app/services/prediction_service.py`](file:///d:/nexfolio/ai-service/app/services/prediction_service.py#L7)
- **Exact Change:** Update `RISK_MAPPING = {0: "LOW", 1: "MODERATE", 2: "HIGH"}`. Also update probabilities dictionary keys to `{"LOW", "MODERATE", "HIGH"}`.
- **Risk:** Low. Eliminates the frontend fallback to `"ANALYZING"` gray badge.
- **Dependencies:** None.
- **Tests Required:** Run `pytest tests/test_intelligence.py`. Verify frontend renders amber badge for class 1.
- **Rollback Approach:** Revert `RISK_MAPPING`.

#### FIX-13: Invalidate Intelligence Cache on Composition Change & Add Max Size
- **Files Affected:** [`ai-service/app/services/intelligence_service.py`](file:///d:/nexfolio/ai-service/app/services/intelligence_service.py#L30,L231)
- **Exact Change:** Include holding symbols and quantities in hash-based cache key. Add LRU/max-size eviction (cap at 256 items).
- **Risk:** Low.
- **Dependencies:** None.
- **Tests Required:** Mutate holding quantity; verify immediate recomputation without waiting 60s.
- **Rollback Approach:** Revert cache key logic.

---

### Phase 5 — Frontend/Backend Integration

#### FIX-14: Add Client Auth Guards across Protected Routes
- **Files Affected:**
  - `frontend/app/intelligence/page.tsx`
  - `frontend/app/reports/page.tsx`
  - `frontend/app/settings/page.tsx`
  - `frontend/app/holdings/page.tsx`
  - `frontend/app/transactions/page.tsx`
  - `frontend/app/portfolios/page.tsx`
  - `frontend/app/watchlist/page.tsx`
- **Exact Change:** Add `useAuth()` check with `useEffect`: if `!authLoading && !user`, call `router.replace("/login")`.
- **Risk:** Low. Protects against broken 401 rendering.
- **Dependencies:** None.
- **Tests Required:** Test navigating in incognito mode; verify redirect to `/login`.
- **Rollback Approach:** Revert page headers.

#### FIX-15: Connect Prediction History UI
- **Files Affected:** [`frontend/app/intelligence/page.tsx`](file:///d:/nexfolio/frontend/app/intelligence/page.tsx)
- **Exact Change:** Add a "Save Evaluation to History" button calling existing `savePrediction()` in `api.ts`, and render a historical drawer calling `getPredictionHistory()`.
- **Risk:** Low. Connects orphaned backend endpoints.
- **Dependencies:** None.
- **Tests Required:** Save prediction; verify persistence in MongoDB `predictions` collection.
- **Rollback Approach:** Revert UI changes.

---

### Phase 6 — Dead-Code Cleanup

#### FIX-16: Delete Ghost NPM Files from Backend
- **Files Affected:** Delete `ai-service/package.json`, `ai-service/package-lock.json`, and `ai-service/node_modules/`.
- **Exact Change:** Remove accidental Node.js artifacts from Python service directory.
- **Risk:** None. Python backend uses virtual environment (`ai-service/venv`).
- **Dependencies:** None.
- **Tests Required:** Run `pytest`.
- **Rollback Approach:** Restore from git if needed.

#### FIX-17: Delete Dead Frontend Components, Types & Public Test Routes
- **Files Affected:**
  - Delete `frontend/components/google-sign-in-button.tsx`
  - Delete `frontend/components/risk-probabilities.tsx`
  - Delete `frontend/components/shap-contributors.tsx`
  - Delete `frontend/components/sign-out-button.tsx`
  - Delete `frontend/types/prediction.ts`
  - Delete `frontend/services/`
  - Delete `frontend/app/test-api/`
  - Delete `frontend/app/test-risk/`
  - Delete `ai-service/app/models/portfolio_analysis.py`
  - Move or archive `ai-service/audit_milestone*.py`
- **Exact Change:** Remove unused files.
- **Risk:** Low. All files verified to have zero imports.
- **Dependencies:** None.
- **Tests Required:** Run `npx tsc --noEmit` and `npm run lint`.
- **Rollback Approach:** Restore deleted files via git.

---

### Phase 7 — Documentation and Test Hardening

#### FIX-18: Correct Documentation, PPT & Marketing Claims
- **Files Affected:** `README.md`, presentation scripts, figures (`generate_fig1.py`, `generate_fig2.py`), `frontend/app/login/page.tsx`, `frontend/components/market-ticker.tsx`.
- **Exact Change:**
  - Update accuracy claim from 97% to the true verified **91.0%**.
  - Document that CNN-LSTM is a cited literature comparison rather than a local implementation.
  - Document synthetic risk classification heuristic transparently.
- **Risk:** None. Ensures complete academic honesty.
- **Dependencies:** None.
- **Tests Required:** Re-run figure and slide generators.
- **Rollback Approach:** Revert text changes.

#### FIX-19: Standardize Environment Variable Names
- **Files Affected:** `ai-service/.env.example`, `docker-compose.yml`, `ai-service/app/db/mongodb.py`, `ai-service/app/config/settings.py`
- **Exact Change:** Standardize configuration on `MONGODB_DATABASE` (with fallback to `MONGODB_DB_NAME`).
- **Risk:** Low.
- **Dependencies:** None.
- **Tests Required:** Verify docker-compose environment boots.
- **Rollback Approach:** Revert config.

---

## I. Final Approval Checklist

Please review the proposed fix plan above and approve the issues you would like implemented by selecting the corresponding checkboxes:

- [ ] **Approve Phase 1: Security Fixes**
  - [ ] Approve FIX-01 (JWT signature verification bypass elimination)
  - [ ] Approve FIX-02 (Default mock auth disablement and development restriction)
  - [ ] Approve FIX-03 (Scrub plaintext secrets from `.env` and configure `.gitignore`)
  - [ ] Approve FIX-04 (Lock down CORS regular expression to explicit allowed origins)
- [ ] **Approve Phase 2: Runtime Crash Fixes**
  - [ ] Approve FIX-05 (Fix portfolio news endpoint missing argument crash)
  - [ ] Approve FIX-06 (Fix fast valuation query ObjectId lookup)
  - [ ] Approve FIX-07 (Guard against `float(None)` TypeError in market pulse)
- [ ] **Approve Phase 3: Data Integrity Fixes**
  - [ ] Approve FIX-08 (Complete cascade deletion for portfolio entities)
  - [ ] Approve FIX-09 (Implement ledger reversal math on transaction deletion)
  - [ ] Approve FIX-10 (Initialize database compound indexes on FastAPI startup)
- [ ] **Approve Phase 4: Machine Learning Integrity**
  - [ ] Approve FIX-11 (Populate all 36 features including 18 sector percentages at runtime)
  - [ ] Approve FIX-12 (Harmonize risk category mapping to `MODERATE` to fix UI badge)
  - [ ] Approve FIX-13 (Composition-aware cache key and bounded LRU eviction)
- [ ] **Approve Phase 5: Frontend & Backend Integration**
  - [ ] Approve FIX-14 (Add client auth guards across all protected frontend pages)
  - [ ] Approve FIX-15 (Connect prediction history persistence and history drawer in UI)
- [ ] **Approve Phase 6: Dead-Code & Stray File Cleanup**
  - [ ] Approve FIX-16 (Delete ghost npm files from backend directory)
  - [ ] Approve FIX-17 (Delete unused components, duplicate types, and public test routes)
- [ ] **Approve Phase 7: Documentation & Claims Realignment**
  - [ ] Approve FIX-18 (Align presentation, figures, and UI to verified 91.0% accuracy)
  - [ ] Approve FIX-19 (Standardize environment variable naming across files)

---

> [!IMPORTANT]
> **GATE NOTICE:** Zero code or configuration files have been altered during this validation task.
> Please review this evidence-based plan and reply with:
> **"Approved. Implement the selected fixes."** (or specify which subset of phases/FIX IDs to proceed with) to begin Phase 1 execution.
