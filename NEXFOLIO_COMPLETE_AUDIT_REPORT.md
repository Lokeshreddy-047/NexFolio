# NexFolio — Complete Application Audit, Bug Detection & Dead-Code Analysis Report

**Date of Audit:** September 8, 2026  
**Auditor Roles:** Senior Software Architect, Security Auditor, Backend Engineer, Frontend Engineer, ML Engineer, QA Engineer  
**Target Repository:** NexFolio (FastAPI Backend, Next.js 15 Frontend, XGBoost/TreeSHAP AI Engine, MongoDB Atlas, Firebase Auth)  
**Status:** PHASE 1 COMPLETE — AUDIT ONLY. ZERO CODE MODIFIED. AWAITING CONFIRMATION.

---

## 1. Executive Summary

### 1.1 Overall Health of the Application
NexFolio is an ambitious full-stack financial intelligence application built to deliver explainable AI portfolio risk classification, statutory Indian capital gains tax analysis (Income-tax Act, 2025 & 1961), and real-time market tracking. The codebase demonstrates high engineering ambition with advanced UI design patterns (Framer Motion, glassmorphism, responsive dashboards) and domain-specific financial calculations (FIFO matching, Section 112A exemptions, TreeSHAP driver translations).

However, an exhaustive audit across all layers reveals **critical security vulnerabilities**, **breaking runtime bugs**, **severe machine learning feature mismatches**, **stray files**, **dead UI components**, and **significant discrepancies between presentation/documentation claims and the actual codebase implementation**.

### 1.2 Main Strengths
1. **Institutional Tax Engine (`tax_service.py`):** Exceptional fidelity to Indian tax law, implementing FIFO trade lot matching, calendar-month holding period calculations (accounting for leap years), Section 112A ₹1.25L exemption tracking, Tax Loss Bank carryforwards, and ITR schedule-compatible CSV exports.
2. **Explainable AI Pipeline (`shap_translation_service.py`):** Sophisticated translation layer that converts raw mathematical SHAP values into human-readable narratives, financial headlines, and actionable mitigating/amplifying drivers with observed vs. benchmark baselines.
3. **Frontend Visual Polish & Theming:** High-end visual hierarchy with custom dark mode aurora gradients, Tailwind CSS styling, interactive charts (Recharts), and responsive layouts.
4. **Market Feed Degradation Chain:** Resilient fallback architecture that gracefully degrades from Live Broker (Yahoo Finance / Upstox) to reference snapshots when external APIs fail or are offline.
5. **FastAPI Modular Architecture:** Clean separation of concerns across API routers, dependencies, services, schemas, and repositories.

### 1.3 Main Weaknesses
1. **Critical Authentication Bypass Vulnerability:** If a JWT contains a key ID (`kid`) not in Google's cached certs, the authentication service falls back to decoding the token with `verify_signature: False`. Any attacker can forge a JWT with arbitrary user credentials and bypass authentication completely.
2. **Default Development Authentication Bypass Enabled:** `dev_auth_enabled: bool = True` is enabled by default in settings, allowing anyone to impersonate any user by providing `Bearer mock_token_<uid>`.
3. **Production Secrets Committed in Plaintext:** A production MongoDB Atlas connection URI with plaintext credentials and live Upstox Client ID, Client Secret, and Access Tokens are committed directly in `ai-service/.env`.
4. **Severe ML Runtime Feature Mismatch (61% Defaulting to 0.0):** The XGBoost model was trained on 36 features (`feature_metadata.json`), but the runtime feature derivation function only calculates 14 features. The remaining 22 features (including rolling drawdowns and all 18 sector allocation percentages) default to `0.0`, compromising inference reliability.
5. **Runtime Crash on News Endpoint:** The portfolio news endpoint `/api/v1/news/portfolio/{id}` calls `get_holdings_by_portfolio` with 1 argument when 2 are required, causing a guaranteed 500 `TypeError` crash.
6. **Incomplete Cascade Deletion & Orphaned Records:** Deleting a portfolio leaves orphaned records in `portfolio_snapshots`, `predictions`, and `reports`. Deleting a transaction never reverses its impact on holding quantities or realized P&L.
7. **Dead Database Indexing:** `ensure_db_indexes()` is never invoked during application startup.
8. **Exaggerated Claims in Presentations & Docs:** Presentations and reports claim **97.0% accuracy** and benchmark against a **"Deep CNN-LSTM Base Paper (84% accuracy, 45ms latency)"**. In reality, the trained model achieves **91.0% accuracy**, and the CNN-LSTM model does not exist in the codebase.

### 1.4 Readiness Assessment
| Review Tier | Verdict | Rationale |
| :--- | :--- | :--- |
| **Academic Review Readiness** | **CONDITIONALLY ACCEPTABLE (WITH DISCLOSURES)** | The codebase demonstrates real ML training, TreeSHAP explainability, and tax modeling. However, claims must be corrected: accuracy is 91%, not 97%; the CNN-LSTM is a literature baseline, not a code implementation; and risk labels are derived from synthetic heuristics. |
| **Production Readiness** | **REJECTED (CRITICAL BLOCKERS)** | Must not be deployed in production until the authentication signature bypass is eliminated, secrets are scrubbed, the news endpoint crash is fixed, and CORS wildcards are locked down. |

### 1.5 Most Critical Risks
1. **Total Account Takeover / Data Leakage:** Any user's financial portfolio, transactions, and tax reports can be viewed or deleted via JWT signature bypass or default mock auth.
2. **Regulatory & Audit Non-Compliance:** Claiming 97% accuracy while delivering 91% on truncated 14-feature vectors fails academic integrity and financial regulatory standards.
3. **Database Corruption & Ledger Desynchronization:** Transaction deletion without holding reversal causes silent data drift.

---

## 2. Architecture Overview

### 2.1 Actual Architecture Map
```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       FRONTEND LAYER                                             │
│                                  Next.js 15.5.23 (React 19)                                      │
│                                                                                                  │
│  [App Router Pages]           [Global Providers]            [Shared Components]                  │
│  • /dashboard                 • AuthProvider (Firebase)    • Header (Portfolio selector, SSE)   │
│  • /portfolios                • ThemeProvider               • Sidebar (Navigation drawer)        │
│  • /holdings                  • ToastProvider               • MarketTicker (Live marquee)        │
│  • /transactions                                            • DataPedigreeBadge                  │
│  • /intelligence                                            • CommandPalette (Quick search)      │
│  • /markets & /watchlist                                    • ConfirmDialog (Delete guards)      │
│  • /reports (Tax & Dossier)                                                                      │
│  • /ipo & /news                                                                                  │
│  • /login & /settings                                                                            │
└────────────────────────────────────────┬─────────────────────────────────────────────────────────┘
                                         │ REST API / Bearer Token & SSE Stream
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    GATEWAY & MIDDLEWARE LAYER                                    │
│                                                                                                  │
│  • SecurityHeadersMiddleware: Adds CSP, HSTS, X-Frame-Options, X-Content-Type-Options            │
│  • SlidingWindowRateLimiter: 300 req/min general, 60 req/min ML endpoints                        │
│  • CORSMiddleware: Origins http://localhost:3000 (with overly broad regex fallback)              │
│  • ErrorHandler: Standardized JSON envelope {success, error, meta}                              │
└────────────────────────────────────────┬─────────────────────────────────────────────────────────┘
                                         │
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       BACKEND CORE (FastAPI)                                     │
│                                                                                                  │
│  [API Endpoints]             [Core Services]               [Repositories (Motor / Mongo)]        │
│  • /portfolios               • intelligence_service.py     • portfolio_repository.py             │
│  • /holdings                 • portfolio_analytics_service • holding_repository.py               │
│  • /transactions             • tax_service.py              • transaction_repository.py           │
│  • /markets & /watchlists    • market_service.py           • snapshot_repository.py              │
│  • /reports & /audit-logs    • report_service.py           • prediction_repository.py            │
│  • /ipo & /news              • ipo_service.py              • user_repository.py                  │
│  • /stream (SSE ticks)       • news_service.py             • notification_repository.py          │
│  • /auth/me                  • valuation_engine.py         • watchlist_repository.py             │
│                              • firebase_auth.py            • audit_repository.py                 │
└───────────────────────┬────────────────────────────┬─────────────────────────────┬───────────────┘
                        │                            │                             │
                        ▼                            ▼                             ▼
         ┌──────────────────────────┐  ┌──────────────────────────┐  ┌──────────────────────────┐
         │     DATABASE LAYER       │  │      AI / ML LAYER       │  │    MARKET DATA LAYER     │
         │   MongoDB Atlas 7.0      │  │  XGBoost & TreeSHAP      │  │  MarketDataManager Feed  │
         │                          │  │                          │  │                          │
         │ • portfolios             │  │ • xgboost_risk_model.pkl │  │ • YahooFinanceAdapter    │
         │ • holdings               │  │ • shap_explainer.pkl     │  │ • UpstoxBrokerAdapter    │
         │ • transactions           │  │ • feature_metadata.json  │  │ • ReferenceProvider      │
         │ • portfolio_snapshots    │  │ • 36 trained features    │  │ • MarketDataCache (TTL)  │
         │ • predictions            │  │ • 91.0% test accuracy    │  │ • SymbolNormalizer       │
         │ • users                  │  │ • 1,000 synthetic rows   │  │ • SSE Tick Broadcaster   │
         │ • watchlists             │  └──────────────────────────┘  └──────────────────────────┘
         │ • reports                │
         │ • audit_logs             │
         │ • notifications          │
         └──────────────────────────┘
```

### 2.2 Main Data Flows
1. **Authentication:** User signs in via Google OAuth or Email/Password on Frontend $\rightarrow$ Firebase SDK issues JWT ID Token $\rightarrow$ Frontend stores token and sends `Authorization: Bearer <token>` with every API call $\rightarrow$ Backend `get_current_user` extracts claims, validates PKI certs, and upserts user record in `users` collection.
2. **Portfolio & Transaction Ingestion:** User adds transaction on `/transactions` $\rightarrow$ `POST /api/v1/transactions` verifies portfolio ownership $\rightarrow$ updates `holdings` (weighted average buy price on BUY, reduces balance and increments `portfolios.realized_pnl` on SELL) $\rightarrow$ creates `transactions` record $\rightarrow$ triggers post-commit valuation snapshot in `portfolio_snapshots`.
3. **AI Risk Intelligence:** User visits `/intelligence` $\rightarrow$ `GET /api/v1/portfolios/{id}/intelligence` fetches holdings $\rightarrow$ fetches live quotes via `MarketDataManager` $\rightarrow$ computes metrics & heuristic features in `derive_institutional_features` $\rightarrow$ loads XGBoost model & SHAP explainer $\rightarrow$ generates risk category, confidence, probabilities, and top positive/negative SHAP drivers $\rightarrow$ translates into human-readable narratives and 4-pillar scorecard.
4. **Tax Schedule & Loss Harvesting:** User visits `/reports` $\rightarrow$ `GET /api/v1/portfolios/{id}/tax-report` fetches user transactions $\rightarrow$ runs FIFO trade lot matching engine $\rightarrow$ classifies STCG (held $\le$ 12 months, taxed @ 20%) vs LTCG (held > 12 months, taxed @ 12.5% on gains exceeding ₹1.25L exemption) $\rightarrow$ calculates Section 112A threshold utilization $\rightarrow$ analyzes unrealized losses for tax-loss harvesting candidates $\rightarrow$ outputs audit-ready report or CSV.

### 2.3 Key Architectural Flaws Identified
1. **Unbounded In-Memory Caching:** `_intelligence_cache` in `intelligence_service.py` is a simple global dictionary with no TTL expiration pruning or max-size eviction policy. Over time in a multi-tenant environment, this causes memory leaks.
2. **Cache Key Missing Composition Hash:** The cache key in `intelligence_service.py` is `f"{user_id}:{port_id}:{len(raw_holdings)}"`. If a user modifies quantities, buys new stock while selling another, or market prices change, the cache returns stale predictions.
3. **Dual Competing AI Endpoints:** Three separate sets of prediction endpoints exist:
   - Modern comprehensive endpoint: `/api/v1/portfolios/{id}/intelligence`
   - Legacy portfolio analytics endpoint: `/api/v1/portfolios/{id}/analytics`
   - Raw payload endpoints: `/api/v1/risk`, `/api/v1/predict-risk`, `/api/v1/explain-risk`, `/api/v1/recommendations`
4. **Asynchronous Ledger Drift:** The database lacks multi-document ACID transactions across `holdings`, `transactions`, and `portfolios`. A failure during transaction recording can leave holdings modified but transaction unrecorded.

---

## 3. Critical Issues

### CRIT-01: Authentication Signature Bypass via Invalid Key ID (`kid`)
- **Severity:** Critical (P0)
- **Category:** Security / Authentication Bypass
- **File Path:** `ai-service/app/services/firebase_auth.py`
- **Line Reference:** Lines 91–102
- **Description:** When verifying a Firebase JWT, if the token's header contains a `kid` that is not present in Google's fetched public certificates, the code falls back to decoding the token with `options={"verify_signature": False}`.
- **Why it is a problem:** Any attacker can construct a forged JWT, put an arbitrary `kid` in the header (e.g. `{"kid": "untrusted_key"}`), sign it with any random key or leave it unsigned, and set `user_id` or `sub` to any victim's user ID. The backend will accept the token, assign the victim's identity, and grant full access to their private portfolios, transactions, and tax reports.
- **How to verify:** Send a request with `Authorization: Bearer <forged_token_with_bogus_kid>` to `/api/v1/auth/me`. The server returns 200 OK and authenticates the attacker as the specified user.
- **Recommended Fix:** Remove lines 91–102 entirely. If the token's `kid` is not present in Google's verified certificates after a forced cache refresh, raise `HTTPException(status_code=401, detail="Invalid authentication token signature.")`.
- **Complexity:** Low (10 minutes)
- **Blocks Production:** YES. Absolute blocker.

---

### CRIT-02: Default Development Mock Authentication Bypass Enabled
- **Severity:** Critical (P0)
- **Category:** Security / Default Configuration
- **File Path:** `ai-service/app/config/settings.py` (Line 22) & `ai-service/app/services/firebase_auth.py` (Lines 51–61)
- **Line Reference:** `dev_auth_enabled: bool = True`
- **Description:** `dev_auth_enabled` defaults to `True`. When enabled, any token string beginning with `mock_token_` bypasses all cryptographic checks and is automatically authenticated as whatever UID follows the prefix.
- **Why it is a problem:** If deployed to production without explicitly setting `DEV_AUTH_ENABLED=false` in production environment variables, any user can impersonate any account simply by passing `Bearer mock_token_<victim_uid>`.
- **How to verify:** Execute:
  ```bash
  curl -H "Authorization: Bearer mock_token_admin" http://localhost:8000/api/v1/auth/me
  ```
  The server responds with HTTP 200 and a valid user principal for user `admin`.
- **Recommended Fix:** Set `dev_auth_enabled: bool = False` by default in `Settings`. Enforce that development tokens are only accepted if `ENVIRONMENT == "development"` and `dev_auth_enabled` is explicitly `True`.
- **Complexity:** Low (5 minutes)
- **Blocks Production:** YES. Absolute blocker.

---

### CRIT-03: Production Database Credentials & Broker Secrets Committed in Plaintext
- **Severity:** Critical (P0)
- **Category:** Security / Credential Exposure
- **File Path:** `ai-service/.env`
- **Line Reference:** Lines 5, 13–15
- **Description:** A live MongoDB Atlas connection string with embedded username and password (`mongodb+srv://nexfolio:nexfolio@nexfolio.ojh2vpc.mongodb.net/...`) and live Upstox Client ID, Client Secret (`f2qoymgpt4`), and JWT Access Token are stored in plaintext in the codebase.
- **Why it is a problem:** Anyone with read access to the repository has direct administrative access to the production cloud database and third-party broker accounts.
- **How to verify:** Inspect `ai-service/.env`.
- **Recommended Fix:**
  1. Immediately rotate the MongoDB Atlas user credentials and revoke the Upstox API keys.
  2. Add `ai-service/.env` to `.gitignore`.
  3. Ensure production environments inject credentials solely via platform secret managers (Render / Vercel Environment Variables).
- **Complexity:** Low (15 minutes + key rotation)
- **Blocks Production:** YES. Absolute blocker.

---

### CRIT-04: Overly Permissive CORS Regex Matching Arbitrary Origins
- **Severity:** High (P1)
- **Category:** Security / CORS Misconfiguration
- **File Path:** `ai-service/app/main.py`
- **Line Reference:** Lines 48–53
- **Description:** The CORS middleware specifies:
  ```python
  allow_origin_regex=r"https://.*|http://localhost:.*|http://127.0.0.1:.*"
  ```
- **Why it is a problem:** This regular expression matches *every single HTTPS origin on the entire internet* (e.g. `https://malicious-phishing-site.com`). When combined with `allow_headers=["*"]` and `allow_methods=["*"]`, a malicious website can make cross-origin requests to the API from a victim's browser.
- **How to verify:** Send an `OPTIONS` preflight request with `Origin: https://attacker.example.com`. The API returns `Access-Control-Allow-Origin: https://attacker.example.com`.
- **Recommended Fix:** Remove `allow_origin_regex` completely or strictly confine it to the configured `settings.allowed_origins` list and explicit staging/production domains.
- **Complexity:** Low (5 minutes)
- **Blocks Production:** YES.

---

### CRIT-05: Guaranteed Runtime Crash in Portfolio News Endpoint
- **Severity:** High (P1)
- **Category:** Backend / Runtime Error
- **File Path:** `ai-service/app/api/v1/endpoints/news.py`
- **Line Reference:** Line 59
- **Description:** In `get_portfolio_impact_news`, the code calls:
  ```python
  holdings = await get_holdings_by_portfolio(portfolio_id)
  ```
  However, `get_holdings_by_portfolio` in `app/repositories/holding_repository.py` is defined as:
  ```python
  async def get_holdings_by_portfolio(portfolio_id: str, user_id: str) -> List[dict]:
  ```
- **Why it is a problem:** When any user requests portfolio-specific news via `/api/v1/news/portfolio/{portfolio_id}`, Python raises:
  `TypeError: get_holdings_by_portfolio() missing 1 required positional argument: 'user_id'`.
  The request crashes with HTTP 500.
- **How to verify:** Call `GET /api/v1/news/portfolio/<any_id>` with valid user auth. The server returns HTTP 500 Internal Server Error with unhandled TypeError.
- **Recommended Fix:** Update line 59 in `news.py` to:
  ```python
  holdings = await get_holdings_by_portfolio(portfolio_id, current_user.uid)
  ```
- **Complexity:** Low (2 minutes)
- **Blocks Production:** YES.

---

### CRIT-06: 61% Missing Feature Vector at ML Runtime Inference
- **Severity:** High (P1)
- **Category:** Machine Learning / Feature Discrepancy
- **File Path:** `ai-service/app/services/portfolio_analytics_service.py` vs `ai-service/ml/datasets/portfolio/xgboost_ready/feature_metadata.json`
- **Line Reference:** `portfolio_analytics_service.py` Lines 159–174
- **Description:** The XGBoost model was trained on 36 features (`feature_count: 36` in `feature_metadata.json`). However, `derive_institutional_features` only computes and outputs 14 features. The runtime inference functions (`predict_portfolio_risk` and `explain_portfolio_risk`) populate missing features with `0.0`.
- **Why it is a problem:** 22 out of 36 features (61.1% of the model's expected inputs)—including `trading_days`, `total_return`, `rolling_max_drawdown_30d`, `rolling_max_drawdown_252d`, `downside_deviation_annualized`, and all 18 sector percentage features (`sector_financial_services_pct`, `sector_information_technology_pct`, etc.)—are always passed as `0.0`. The model is predicting on a heavily distorted, incomplete feature space that diverges fundamentally from the training distribution.
- **How to verify:** Inspect `derive_institutional_features` output keys and compare directly against `feature_metadata.json["feature_names"]`. Notice that sector percentage keys are completely absent.
- **Recommended Fix:**
  1. In `derive_institutional_features`, compute the 18 sector allocation percentages from the active holdings.
  2. Compute or derive reasonable estimates for `trading_days`, `total_return`, rolling drawdowns, and downside deviation.
  3. Ensure all 36 keys expected by `feature_metadata.json` are systematically populated before inference.
- **Complexity:** Medium (1–2 hours)
- **Blocks Production:** YES.

---

## 4. Complete Bug List

| ID | Severity | Category | File | Issue | Evidence | Recommended Fix |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | Critical | Security | `ai-service/app/services/firebase_auth.py:91-102` | Unverified signature fallback on unknown `kid` | `unverified_claims = jwt.decode(clean_token, options={"verify_signature": False})` | Remove fallback; reject tokens with unknown `kid`. |
| **BUG-02** | Critical | Security | `ai-service/app/config/settings.py:22` | `dev_auth_enabled` defaults to `True` | `dev_auth_enabled: bool = True` | Default to `False`; check environment. |
| **BUG-03** | Critical | Security | `ai-service/.env:5,13-15` | Plaintext Atlas & Upstox secrets in repository | Plaintext credentials committed in `.env` | Scrub secrets from file; add `.env` to `.gitignore`. |
| **BUG-04** | High | Backend | `ai-service/app/api/v1/endpoints/news.py:59` | Missing `user_id` argument causes HTTP 500 | `get_holdings_by_portfolio(portfolio_id)` | Pass `current_user.uid` as 2nd parameter. |
| **BUG-05** | High | Backend | `ai-service/app/api/stream.py:30` | Fast valuation queries `_id` as string instead of `ObjectId` | `find_one({"_id": portfolio_id, ...})` | Use `_to_id_query(portfolio_id, current_user.uid)`. |
| **BUG-06** | High | ML | `ai-service/app/services/portfolio_analytics_service.py:159` | 22 of 36 features missing from runtime vector | Returns 14 keys; 22 sector/drawdown keys default to 0.0 | Calculate sector percentages and remaining 22 features. |
| **BUG-07** | Medium | Backend | `ai-service/app/api/markets.py:38,41` | `float(None)` crash if `current_price` is null in DB | `float(h.get("current_price", 0))` returns `None` if null | Use `float(h.get("current_price") or 0.0)`. |
| **BUG-08** | Medium | Backend | `ai-service/app/services/intelligence_service.py:231` | Intelligence cache key only checks `len(holdings)` | `cache_key = f"{user_id}:{port_id}:{len(raw_holdings)}"` | Include hash of symbols, quantities, and prices in cache key. |
| **BUG-09** | Medium | Backend | `ai-service/app/services/intelligence_service.py:30` | In-memory cache has no eviction policy (memory leak) | `_intelligence_cache = {}` grows monotonically | Implement bounded LRU or TTL eviction cleanup. |
| **BUG-10** | Medium | Backend | `ai-service/app/repositories/transaction_repository.py:134` | Transaction deletion does not reverse holdings / P&L | `delete_one` deletes row without updating holdings | Reverse quantity and recalculate average buy price / realized P&L. |
| **BUG-11** | Medium | Backend | `ai-service/app/repositories/portfolio_repository.py:80` | Incomplete cascade deletion leaves orphaned records | Deletes holdings and txs, but ignores snapshots & reports | Cascade delete from `portfolio_snapshots`, `predictions`, `reports`. |
| **BUG-12** | Medium | Database | `ai-service/app/db/mongodb.py:41` | `ensure_db_indexes()` is never invoked | Grep reveals zero callers in codebase | Call `ensure_db_indexes()` in FastAPI lifespan startup. |
| **BUG-13** | Medium | Config | `ai-service/.env.example:17` vs `mongodb.py:9` | Env var name mismatch (`MONGODB_DB_NAME` vs `MONGODB_DATABASE`) | `.env.example` has `MONGODB_DB_NAME`, code checks `MONGODB_DATABASE` | Standardize on `MONGODB_DATABASE` across all files. |
| **BUG-14** | Medium | ML / Schema | `ai-service/app/services/prediction_service.py:7` vs `schemas/intelligence.py:88` | Inconsistent risk category naming (`MEDIUM` vs `MODERATE`) | Mapping returns `MEDIUM`, schema defines `MODERATE` | Standardize vocabulary across backend and frontend. |
| **BUG-15** | Medium | Frontend | `frontend/app/intelligence/page.tsx:73` | Missing auth guard redirect; shows raw 401 error | No `useAuth` redirect check before calling API | Add redirect to `/login` if unauthenticated. |
| **BUG-16** | Medium | Frontend | `frontend/app/reports/page.tsx:50` | Missing auth guard redirect; shows raw 401 error | No `useAuth` redirect check before calling API | Add redirect to `/login` if unauthenticated. |
| **BUG-17** | Medium | Frontend | `frontend/app/settings/page.tsx:34` | Missing auth guard redirect; renders empty profile | No redirect check if `user` is null | Add redirect to `/login` if unauthenticated. |
| **BUG-18** | Low | Backend | `ai-service/app/repositories/notification_repository.py:70` | Alert generator only triggers on report generation | `check_and_generate_portfolio_alerts` called only in `report_service.py` | Call alert generator on position changes and intelligence views. |
| **BUG-19** | Low | Backend | `ai-service/app/repositories/audit_repository.py:8` | Audit logging only triggers on report generation | `log_audit_event` only called in `report_service.py` | Log portfolio CRUD, transactions, and risk evaluations. |
| **BUG-20** | Low | Backend | `ai-service/app/services/report_service.py:37` | Cash balance is unmanaged and hardcoded to 0.0 | `cash_bal = float(portfolio.get("cash_balance", 0.0))` | Add cash balance tracking or remove cash claim from reports. |

---

## 5. Dead-Code and Unused-Code Report

### 5.1 Unused Files
| File Path | Description / Evidence | Safe to Remove? | Recommended Action |
| :--- | :--- | :--- | :--- |
| `ai-service/package.json` | Stray npm manifest with placeholder `uvicorn: ^0.0.1-security`. Backend is pure Python. | YES | Delete file. |
| `ai-service/package-lock.json` | Lockfile generated by accidental `npm install` in Python backend folder. | YES | Delete file. |
| `ai-service/node_modules/` | Stray node_modules directory inside Python backend folder. | YES | Delete directory. |
| `ai-service/app/models/portfolio_analysis.py` | Empty 0-byte file inside `models/` directory. | YES | Delete file. |
| `frontend/types/prediction.ts` | 7-line file defining `PredictionHistory`. Unused; `lib/api.ts` defines its own `PredictionHistoryItem`. | YES | Delete file. |
| `frontend/services/` | Empty directory with zero files. | YES | Delete directory. |
| `frontend/app/test-api/page.tsx` | Debug test page verifying FastAPI `/health`. Reachable at `/test-api`. | YES | Delete route folder. |
| `frontend/app/test-risk/page.tsx` | Debug test page calling `/api/v1/risk` with hardcoded dictionary. Reachable at `/test-risk`. | YES | Delete route folder. |
| `ai-service/audit_milestone4.py` | One-off test audit script in backend root. | YES | Move to `tests/scripts/` or delete. |
| `ai-service/audit_milestone5.py` | One-off test audit script in backend root. | YES | Move to `tests/scripts/` or delete. |
| `ai-service/audit_milestone6.py` | One-off test audit script in backend root. | YES | Move to `tests/scripts/` or delete. |

### 5.2 Unused Components in Frontend
| Component File | Symbol Name | Evidence of Dead Code | Safe to Remove? | Recommended Action |
| :--- | :--- | :--- | :--- | :--- |
| `frontend/components/google-sign-in-button.tsx` | `GoogleSignInButton` | Grep shows 0 imports across entire frontend. `/login` implements its own inline button. | YES | Delete or refactor login page to use it. |
| `frontend/components/risk-probabilities.tsx` | `RiskProbabilities` | Grep shows 0 imports across entire frontend. `/dashboard` and `/intelligence` render custom bars. | YES | Delete component. |
| `frontend/components/shap-contributors.tsx` | `ShapContributors` | Grep shows 0 imports across entire frontend. Custom SHAP cards are used in `/intelligence`. | YES | Delete component. |
| `frontend/components/sign-out-button.tsx` | `SignOutButton` | Grep shows 0 imports across entire frontend. Header and Settings use inline `signOut()`. | YES | Delete component. |

### 5.3 Unused Backend Endpoints & Methods (No Frontend Consumer)
| Endpoint / Function | File | Evidence | Risk | Recommended Action |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/v1/predictions/save` | `ai-service/app/api/prediction_history.py` | `savePrediction` defined in `api.ts` is never called by any UI component. | Low | Connect "Save Prediction" button in `/intelligence` or deprecate. |
| `GET /api/v1/predictions` | `ai-service/app/api/prediction_history.py` | `getPredictionHistory` defined in `api.ts` is never called by any UI component. | Low | Build prediction history widget in `/intelligence` or deprecate. |
| `GET /api/v1/predictions/{id}` | `ai-service/app/api/prediction_history.py` | Never called by frontend. | Low | Maintain for API completeness or deprecate. |
| `POST /api/v1/recommendations` | `ai-service/app/api/recommendations.py` | `getRecommendations` in `api.ts` is never called by any UI component. | Low | Deprecate in favor of `/portfolios/{id}/intelligence`. |
| `POST /api/v1/predict-risk` & `/risk` | `ai-service/app/api/risk.py` | Only invoked by test route `frontend/app/test-risk/page.tsx`. | Low | Deprecate in favor of `/portfolios/{id}/intelligence`. |
| `POST /api/v1/explain-risk` | `ai-service/app/api/explain.py` | Never called by frontend. | Low | Deprecate in favor of `/portfolios/{id}/intelligence`. |
| `GET /api/v1/portfolios/{id}/analytics` | `ai-service/app/api/portfolios.py` | Superseded by `/intelligence`. `api.ts` has `getPortfolioAnalytics` but UI does not use it. | Low | Deprecate in favor of `/intelligence`. |
| `get_recent_predictions()` | `ai-service/app/repositories/prediction_repository.py` | Unused global un-isolated query fallback. | Low | Delete method. |
| `get_prediction_by_id()` | `ai-service/app/repositories/prediction_repository.py` | Unused un-isolated query fallback. | Low | Delete method. |

---

## 6. Feature Verification Matrix

| Feature | Frontend Page | Backend Endpoint | Database Collection | End-to-End Status | Identified Problems |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **User Sign-Up / Login** | `/login` | Handled via Firebase Client SDK + `POST /auth/me` | `users` | **Fully working** | Auth bypass on backend if `dev_auth_enabled=True` or forged `kid`. |
| **Portfolio Creation** | `/portfolios` | `POST /api/v1/portfolios` | `portfolios`, `portfolio_snapshots` | **Fully working** | Initial baseline snapshot recorded properly. |
| **Portfolio Deletion** | `/portfolios` | `DELETE /api/v1/portfolios/{id}` | `portfolios`, `holdings`, `transactions` | **Partially working** | Incomplete cascade: leaves orphaned snapshots, predictions, reports. |
| **Portfolio Selection** | Header Dropdown | State synchronized across views | LocalStorage / Context | **Fully working** | Switches context dynamically. |
| **Holdings Listing & CRUD**| `/holdings` | `GET/POST/PUT/DELETE /api/v1/holdings` | `holdings` | **Fully working** | Live quote overlay and weight calculation work smoothly. |
| **Transaction Recording** | `/transactions` | `POST /api/v1/transactions` | `transactions`, `holdings`, `portfolio_snapshots` | **Fully working** | BUY/SELL updates holdings and calculates realized P&L. |
| **Transaction Deletion** | `/transactions` | `DELETE /api/v1/transactions/{id}` | `transactions` | **Broken** | Deleting transaction does not reverse holdings or portfolio P&L. |
| **Cash Balance** | Missing in UI | Missing in Schema (Hardcoded 0.0 in reports) | Not persisted | **Not implemented** | Claimed in reports but never tracked in portfolios. |
| **Portfolio Valuation** | `/dashboard` | `GET /api/v1/portfolios/{id}/command-center` | Real-time computed from quotes | **Fully working** | Fast-loop valuation endpoint in `stream.py` has ObjectId bug. |
| **Historical Snapshots** | `/dashboard` | `POST /api/v1/portfolios/{id}/snapshots` | `portfolio_snapshots` | **Fully working** | "Take Snapshot" button creates immutable checkpoint. |
| **Benchmark Comparison** | `/dashboard` | `GET /api/v1/portfolios/{id}/performance` | Synchronized with NIFTY 50 | **Fully working** | Displays relative ROI against NIFTY 50 timeline. |
| **ML Risk Prediction** | `/intelligence` | `GET /api/v1/portfolios/{id}/intelligence` | Real-time computed | **Partially working** | 22 of 36 features default to 0.0 at runtime. |
| **SHAP Explanations** | `/intelligence` | `GET /api/v1/portfolios/{id}/intelligence` | Real-time computed | **Fully working** | Translates raw SHAP values into top positive & negative drivers. |
| **Health Scorecard** | `/intelligence` | `GET /api/v1/portfolios/{id}/intelligence` | Real-time computed | **Fully working** | 4-pillar scorecard with mathematical transparency drawer. |
| **What-If Simulation** | `/intelligence` | `POST /api/v1/portfolios/{id}/simulate` | Stateless (No DB mutation) | **Fully working** | Pure functional sandbox testing rebalanced allocations. |
| **Prediction Persistence** | Missing in UI | `POST /api/v1/predictions/save` | `predictions` | **Backend-only** | Backend endpoint works, but no button or action in UI calls it. |
| **Prediction History** | Missing in UI | `GET /api/v1/predictions` | `predictions` | **Backend-only** | Backend endpoint works, but no UI screen displays history. |
| **Stock Search** | Quick modal & `/markets` | `GET /api/v1/stocks/search` | `data/company_names.json` + live | **Fully working** | Real-time debounce autocomplete across 292 symbols. |
| **Stock Quotes & Detail** | `/markets` | `GET /api/v1/markets/stocks/{symbol}` | Yahoo / Reference snapshot | **Fully working** | OHLCV history, SMAs, 52W range, and portfolio exposure. |
| **Watchlist CRUD** | `/watchlist` | `GET/POST/DELETE /api/v1/watchlists` | `watchlists` | **Fully working** | Custom watchlist creation and symbol toggling verified. |
| **Market Ticker & SSE** | Global Header | `GET /api/v1/markets/stream` | SSE Broadcast via Yahoo/Memory | **Fully working** | Flashing price updates and session heartbeat indicator. |
| **Capital Gains (FIFO)** | `/reports` | `GET /api/v1/portfolios/{id}/tax-report` | Transactions ledger | **Fully working** | Accurate calendar-month holding period and STCG/LTCG math. |
| **Tax Loss Harvesting** | `/reports` | `GET /api/v1/portfolios/{id}/tax-report` | Real-time calculated | **Fully working** | Identifies unrealized loss positions to offset capital gains. |
| **ITR Schedule Export** | `/reports` | `GET /api/v1/portfolios/{id}/tax-report/export-csv`| File download stream | **Fully working** | Produces downloadable CSV compatible with tax filings. |
| **Investor Dossier** | `/reports` | `GET /api/v1/portfolios/{id}/report` | `reports` | **Fully working** | Generates immutable report snapshot with hash verification. |
| **Audit Logs** | `/reports` | `GET /api/v1/audit-logs` | `audit_logs` | **Partially working** | Only logs report generation; ignores CRUD & inference actions. |
| **IPO Radar** | `/ipo` | `GET /api/v1/ipo` | Hardcoded Python List | **Partially working** | Renders detailed UI, but backed by static mock list. |
| **Market News** | `/news` | `GET /api/v1/news` | Hardcoded Python List | **Partially working** | Renders news & macro indicators, but backed by static mock list. |
| **Portfolio News** | `/news` | `GET /api/v1/news/portfolio/{id}` | Hardcoded + Holdings | **Broken** | Crashes with TypeError (missing user_id argument). |
| **In-App Notifications** | Header Bell | `GET/POST /api/v1/notifications` | `notifications` | **Partially working** | Read/unread UI works, but alerts only generated during report creation. |

---

## 7. Security and Authentication Audit

### 7.1 Authentication Architecture
- **Provider:** Firebase Authentication (Google OAuth + Email/Password).
- **Backend Verification:** `firebase_auth.py` fetches Google's public x509 PEM certificates from `https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com` and decodes tokens with `algorithms=["RS256"]`.
- **Vulnerabilities Identified:**
  1. **CRIT-01 (Signature Bypass):** Fallback decodes JWTs with `verify_signature: False` if key ID is unrecognized.
  2. **CRIT-02 (Dev Bypass):** `dev_auth_enabled: bool = True` accepts `mock_token_*` blindly.

### 7.2 Authorization and Data Isolation
- **Tenant Isolation:** Every repository query uses `{ "_id": ..., "user_id": current_user.uid }`. User isolation is properly enforced across portfolios, holdings, transactions, snapshots, and reports. Cross-user IDOR attempts return HTTP 404 or 401.
- **Unauthenticated Endpoints:** `/predict-risk`, `/risk`, `/explain-risk`, and `/recommendations` have no user authentication dependencies. While acceptable for a public playground, they should be rate-limited or deprecated.

### 7.3 CORS and Security Headers
- **Security Headers:** `SecurityHeadersMiddleware` properly attaches `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and `Referrer-Policy: strict-origin-when-cross-origin`.
- **CORS Misconfiguration:** `allow_origin_regex=r"https://.*|http://localhost:.*|http://127.0.0.1:.*"` matches any HTTPS domain on the web.

### 7.4 Secret Management
- `ai-service/.env` contains plaintext MongoDB Atlas credentials and Upstox API keys. This file must be scrubbed, rotated, and added to `.gitignore`.

---

## 8. AI / Machine Learning Audit

### 8.1 Dataset and Ground-Truth Integrity
- **Dataset Source:** `ml/datasets/portfolio/portfolio_risk_summary.parquet` (1,000 synthetic portfolios; 800 train, 200 test).
- **Label Generation:** In `rebalance_risk_labels.py`, risk labels are assigned using a deterministic rule:
  ```python
  if volatility <= 0.185 and hhi <= 0.18: return "LOW"
  if volatility >= 0.225 or hhi >= 0.36: return "HIGH"
  return "MEDIUM"
  ```
  **Finding:** The "ground truth" risk classification is not based on historical market crashes, real fund ratings, or default events. It is a synthetic rule based on two variables (`annualized_volatility` and `hhi`).
- **Data Leakage Mitigation:** `hhi` and `diversification_score` were properly dropped prior to XGBoost training in `05_xgboost_dataset_preparation.py` to prevent trivial label leakage.

### 8.2 Model Training and Evaluation Metrics
- **Model Architecture:** XGBoost Classifier (`n_estimators=500, max_depth=5, learning_rate=0.05, reg_alpha=0.1, reg_lambda=1.0, early_stopping_rounds=25`).
- **Best Iteration:** 193.
- **Actual Evaluation Metrics (`xgboost_metrics.json`):**
  - **Accuracy:** `0.9100` (91.0%)
  - **Precision:** `0.9142` (91.4%)
  - **Recall:** `0.9100` (91.0%)
  - **F1 Score:** `0.9098` (91.0%)
- **Discrepancy:** Documentation, presentation slides, and the frontend login page claim **97.0% accuracy**. The true model accuracy is **91.0%**.

### 8.3 Runtime Inference & Feature Engineering
- **Feature Consistency Defect:** The model requires 36 features in a specific order. The runtime derivation function only computes 14 features. Missing features default to `0.0`, including all 18 sector allocation percentages.
- **Approximated Financial Math:** Ratios like `annualized_volatility` and `portfolio_beta` are derived from asset class weight heuristics rather than historical price covariance matrices:
  ```python
  annualized_volatility = max(0.08, min(0.65, 0.12 + equity_weight * 0.14 + crypto_weight * 0.40 - debt_weight * 0.06))
  portfolio_beta = max(0.40, min(2.50, 0.70 + equity_weight * 0.45 + crypto_weight * 1.20 - debt_weight * 0.30))
  ```
  While computationally fast (< 2ms), this is an approximation and must be clearly disclosed in academic documentation rather than claimed as true historical time-series volatility.

### 8.4 Explainability (TreeSHAP)
- **Implementation:** `shap_explainer.pkl` is loaded via Joblib and evaluates `TreeExplainer(model).shap_values(df)`.
- **Output:** SHAP values match the predicted class, and `shap_translation_service.py` effectively groups drivers into mitigators and amplifiers with contextual financial narratives.

---

## 9. Database and Data Integrity Audit

### 9.1 Collections Overview
| Collection Name | Purpose | Actively Used? | Cascade Deletion? |
| :--- | :--- | :--- | :--- |
| `portfolios` | Portfolio entities and realized P&L | YES | Root entity |
| `holdings` | Current active positions per portfolio | YES | Deleted on portfolio deletion |
| `transactions` | Ledger of BUY/SELL trades | YES | Deleted on portfolio deletion |
| `portfolio_snapshots`| Valuation timeline checkpoints | YES | **NO (Orphaned on portfolio delete)** |
| `predictions` | Persisted AI risk evaluations | YES (Backend only) | **NO (Orphaned on portfolio delete)** |
| `reports` | Saved investor dossiers | YES | **NO (Orphaned on portfolio delete)** |
| `audit_logs` | Immutable audit event trail | YES | Retained (intended for audit) |
| `notifications` | In-app user alerts | YES | Retained |
| `watchlists` | User stock watchlists | YES | User-scoped |
| `users` | User profile sync | YES | User-scoped |

### 9.2 Indexation Defect
`ensure_db_indexes()` in `mongodb.py` defines compound indexes for `portfolio_snapshots`, `transactions`, `holdings`, and `portfolios`. However, **it is never called anywhere in the codebase**. Indexes are not being created automatically.

### 9.3 Ledger Consistency Defect
`apply_sell_transaction` increments `portfolios.realized_pnl` and reduces holding quantities. However, `delete_transaction` merely deletes the transaction document without adjusting holdings or realized P&L.

---

## 10. Testing & Static Analysis Report

### 10.1 Backend Test Suite (Pytest)
- **Command Executed:**
  ```powershell
  d:\nexfolio\ai-service\venv\Scripts\python.exe -m pytest
  ```
- **Execution Result:** `64 passed, 6013 warnings in 86.74s`
- **Passed Test Modules:**
  - `test_auth_isolation.py` (7 tests)
  - `test_broker_adapters.py` (5 tests)
  - `test_command_center.py` (3 tests)
  - `test_degradation_chain.py` (2 tests)
  - `test_fast_valuation.py` (2 tests)
  - `test_hardening.py` (4 tests)
  - `test_intelligence.py` (4 tests)
  - `test_ipo_service.py` (3 tests)
  - `test_live_acceptance.py` (1 test)
  - `test_market_data_layer.py` (5 tests)
  - `test_markets_watchlist.py` (5 tests)
  - `test_news_service.py` (3 tests)
  - `test_portfolio_crud.py` (2 tests)
  - `test_reports_notifications.py` (3 tests)
  - `test_symbol_normalizer.py` (3 tests)
  - `test_tax_service.py` (7 tests)
  - `test_transactions_holdings.py` (2 tests)
  - `test_upstox_adapter.py` (3 tests)
- **Warnings Analysis:**
  - `StarletteDeprecationWarning`: TestClient httpx compatibility notice.
  - `UserWarning`: XGBoost model serialized with older version; recommending `Booster.save_model`.
  - `6,010 DeprecationWarnings`: NumPy 2.5 shape assignment deprecation in `joblib/numpy_pickle.py`.
- **Untested / Defective Areas:**
  - `GET /api/v1/news/portfolio/{id}` was not tested with actual portfolio holdings, masking BUG-04.
  - Cascade deletion completeness on snapshots/reports was untested.

### 10.2 Frontend Static Analysis
- **TypeScript Compiler Check:**
  - **Command:** `npx tsc --noEmit`
  - **Result:** `Exited with code 0` (Zero TypeScript compilation errors).
- **ESLint Linting:**
  - **Command:** `npm run lint`
  - **Result:** `Exited with code 0` (Zero ESLint warnings or errors).
- **Missing Frontend Tests:**
  - There are **zero unit or integration tests** in the frontend (no Vitest, Jest, or Playwright installed).

---

## 11. Documentation and Presentation Discrepancies

| Topic / Claim | Claimed in PPT / Docs / Reports | Actual Code Implementation | Status / Finding |
| :--- | :--- | :--- | :--- |
| **Model Accuracy** | "97.0% Accuracy [Champion]" claimed in Review 1 PPT, PDF reports, figures, and `/login`. | **91.0% Accuracy** (`xgboost_metrics.json`: `0.9100`). | **Discrepancy / Exaggeration** |
| **Base Paper Model** | "Deep CNN-LSTM: 84.0% accuracy, 45ms latency benchmarked in Fig 2." | Zero CNN-LSTM code or trained models exist in the repository. | **Literature Citation presented as Code Benchmark** |
| **Feature Vector Size** | "36-feature institutional vector evaluated in real time." | Model requires 36; code computes 14; 22 features default to 0.0. | **Incomplete Runtime Implementation** |
| **Stock Market Forecasting** | "AI predicts market crashes and future stock movements." | Model predicts synthetic portfolio risk category from static weight heuristics. | **Misleading Capability Claim** |
| **IPO & News Feeds** | "Real-time institutional news sentiment and live IPO radar." | Static, hardcoded in-memory Python lists (`_ipos_database`, `_macro_indicators`). | **Simulated / Mock Feature** |
| **NexFolio 2.0 Spec** | "Broker 1-click sync, CAMS CAS PDF parser, Zerodha Basket, RAG Copilot." | Documented in `NEXFOLIO_2.0_FEATURE_SPECIFICATION.md` but completely unbuilt. | **Future Specification Only** |
| **Audit Logs** | "Immutable regulatory audit trail logging all user & AI actions." | Only logs report generation; ignores portfolio CRUD, holdings, transactions, and predictions. | **Incomplete Implementation** |
| **Cash Management** | "Portfolio cash balance tracking." | Hardcoded to 0.0 in reports; no deposit/withdraw transactions or schema fields exist. | **Unimplemented Claim** |

---

## 12. Prioritized Fix Roadmap

### Phase 1 — Critical (Immediate Security & Crash Fixes)
*Must be resolved prior to any production deployment.*

1. **FIX-01 [CRIT-01]: Eliminate JWT Signature Bypass**
   - **Files:** `ai-service/app/services/firebase_auth.py`
   - **Action:** Delete unverified decode fallback (lines 91–102). Reject any token whose signature cannot be verified with Google's public certs.
   - **Risk:** Low. Prevents unauthorized access.
   - **Testing:** Verify with valid Firebase token and reject forged tokens.

2. **FIX-02 [CRIT-02]: Disable Development Auth Bypass by Default**
   - **Files:** `ai-service/app/config/settings.py`, `ai-service/app/services/firebase_auth.py`
   - **Action:** Set `dev_auth_enabled = False` by default. Allow mock tokens only when `ENVIRONMENT == "development"` and explicitly enabled.
   - **Risk:** None.
   - **Testing:** Confirm `mock_token_*` returns 401 Unauthorized in production mode.

3. **FIX-03 [CRIT-03]: Scrub Plaintext Secrets from `.env` and Rotate Credentials**
   - **Files:** `ai-service/.env`, `.gitignore`
   - **Action:** Rotate Atlas password and Upstox tokens. Replace `.env` with placeholder variables and add `.env` to `.gitignore`.
   - **Risk:** Low.
   - **Testing:** Verify app starts using environment variables injected by host.

4. **FIX-04 [CRIT-04]: Restrict CORS Origins**
   - **Files:** `ai-service/app/main.py`
   - **Action:** Remove broad regex `https://.*`. Restrict strictly to `settings.allowed_origins`.
   - **Risk:** Low.
   - **Testing:** Verify frontend domain connects; unauthorized domains blocked.

5. **FIX-05 [CRIT-05]: Fix Portfolio News Crash**
   - **Files:** `ai-service/app/api/v1/endpoints/news.py`
   - **Action:** Pass `current_user.uid` to `get_holdings_by_portfolio(portfolio_id, current_user.uid)`.
   - **Risk:** None.
   - **Testing:** Call `GET /api/v1/news/portfolio/{id}` and confirm 200 OK response.

---

### Phase 2 — High Priority (Correctness & ML Integrity)
*Important for mathematical accuracy and data integrity.*

6. **FIX-06 [CRIT-06]: Complete 36-Feature Vector at Runtime**
   - **Files:** `ai-service/app/services/portfolio_analytics_service.py`
   - **Action:** Compute 18 sector allocation percentages and estimate remaining features (`trading_days`, `total_return`, rolling drawdowns) so the XGBoost model receives all 36 expected features.
   - **Risk:** Low.
   - **Testing:** Assert all 36 keys in `feature_metadata.json` are present in runtime feature dictionary before prediction.

7. **FIX-07 [BUG-05]: Fix Fast Valuation ObjectId Query**
   - **Files:** `ai-service/app/api/stream.py`
   - **Action:** Use `_to_id_query` so string portfolio IDs match MongoDB `ObjectId`s.
   - **Risk:** None.
   - **Testing:** Query `/api/v1/portfolios/{id}/valuation` with valid ID; verify 200 OK.

8. **FIX-08 [BUG-08]: Invalidate Intelligence Cache on Composition Change & Add Max Size**
   - **Files:** `ai-service/app/services/intelligence_service.py`
   - **Action:** Include holding symbols and quantities in cache key. Implement bounded cache (max 200 entries).
   - **Risk:** Low.
   - **Testing:** Update holding; verify immediate re-computation of risk intelligence.

9. **FIX-09 [BUG-10]: Reverse Holdings & Realized P&L on Transaction Deletion**
   - **Files:** `ai-service/app/repositories/transaction_repository.py`
   - **Action:** Revert holding quantity and recalculate average buy price when a BUY is deleted; restore holding quantity and reverse realized P&L when a SELL is deleted.
   - **Risk:** Medium (requires careful ledger math).
   - **Testing:** Add transaction, verify holding updates, delete transaction, verify holding restores to previous state.

10. **FIX-10 [BUG-11]: Complete Cascade Deletion on Portfolios**
    - **Files:** `ai-service/app/repositories/portfolio_repository.py`
    - **Action:** Delete matching records in `portfolio_snapshots`, `predictions`, and `reports` when a portfolio is deleted.
    - **Risk:** Low.
    - **Testing:** Delete portfolio; verify zero orphaned records in any collection.

11. **FIX-11 [BUG-12]: Invoke Database Indexes on Startup**
    - **Files:** `ai-service/app/main.py`
    - **Action:** Add FastAPI `lifespan` context manager calling `await ensure_db_indexes()`.
    - **Risk:** Low.
    - **Testing:** Check `get_indexes()` on MongoDB collections after startup.

---

### Phase 3 — Medium Priority (Maintainability & UX Polish)
*Improves user experience and eliminates dead code.*

12. **FIX-12 [BUG-15, BUG-16, BUG-17]: Add Client Auth Guards to Frontend Pages**
    - **Files:** `frontend/app/intelligence/page.tsx`, `reports/page.tsx`, `settings/page.tsx`, `markets/page.tsx`, `watchlist/page.tsx`, `ipo/page.tsx`, `news/page.tsx`
    - **Action:** Add `useEffect` checking `!authLoading && !user` to redirect unauthenticated users to `/login`.
    - **Risk:** Low.
    - **Testing:** Visit routes in incognito without session; verify automatic redirect to `/login`.

13. **FIX-13 [DEAD-01, DEAD-02]: Clean Up Dead Frontend Components & Types**
    - **Files:** Delete `google-sign-in-button.tsx`, `risk-probabilities.tsx`, `shap-contributors.tsx`, `sign-out-button.tsx`, `frontend/types/prediction.ts`, `frontend/services/`.
    - **Risk:** Low.
    - **Testing:** Run `npx tsc --noEmit` and `npm run build` to confirm zero broken imports.

14. **FIX-14 [DEAD-03, DEAD-04]: Remove Ghost NPM Artifacts & Empty Model File in Backend**
    - **Files:** Delete `ai-service/package.json`, `ai-service/package-lock.json`, `ai-service/node_modules/`, `ai-service/app/models/portfolio_analysis.py`.
    - **Risk:** None.
    - **Testing:** Run `pytest` to confirm tests pass cleanly.

15. **FIX-15 [DEAD-07]: Remove Public Test Routes**
    - **Files:** Delete `frontend/app/test-api/` and `frontend/app/test-risk/`.
    - **Risk:** None.
    - **Testing:** Verify production route tree has no leftover debug endpoints.

16. **FIX-16 [BUG-13]: Standardize Environment Variable Names**
    - **Files:** `ai-service/.env.example`, `docker-compose.yml`, `ai-service/app/db/mongodb.py`, `ai-service/app/config/settings.py`
    - **Action:** Standardize on `MONGODB_DATABASE` across all configuration files.
    - **Risk:** Low.

---

### Phase 4 — Low Priority (Documentation Alignment & Feature Completion)
*Harmonizes project claims with code reality.*

17. **FIX-17 [DISC-01]: Align Documentation & Presentation Accuracy Claims**
    - **Files:** Presentation decks, PDF report generators (`generate_pdf_report.py`, `generate_clean_figures.py`, etc.), `frontend/app/login/page.tsx`
    - **Action:** Correct accuracy claims from "97%" to the actual verified "91%". Clarify that CNN-LSTM is a cited literature comparison rather than a reproduced benchmark.
    - **Risk:** Low.
    - **Testing:** Re-generate presentations and figures.

18. **FIX-18 [DEAD-05]: Connect Prediction History UI or Clean Up Endpoints**
    - **Files:** `frontend/app/intelligence/page.tsx`, `ai-service/app/api/prediction_history.py`
    - **Action:** Add a "Save Evaluation to History" button and historical prediction table in `/intelligence`, connecting the existing backend endpoints.
    - **Risk:** Low.

---

## 13. Final Verdict

### Component Ratings (1 to 10)
- **Architecture:** `8.5 / 10` — Clean modular FastAPI structure; great separation of concerns.
- **Frontend Quality:** `8.0 / 10` — Visually stunning, responsive, and feature-dense; docked for missing auth redirects and unused components.
- **Backend Quality:** `7.5 / 10` — High-speed endpoints and good schema validation; docked for news crash and ledger deletion drift.
- **Database Layer:** `7.0 / 10` — Good compound index specifications, but indexes are never created and cascade deletions are incomplete.
- **Authentication:** `4.0 / 10` — Severely compromised by JWT signature bypass fallback and default mock auth.
- **Security Posture:** `4.0 / 10` — Compromised by plaintext committed secrets, wide CORS regex, and auth bypass.
- **Machine Learning:** `6.0 / 10` — Real XGBoost model and TreeSHAP explainer work, but 61% of runtime features default to 0.0 and labels are synthetic.
- **Explainability (XAI):** `9.0 / 10` — Excellent human-readable translation of game-theoretic Shapley attributions.
- **Testing:** `7.5 / 10` — 64 backend tests passing; zero frontend automated tests.
- **Documentation:** `6.5 / 10` — Exhaustive and detailed, but claims 97% accuracy instead of 91% and claims unbuilt 2.0 features.
- **Maintainability:** `7.5 / 10` — Strong typing with Pydantic and TypeScript; easy to refactor.

### Composite Evaluation
- **Academic Review Readiness:** **CONDITIONAL PASS (Grade: B+)**  
  *Ready for academic presentation provided the 91% accuracy figure is stated truthfully and the synthetic nature of the dataset is openly acknowledged.*
- **Production Readiness:** **FAIL (BLOCKERS PRESENT)**  
  *Unfit for production until Security Phase 1 fixes are applied.*
- **Overall Score:** **7.1 / 10**

### Biggest Production Blockers
1. JWT Signature Verification Bypass (`firebase_auth.py:91-102`).
2. Default-Enabled Mock Authentication (`settings.py:22`).
3. Plaintext Production Secrets in Git (`ai-service/.env`).
4. News Endpoint 500 Crash (`news.py:59`).
5. Missing 22 Features at ML Runtime (`portfolio_analytics_service.py:159`).

---

## STRICT NOTICE
*This audit report has been generated without altering or refactoring any project source code. All findings have been preserved in their original state. Please review the findings and confirm which phases of the Prioritized Fix Roadmap you would like implemented.*
