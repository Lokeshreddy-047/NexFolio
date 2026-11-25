# COMPLETE PROJECT AUDIT FOR IEEE RESEARCH PAPER
## Implementation Evidence Extraction & Technical Truth Verification
**Project Name:** NexFolio 2.0 (Explainable AI-Based Portfolio Risk Profiling and Market Analytics Framework with FIFO-Based Tax Computation)  
**Repository Path:** `E:\nexfolio`  
**Audit Date:** November 4, 2026  
**Auditor Roles:** Senior Software Architect, Machine Learning Researcher, Quantitative Finance Analyst, Technical Auditor  
**Scope:** Full-repository empirical inspection across source code, schemas, ML training scripts, serialized artifacts, tests, configurations, and documentation.

---

## SECTION A: EXECUTIVE SUMMARY

This audit presents an exhaustive, evidence-based technical evaluation of the **NexFolio 2.0** repository to extract ground-truth technical specifications, empirical experimental findings, and architectural facts required to finalize an IEEE conference research paper.

### 1. High-Level Subsystem Verification
- **Architecture**: A decoupled Three-Tier Architecture is **VERIFIED IN CODE**. The presentation tier is built on Next.js 15.5.23 and React 19.1.0; the application tier uses FastAPI 0.115.12 running under Uvicorn ASGI; the persistence tier uses MongoDB 7.0 via Motor 3.7.1, complemented by in-memory serialized ML artifacts.
- **Machine Learning Subsystem**: The primary classifier is an **Extreme Gradient Boosting Classifier** (`xgboost.XGBClassifier` v2.1.4) operating on a **36-feature input matrix**. The model achieves **91.00% test accuracy**, **0.9142 precision**, **0.9100 recall**, and **0.9098 Macro-F1** on a holdout test split of 200 synthetic portfolios, with **zero extreme Type II misclassifications**.
- **Nature of Target Labels**: Ground-truth risk labels (`LOW`, `MEDIUM`, `HIGH`) were **100% deterministically generated** by mathematical rules on `annualized_volatility` and `hhi`. The model functions as a **non-linear surrogate model / rule boundary approximator**, not an empirical default/bankruptcy predictor.
- **Explainability**: **TreeSHAP** (`shap.TreeExplainer`) is **VERIFIED IN CODE**. Slices Shapley values dynamically for the predicted risk class (`shap_values[prediction][0]`) and decomposes probability shifts into top 5 amplifiers and top 5 mitigators, translated into plain-English investment narratives.
- **Statutory FIFO Tax Engine**: **VERIFIED IN CODE & TESTS**. Fully deterministic, zero-ML capital gains realization engine implementing provisions of the **Income-tax Act, 2025** (effective Assessment Year 2026–27) and Finance Act amendments: STCG @ 20%, LTCG @ 12.5% exceeding ₹1,25,000 threshold, 4% Health & Education Cess, corporate buyback rates (22% domestic company, 30% other promoter), Section 70/71 loss set-off hierarchy, and an 8-year loss carryforward bank.
- **What-If Sandbox**: **VERIFIED IN CODE**. A pure functional, in-memory simulation engine (`simulate_what_if_risk`) evaluates hypothetical portfolio allocation shifts without writing to or mutating MongoDB records.
- **Market Data Pedigree**: **VERIFIED IN CODE & TESTS**. A 6-state data pedigree framework (`LIVE`, `DELAYED`, `SIMULATED`, `REFERENCE`, `FALLBACK_REFERENCE`, `UNAVAILABLE`) ensures provenance transparency and graceful degradation.

### 2. Critical Findings & IEEE Paper Discrepancies
1. **Linear Baseline Parity**: On the exact 36-feature reduced input matrix, **Logistic Regression achieved 91.00% test accuracy**, matching XGBoost's 91.00%. The justification for XGBoost is **not** an empirical accuracy superiority over linear baselines, but its capacity to model non-linear sector/drawdown feature interactions and its out-of-the-box integration with polynomial-time **TreeSHAP** ($O(TLD^2)$), avoiding the feature-independence fallacy of Linear SHAP.
2. **Pre-Split Imputation & Early Stopping Leakage**: Global median imputation (`X.fillna(X.median())`) was executed across all 1,000 samples prior to `train_test_split()`. In `06_xgboost_training.py`, early stopping monitored `(X_test, y_test)` directly, halting boosting at iteration 193. Both constitute minor methodological leakages that must be transparently disclosed in the paper.
3. **Absence of Feature Standardization**: While paper drafts mention standardizing $X$ using $(\mu_{train}, \sigma_{train})$, the source code does **not** scale features with `StandardScaler`—tree-based gradient boosters are invariant to monotonic feature scaling.
4. **Health Scorecard Formula Divergence**: The implemented formula in `portfolio_analytics_service.py` clamps scores between `[15, 98]` and excludes beta from the volatility component, directly contradicting Table 3.1 in the project report drafts.
5. **Fast Loop Latency Target**: The claimed "< 5ms" fast loop valuation is an architectural design target and unit-test assertion, but **no standalone wall-clock micro-benchmarking script** exists in the repository.

---

## SECTION B: VERIFIED TECHNOLOGY STACK

| Component Layer | Technology / Package | Exact Version | Verification Evidence (File & Lines) | Implementation Status |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Framework** | Next.js (App Router, Turbopack) | `15.5.23` | [`frontend/package.json#L12`](file:///e:/nexfolio/frontend/package.json#L12) | IMPLEMENTED |
| **Frontend UI Library** | React / React DOM | `19.1.0` | [`frontend/package.json#L13-L14`](file:///e:/nexfolio/frontend/package.json#L13-L14) | IMPLEMENTED |
| **Frontend Language** | TypeScript | `^5` (5.8) | [`frontend/package.json#L26`](file:///e:/nexfolio/frontend/package.json#L26), [`frontend/tsconfig.json`](file:///e:/nexfolio/frontend/tsconfig.json) | IMPLEMENTED |
| **Frontend Styling** | Tailwind CSS / PostCSS | `^4` (4.0) | [`frontend/package.json#L21,L25`](file:///e:/nexfolio/frontend/package.json#L21) | IMPLEMENTED |
| **Frontend Motion** | Framer Motion | `^13.1.1` | [`frontend/package.json#L10`](file:///e:/nexfolio/frontend/package.json#L10) | IMPLEMENTED |
| **Frontend Charts** | Recharts | `^3.10.1` | [`frontend/package.json#L15`](file:///e:/nexfolio/frontend/package.json#L15) | IMPLEMENTED |
| **Frontend Icons** | Lucide React | `^1.31.0` | [`frontend/package.json#L11`](file:///e:/nexfolio/frontend/package.json#L11) | IMPLEMENTED |
| **Frontend Auth SDK** | Firebase Web SDK | `^12.17.1` | [`frontend/package.json#L9`](file:///e:/nexfolio/frontend/package.json#L9), [`frontend/lib/firebase.ts`](file:///e:/nexfolio/frontend/lib/firebase.ts) | IMPLEMENTED |
| **Backend Framework** | FastAPI | `0.115.12` | [`ai-service/requirements.txt#L1`](file:///e:/nexfolio/ai-service/requirements.txt#L1), [`ai-service/app/main.py#L38`](file:///e:/nexfolio/ai-service/app/main.py#L38) | IMPLEMENTED |
| **ASGI Web Server** | Uvicorn (standard) | `0.34.0` | [`ai-service/requirements.txt#L2`](file:///e:/nexfolio/ai-service/requirements.txt#L2), [`ai-service/Dockerfile#L44`](file:///e:/nexfolio/ai-service/Dockerfile#L44) | IMPLEMENTED |
| **Backend Runtime** | Python | `3.12-slim` | [`ai-service/Dockerfile#L4,L20`](file:///e:/nexfolio/ai-service/Dockerfile#L4) | IMPLEMENTED |
| **Data Validation** | Pydantic / Settings | `2.10.6` / `2.6.1` | [`ai-service/requirements.txt#L3-L4`](file:///e:/nexfolio/ai-service/requirements.txt#L3-L4) | IMPLEMENTED |
| **Database Server** | MongoDB Community Server | `7.0` | [`docker-compose.yml#L6-L20`](file:///e:/nexfolio/docker-compose.yml#L6) | IMPLEMENTED |
| **Database Driver** | Motor (Async) / PyMongo | `3.7.1` / `4.11.1`| [`ai-service/requirements.txt#L13-L14`](file:///e:/nexfolio/ai-service/requirements.txt#L13-L14), [`ai-service/app/db/mongodb.py#L12`](file:///e:/nexfolio/ai-service/app/db/mongodb.py#L12) | IMPLEMENTED |
| **Client Authentication** | Firebase Authentication | Google Identity | [`frontend/lib/firebase.ts#L18`](file:///e:/nexfolio/frontend/lib/firebase.ts#L18) | IMPLEMENTED |
| **Backend Auth Validation**| Google Public x509 PKI (RS256)| PyJWT `2.8.0` / Crypto `42.0.0` | [`ai-service/app/services/firebase_auth.py#L70-L115`](file:///e:/nexfolio/ai-service/app/services/firebase_auth.py#L70) | IMPLEMENTED |
| **Gradient Boosting** | XGBoost | `2.1.4` | [`ai-service/requirements.txt#L9`](file:///e:/nexfolio/ai-service/requirements.txt#L9), [`ai-service/ml/training/06_xgboost_training.py#L5`](file:///e:/nexfolio/ai-service/ml/training/06_xgboost_training.py#L5) | IMPLEMENTED |
| **Explainable AI (XAI)** | SHAP (TreeExplainer) | `0.47.2` | [`ai-service/requirements.txt#L10`](file:///e:/nexfolio/ai-service/requirements.txt#L10), [`ai-service/app/services/explainability_service.py#L26`](file:///e:/nexfolio/ai-service/app/services/explainability_service.py#L26) | IMPLEMENTED |
| **Numerical & Tabular** | NumPy / Pandas | `2.2.3` / `2.2.3` | [`ai-service/requirements.txt#L6-L7`](file:///e:/nexfolio/ai-service/requirements.txt#L6-L7) | IMPLEMENTED |
| **Machine Learning Base** | Scikit-learn / Joblib | `1.5.2` / `1.4.2` | [`ai-service/requirements.txt#L8,L11`](file:///e:/nexfolio/ai-service/requirements.txt#L8) | IMPLEMENTED |
| **Binary Parquet I/O** | PyArrow | `18.1.0` | [`ai-service/requirements.txt#L12`](file:///e:/nexfolio/ai-service/requirements.txt#L12) | IMPLEMENTED |
| **Primary Live Market Feed**| Upstox WebSocket API v2 | Protobuf Feed | [`ai-service/app/services/market_data/adapters/upstox_adapter.py#L22`](file:///e:/nexfolio/ai-service/app/services/market_data/adapters/upstox_adapter.py#L22) | PARTIALLY IMPLEMENTED (Market data feed only; no live order placement) |
| **Fallback Market Data** | Yahoo Finance REST / Parquet | HTTPX `0.28.0` | [`ai-service/app/services/market_data/adapters/yahoo_adapter.py#L18`](file:///e:/nexfolio/ai-service/app/services/market_data/adapters/yahoo_adapter.py#L18) | IMPLEMENTED |
| **Reverse Proxy / Gateway**| Nginx Alpine | `1.25-alpine` | [`docker-compose.yml#L83-L94`](file:///e:/nexfolio/docker-compose.yml#L83), [`nginx/nginx.conf`](file:///e:/nexfolio/nginx/nginx.conf) | IMPLEMENTED |
| **Automated Testing** | Pytest / pytest-asyncio | `>=8.0.0` / `>=0.23.0` | [`ai-service/requirements.txt#L21-L22`](file:///e:/nexfolio/ai-service/requirements.txt#L21-L22), [`ai-service/pytest.ini`](file:///e:/nexfolio/ai-service/pytest.ini) | IMPLEMENTED |

### Asynchronous Workers and Background Tasks Verification
- **Background Execution Model**: NexFolio **does not** deploy an external distributed queue (such as Celery, Redis Queue, or RabbitMQ).
- **In-Process Concurrency**: Asynchronous concurrency is handled entirely within Python's native `asyncio` event loop using FastAPI's asynchronous endpoint handlers (`async def`) and Motor's non-blocking I/O.
- **Server-Sent Events (SSE)**: Quote streaming to the client is managed via async generators yielding SSE events in [`ai-service/app/api/stream.py`](file:///e:/nexfolio/ai-service/app/api/stream.py).
- **Periodic Retraining Schedulers**: **NOT FOUND**. Model retraining is manual via scripts in `ai-service/ml/training/`. There is no active cron or Celery Beat scheduler.

---

## SECTION C: THREE-TIER ARCHITECTURE

The architecture is partitioned into three decoupled tiers:

```
+---------------------------------------------------------------------------------------+
|                                1. PRESENTATION TIER                                   |
|   Next.js 15.5.23 | React 19.1.0 | Tailwind CSS v4 | Recharts | SSE Market Client    |
|   App Router: /dashboard, /portfolios, /intelligence, /holdings, /transactions, /reports |
+-------------------------------------------+-------------------------------------------+
                                            | HTTPS / WSS / Bearer JWT (Google PKI)
+-------------------------------------------v-------------------------------------------+
|                        2. APPLICATION & PROCESSING TIER                               |
|   FastAPI 0.115.12 | Python 3.12 | Uvicorn ASGI | 19 Modular Router Controllers       |
|                                                                                       |
|   [Security Middleware Stack]      [Stateless Auth Dependency]                        |
|   - SecurityHeadersMiddleware       - RS256 Key Verification (Google x509 PKI)        |
|   - SlidingWindowRateLimiter       - Production Mock Token Lockdown                   |
|                                                                                       |
|   [Core Domain Services]                                                              |
|   - RealtimeValuationEngine (Fast Loop, <5ms target, in-memory quotes, zero ML)       |
|   - PortfolioAnalyticsService (36-feature vector derivation, 4-Pillar Scorecard)      |
|   - PredictionService (Loads xgboost_risk_model.pkl, outputs LOW/MODERATE/HIGH)      |
|   - ExplainabilityService (TreeSHAP exact attribution, slices predicted class)       |
|   - SHAPTranslationService (Translates Shapley values to plain-English narratives)    |
|   - TaxService (Income-tax Act, 2025 FIFO lot matcher, Section 112A, Loss Banking)   |
|   - MarketDataManager (6-State Pedigree FSM, Upstox/Yahoo/Parquet adapters, cache)   |
+-------------------------------------------+-------------------------------------------+
                                            | Async Motor TCP / In-Memory RAM Loaders
+-------------------------------------------v-------------------------------------------+
|                                3. PERSISTENCE TIER                                    |
|   [MongoDB 7.0 Document Store]     [In-Memory Model & Feature Artifacts]              |
|   - users, portfolios, holdings    - xgboost_risk_model.pkl (726 KB XGBoost binary)   |
|   - transactions, snapshots        - shap_explainer.pkl (736 KB TreeExplainer binary) |
|   - predictions, portfolio_reports - feature_metadata.json (36 feature definitions)   |
|   - notifications, watchlists      - feature_store.parquet (828k rows x 89 cols)      |
+---------------------------------------------------------------------------------------+
```

### Verified Router & Controller Layout
The controllers are located in [`ai-service/app/api/`](file:///e:/nexfolio/ai-service/app/api/) (17 router files) and [`ai-service/app/api/v1/endpoints/`](file:///e:/nexfolio/ai-service/app/api/v1/endpoints/) (2 router files).  
FastAPI runtime introspection registers **67 total routes**:
- **63 Application API Endpoints** (Authentication, Portfolios, Holdings, Transactions, Intelligence, Risk, Explain, Recommendations, Markets, Stocks, Stream, Stress Test, Reports, Tax, Watchlists, Notifications, IPO, News).
- **4 OpenAPI/Documentation Routes** (`/docs`, `/redoc`, `/openapi.json`, `/`).

### Request and Data Flow
1. **Client Dispatches Request**: The user interacts with Next.js components. For authenticated requests, client-side Firebase Auth issues a signed ID Token, transmitted via HTTP Header `Authorization: Bearer <ID_TOKEN>`.
2. **Gateway & Security Filtering**: Nginx terminates external SSL and passes requests to Uvicorn at `127.0.0.1:8000`. `SecurityHeadersMiddleware` validates origin against `ALLOWED_ORIGINS` and `SlidingWindowRateLimiter` enforces window quotas (300 req/min general, 60 req/min for ML routes).
3. **Stateless PKI Verification**: `get_current_user` extracts the JWT `kid`, fetches Google's rotating public x509 certs, verifies the RS256 signature, validates `aud=FIREBASE_PROJECT_ID`, and yields a validated `UserPrincipal(uid)`.
4. **Data Isolation in Repositories**: Repository functions (`portfolio_repository.py`, `holding_repository.py`, `transaction_repository.py`) construct queries strictly scoped by `{"user_id": current_user.uid}`, preventing tenant cross-talk.
5. **Fast vs Slow Processing**:
   - For fast valuation (`/portfolios/{id}/valuation`), `RealtimeValuationEngine` executes in memory using cached quotes from `MarketDataManager` without ML invocation.
   - For intelligence profiling (`/portfolios/{id}/intelligence`), `portfolio_analytics_service.py` derives the 36-feature vector, calls `predict_portfolio_risk()` (XGBoost), `explain_portfolio_risk()` (TreeSHAP), `calculate_health_score()`, and caches the result for 60s in an LRU memory cache.

---

## SECTION D: COMPLETE INVENTORY OF THE 36 ML FEATURES

The 36 features expected by the trained XGBoost model were extracted directly from [`ai-service/ml/datasets/portfolio/xgboost_ready/feature_metadata.json`](file:///e:/nexfolio/ai-service/ml/datasets/portfolio/xgboost_ready/feature_metadata.json#L3-L40) and verified in [`ai-service/ml/training/05_xgboost_dataset_preparation.py`](file:///e:/nexfolio/ai-service/ml/training/05_xgboost_dataset_preparation.py#L48-L64).

### Master 36-Feature Table

| No. | Feature Name | Category | Source Field | Calculation Formula / Derivation | Lookback Window | Output Unit | Implementation File & Lines | Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | `trading_days` | Time & Horizon | `date` | Count of distinct historical trading dates in observation horizon | Full history (252d min) | Integer count | [`return_volatility_engine.py#L58`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/return_volatility_engine.py#L58) | IMPLEMENTED |
| 2 | `total_return` | Return & Momentum | `portfolio_cumulative_return` | $\prod_{t=1}^N (1 + R_{p,t}) - 1$ | Full horizon | Ratio (decimal) | [`return_volatility_engine.py#L36,L61`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/return_volatility_engine.py#L36) | IMPLEMENTED |
| 3 | `annualized_return` | Return & Momentum | `portfolio_daily_return` | $\bar{R}_p \times 252$ | 252 trading days | Annualized ratio | [`return_volatility_engine.py#L64`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/return_volatility_engine.py#L64) | IMPLEMENTED |
| 4 | `annualized_volatility`| Volatility & Tail Risk | `portfolio_daily_return` | $\sigma_{\text{daily}} \times \sqrt{252}$ | 252 trading days | Annualized ratio | [`return_volatility_engine.py#L65`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/return_volatility_engine.py#L65) | IMPLEMENTED |
| 5 | `return_1M` | Return & Momentum | `portfolio_daily_return` | $\prod_{t=N-20}^N (1 + R_{p,t}) - 1$ | 21 trading days | Ratio (decimal) | [`return_volatility_engine.py#L74`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/return_volatility_engine.py#L74) | IMPLEMENTED |
| 6 | `return_3M` | Return & Momentum | `portfolio_daily_return` | $\prod_{t=N-62}^N (1 + R_{p,t}) - 1$ | 63 trading days | Ratio (decimal) | [`return_volatility_engine.py#L75`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/return_volatility_engine.py#L75) | IMPLEMENTED |
| 7 | `return_6M` | Return & Momentum | `portfolio_daily_return` | $\prod_{t=N-125}^N (1 + R_{p,t}) - 1$ | 126 trading days | Ratio (decimal) | [`return_volatility_engine.py#L76`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/return_volatility_engine.py#L76) | IMPLEMENTED |
| 8 | `return_1Y` | Return & Momentum | `portfolio_daily_return` | $\prod_{t=N-251}^N (1 + R_{p,t}) - 1$ | 252 trading days | Ratio (decimal) | [`return_volatility_engine.py#L77`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/return_volatility_engine.py#L77) | IMPLEMENTED |
| 9 | `portfolio_max_drawdown`| Volatility & Tail Risk | `portfolio_value` | $\min_{\tau} \frac{V_\tau - \max_{s \le \tau} V_s}{\max_{s \le \tau} V_s}$ | Cumulative full horizon | Negative ratio | [`drawdown_risk_ratio_engine.py#L22,L25`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/drawdown_risk_ratio_engine.py#L22) | IMPLEMENTED |
| 10 | `rolling_max_drawdown_30d`| Volatility & Tail Risk | `portfolio_value` | $\min_{\tau} \left( \frac{V_\tau - \max_{s \in [\tau-29, \tau]} V_s}{\max_{s \in [\tau-29, \tau]} V_s} \right)$ | Rolling 30 trading days | Negative ratio | [`drawdown_risk_ratio_engine.py#L30-L31`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/drawdown_risk_ratio_engine.py#L30) | IMPLEMENTED |
| 11 | `rolling_max_drawdown_252d`| Volatility & Tail Risk | `portfolio_value` | $\min_{\tau} \left( \frac{V_\tau - \max_{s \in [\tau-251, \tau]} V_s}{\max_{s \in [\tau-251, \tau]} V_s} \right)$ | Rolling 252 trading days | Negative ratio | [`drawdown_risk_ratio_engine.py#L34-L35`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/drawdown_risk_ratio_engine.py#L34) | IMPLEMENTED |
| 12 | `downside_deviation_annualized`| Volatility & Tail Risk | `portfolio_daily_return` | $\sqrt{\frac{1}{N} \sum \min(0, R_{p,t} - \frac{R_f}{252})^2} \times \sqrt{252}$ ($R_f=0.06$) | 252 trading days | Annualized ratio | [`drawdown_risk_ratio_engine.py#L39-L45`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/drawdown_risk_ratio_engine.py#L39) | IMPLEMENTED |
| 13 | `portfolio_sharpe_ratio`| Risk-Adjusted Ratio | Returns & Volatility | $\frac{\text{annualized\_return} - 0.06}{\text{annualized\_volatility}}$ | 252 trading days | Dimensionless ratio | [`drawdown_risk_ratio_engine.py#L58`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/drawdown_risk_ratio_engine.py#L58) | IMPLEMENTED |
| 14 | `portfolio_sortino_ratio`| Risk-Adjusted Ratio | Returns & Downside | $\frac{\text{annualized\_return} - 0.06}{\text{downside\_deviation\_annualized}}$ | 252 trading days | Dimensionless ratio | [`drawdown_risk_ratio_engine.py#L60-L64`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/drawdown_risk_ratio_engine.py#L60) | IMPLEMENTED |
| 15 | `portfolio_calmar_ratio`| Risk-Adjusted Ratio | Returns & Max DD | $\frac{\text{annualized\_return}}{\vert \text{portfolio\_max\_drawdown} \vert}$ | Full horizon | Dimensionless ratio | [`drawdown_risk_ratio_engine.py#L66-L70`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/drawdown_risk_ratio_engine.py#L66) | IMPLEMENTED |
| 16 | `asset_count` | Structural / Breadth | `ticker` | Count of unique constituent securities in portfolio | Current portfolio state | Integer count | [`diversification_engine.py#L26`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L26) | IMPLEMENTED |
| 17 | `sector_count` | Structural / Breadth | `sector` | Count of distinct economic sectors represented | Current portfolio state | Integer count | [`diversification_engine.py#L22`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L22) | IMPLEMENTED |
| 18 | `sector_automobile_and_auto_components_pct`| Sector Exposure | `weight`, `sector` | $\sum_{i \in \text{Automobile}} w_i$ | Current allocation | Proportion [0.0, 1.0] | [`diversification_engine.py#L14-L18`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L14) | IMPLEMENTED |
| 19 | `sector_capital_goods_pct`| Sector Exposure | `weight`, `sector` | $\sum_{i \in \text{Capital Goods}} w_i$ | Current allocation | Proportion [0.0, 1.0] | [`diversification_engine.py#L14-L18`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L14) | IMPLEMENTED |
| 20 | `sector_chemicals_pct`| Sector Exposure | `weight`, `sector` | $\sum_{i \in \text{Chemicals}} w_i$ | Current allocation | Proportion [0.0, 1.0] | [`diversification_engine.py#L14-L18`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L14) | IMPLEMENTED |
| 21 | `sector_construction_pct`| Sector Exposure | `weight`, `sector` | $\sum_{i \in \text{Construction}} w_i$ | Current allocation | Proportion [0.0, 1.0] | [`diversification_engine.py#L14-L18`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L14) | IMPLEMENTED |
| 22 | `sector_construction_materials_pct`| Sector Exposure | `weight`, `sector` | $\sum_{i \in \text{Construction Materials}} w_i$ | Current allocation | Proportion [0.0, 1.0] | [`diversification_engine.py#L14-L18`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L14) | IMPLEMENTED |
| 23 | `sector_consumer_durables_pct`| Sector Exposure | `weight`, `sector` | $\sum_{i \in \text{Consumer Durables}} w_i$ | Current allocation | Proportion [0.0, 1.0] | [`diversification_engine.py#L14-L18`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L14) | IMPLEMENTED |
| 24 | `sector_consumer_services_pct`| Sector Exposure | `weight`, `sector` | $\sum_{i \in \text{Consumer Services}} w_i$ | Current allocation | Proportion [0.0, 1.0] | [`diversification_engine.py#L14-L18`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L14) | IMPLEMENTED |
| 25 | `sector_fmcg_pct` | Sector Exposure | `weight`, `sector` | $\sum_{i \in \text{FMCG}} w_i$ | Current allocation | Proportion [0.0, 1.0] | [`diversification_engine.py#L14-L18`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L14) | IMPLEMENTED |
| 26 | `sector_financial_services_pct`| Sector Exposure | `weight`, `sector` | $\sum_{i \in \text{Financial Services}} w_i$ | Current allocation | Proportion [0.0, 1.0] | [`diversification_engine.py#L14-L18`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L14) | IMPLEMENTED |
| 27 | `sector_healthcare_pct`| Sector Exposure | `weight`, `sector` | $\sum_{i \in \text{Healthcare}} w_i$ | Current allocation | Proportion [0.0, 1.0] | [`diversification_engine.py#L14-L18`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L14) | IMPLEMENTED |
| 28 | `sector_information_technology_pct`| Sector Exposure | `weight`, `sector` | $\sum_{i \in \text{Information Technology}} w_i$ | Current allocation | Proportion [0.0, 1.0] | [`diversification_engine.py#L14-L18`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L14) | IMPLEMENTED |
| 29 | `sector_metals_&_mining_pct`| Sector Exposure | `weight`, `sector` | $\sum_{i \in \text{Metals \& Mining}} w_i$ | Current allocation | Proportion [0.0, 1.0] | [`diversification_engine.py#L14-L18`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L14) | IMPLEMENTED |
| 30 | `sector_oil_gas_&_consumable_fuels_pct`| Sector Exposure | `weight`, `sector` | $\sum_{i \in \text{Oil Gas \& Consumable Fuels}} w_i$ | Current allocation | Proportion [0.0, 1.0] | [`diversification_engine.py#L14-L18`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L14) | IMPLEMENTED |
| 31 | `sector_power_pct` | Sector Exposure | `weight`, `sector` | $\sum_{i \in \text{Power}} w_i$ | Current allocation | Proportion [0.0, 1.0] | [`diversification_engine.py#L14-L18`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L14) | IMPLEMENTED |
| 32 | `sector_realty_pct` | Sector Exposure | `weight`, `sector` | $\sum_{i \in \text{Realty}} w_i$ | Current allocation | Proportion [0.0, 1.0] | [`diversification_engine.py#L14-L18`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L14) | IMPLEMENTED |
| 33 | `sector_services_pct` | Sector Exposure | `weight`, `sector` | $\sum_{i \in \text{Services}} w_i$ | Current allocation | Proportion [0.0, 1.0] | [`diversification_engine.py#L14-L18`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L14) | IMPLEMENTED |
| 34 | `sector_telecommunication_pct`| Sector Exposure | `weight`, `sector` | $\sum_{i \in \text{Telecommunication}} w_i$ | Current allocation | Proportion [0.0, 1.0] | [`diversification_engine.py#L14-L18`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L14) | IMPLEMENTED |
| 35 | `sector_textiles_pct` | Sector Exposure | `weight`, `sector` | $\sum_{i \in \text{Textiles}} w_i$ | Current allocation | Proportion [0.0, 1.0] | [`diversification_engine.py#L14-L18`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L14) | IMPLEMENTED |
| 36 | `portfolio_beta` | Systemic Sensitivity | Returns vs NIFTY 50 | $\frac{\text{Cov}(R_p, R_m)}{\text{Var}(R_m)}$ | 252 trading days | Dimensionless coefficient | [`risk_scoring_beta_engine.py#L25-L33`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/risk_scoring_beta_engine.py#L25) | IMPLEMENTED |

### Feature Count & Discrepancy Analysis
- **Exact Count**: Verified to be **exactly 36 features** in [`feature_metadata.json`](file:///e:/nexfolio/ai-service/ml/datasets/portfolio/xgboost_ready/feature_metadata.json).
- **Exact Ordering**: Verified by automated test [`test_gate_13_exact_36_feature_ordering`](file:///e:/nexfolio/ai-service/tests/test_release_gate.py#L418-L432). The inference pipeline (`extract_feature_order()`) loads `feature_names` dynamically from `feature_metadata.json`, guaranteeing 100% column order alignment between training and serving.
- **Removed Leakage Features**: 8 features were explicitly dropped in `05_xgboost_dataset_preparation.py` lines 52–64: `hhi`, `diversification_score`, `largest_sector_pct`, `top_3_holdings_pct`, `top_5_holdings_pct`, `concentration_warning`, `volatility_warning`, `diversification_warning`.
- **Duplicate & Unused Features**: None in the 36-feature matrix. In the raw feature store (`feature_store.parquet`), 89 asset-level features exist, but only 36 portfolio-aggregated features enter the classifier.
- **Scaling & Normalization**: **None**. Neither `StandardScaler` nor `MinMaxScaler` is applied. GBDTs are invariant to monotonic transformations.
- **Imputation**: Executed globally prior to split via `X = X.fillna(X.median())` ([line 70](file:///e:/nexfolio/ai-service/ml/training/05_xgboost_dataset_preparation.py#L70)).
- **Unit Scope**: All 36 features are computed **per portfolio** (not per asset).

### Sector Taxonomy (18 NSE Sectors)
Source: [`ai-service/ml/preprocessing/sector_mapping.json`](file:///e:/nexfolio/ai-service/ml/preprocessing/sector_mapping.json). Maps all 292 tickers to exactly 18 sectors:
1. Automobile and Auto Components
2. Capital Goods
3. Chemicals
4. Construction
5. Construction Materials
6. Consumer Durables
7. Consumer Services
8. FMCG
9. Financial Services
10. Healthcare
11. Information Technology
12. Metals & Mining
13. Oil Gas & Consumable Fuels
14. Power
15. Realty
16. Services
17. Telecommunication
18. Textiles

---

## SECTION E: XGBOOST MODEL CONFIGURATION

Verified directly in training script [`ai-service/ml/training/06_xgboost_training.py`](file:///e:/nexfolio/ai-service/ml/training/06_xgboost_training.py#L51-L66) and model artifact [`ai-service/ml/models/xgboost_risk_model.pkl`](file:///e:/nexfolio/ai-service/ml/models/xgboost_risk_model.pkl).

### Exact Configured Parameters Table

| Hyperparameter | Configured Value in Code | Source File & Line | Description / Purpose |
| :--- | :--- | :--- | :--- |
| **Model Class** | `xgboost.XGBClassifier` | `06_xgboost_training.py#L51` | Extreme Gradient Boosting Classifier |
| **Objective** | `multi:softprob` | `06_xgboost_training.py#L52` | Multiclass cross-entropy outputting softmax class probabilities |
| **Number of Classes (`num_class`)** | `3` | `06_xgboost_training.py#L53` | 0: LOW, 1: MEDIUM (MODERATE), 2: HIGH |
| **Number of Estimators (`n_estimators`)** | `500` | `06_xgboost_training.py#L54` | Maximum boosting iterations allowed |
| **Best Iteration Terminated** | `193` | [`xgboost_metrics.json#L6`](file:///e:/nexfolio/ai-service/ml/datasets/portfolio/phase7_reports/xgboost_metrics.json#L6) | Early stopping halted training at round 193 |
| **Maximum Tree Depth (`max_depth`)** | `5` | `06_xgboost_training.py#L55` | Constrains tree depth to limit non-linear feature interaction capacity |
| **Learning Rate (`learning_rate`)** | `0.05` | `06_xgboost_training.py#L56` | Step size shrinkage ($\eta$) to prevent overshoot |
| **Row Subsample Ratio (`subsample`)** | `0.8` | `06_xgboost_training.py#L57` | 80% random sample bagging per boosting tree |
| **Column Subsample Ratio (`colsample_bytree`)** | `0.8` | `06_xgboost_training.py#L58` | 80% random feature subsampling per tree |
| **Minimum Child Weight (`min_child_weight`)** | `3` | `06_xgboost_training.py#L59` | Minimum sum of instance Hessian weight needed in a child node |
| **L1 Regularization (`reg_alpha`)** | `0.1` | `06_xgboost_training.py#L60` | L1 regularization on leaf weights (encourages feature sparsity) |
| **L2 Regularization (`reg_lambda`)** | `1.0` | `06_xgboost_training.py#L61` | L2 regularization on leaf weights (shrinks leaf values) |
| **Splitting Cost (`gamma`)** | `0.0` *(library default)* | Unspecified in constructor | Minimum loss reduction required to make a further partition |
| **Evaluation Metric (`eval_metric`)** | `mlogloss` | `06_xgboost_training.py#L62` | Multiclass log-loss monitored during boosting |
| **Early Stopping Rounds** | `25` | `06_xgboost_training.py#L65` | Halts training if test loss does not improve for 25 consecutive rounds |
| **Random Seed (`random_state`)** | `42` | `06_xgboost_training.py#L63` | Guarantees deterministic tree construction |
| **Parallel Threads (`n_jobs`)** | `-1` | `06_xgboost_training.py#L64` | Uses all available CPU cores |
| **Class Weighting (`scale_pos_weight`)** | `None` *(unweighted)* | Unspecified in constructor | No class reweighting applied |

### Training, Inference & Operational Flow
1. **Training Flow**: `06_xgboost_training.py` loads `X_train.parquet` (800×36) and `y_train.parquet` (800), fitting with `eval_set=[(X_test, y_test)]`. Training terminates at round 193. The fitted model is serialized to `ml/models/xgboost_risk_model.pkl` (726 KB) using `joblib.dump()`.
2. **Inference Loading**: Loaded as a singleton in RAM on server startup via [`model_loader.py#L16-L20`](file:///e:/nexfolio/ai-service/app/services/model_loader.py#L16).
3. **Feature Ordering Verification**: `extract_feature_order()` extracts feature names from `feature_metadata.json` and builds a DataFrame `pd.DataFrame([row], columns=feature_order)`. Training and inference feature order are **100% identical**.
4. **Model Versioning**: Stored as a single flat binary file on disk. No MLflow or DVC version tracking is implemented.
5. **Periodic Retraining**: **None**. Retraining is triggered manually by re-running scripts.
6. **Hyperparameter Tuning**: Parameters were **manually configured / hardcoded** in `06_xgboost_training.py` based on quantitative heuristics; no automated GridSearch or Optuna tuning script was executed for XGBoost (unlike Random Forest which ran cross-validation).
7. **Probability Generation**: `model.predict_proba(df)[0]` outputs normalized softmax probabilities for `[LOW, MODERATE, HIGH]`. The maximum probability is assigned as `confidence`.

---

## SECTION F: RISK LABEL GENERATION (LOW, MODERATE, HIGH)

Ground truth training labels were audited in [`ai-service/ml/portfolio_analytics/risk_scoring_beta_engine.py`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/risk_scoring_beta_engine.py#L40-L50).

### Ground Truth Mathematical Formulation
Let $\sigma_{\text{ann}}$ be the portfolio's annualized return volatility, and let $\text{HHI} = \sum_{i=1}^K w_i^2$ be the Herfindahl-Hirschman Index of constituent asset weights. The categorical ground-truth target $Y \in \{\text{LOW}, \text{MEDIUM}, \text{HIGH}\}$ is generated by:

$$Y = \begin{cases} 
\text{LOW} & \text{if } \sigma_{\text{ann}} < 0.15 \text{ and } \text{HHI} < 0.15 \\
\text{HIGH} & \text{if } \sigma_{\text{ann}} > 0.25 \text{ or } \text{HHI} > 0.25 \\
\text{MEDIUM} & \text{otherwise}
\end{cases}$$

### Python Source Code
```python
# ai-service/ml/portfolio_analytics/risk_scoring_beta_engine.py, lines 41-49
volatility = final_df['annualized_volatility']
hhi = final_df['hhi']

conditions = [
    (volatility < 0.15) & (hhi < 0.15),
    (volatility > 0.25) | (hhi > 0.25)
]
choices = ['LOW', 'HIGH']
final_df['risk_category'] = np.select(conditions, choices, default='MEDIUM')
```

### Numerical Encodings & Distribution in Training Dataset
- **LOW** $\rightarrow 0$: 163 portfolios (**16.3%**)
- **MEDIUM (MODERATE)** $\rightarrow 1$: 503 portfolios (**50.3%**)
- **HIGH** $\rightarrow 2$: 334 portfolios (**33.4%**)
- **Total Universe**: 1,000 synthetic portfolios (100.0%)

### Threshold Configurability & Critical Academic Reality
- **Configurability**: Thresholds ($0.15, 0.25$) are **fixed and hardcoded** in `risk_scoring_beta_engine.py`.
- **Generation Timing**: Derived **after portfolio aggregation** across the 2,867 daily portfolio return series.
- **Rule-Derived Surrogate Nature**: The classifier is **not trained against independently observed financial defaults, bankruptcies, or forward market returns**. It was trained against deterministic heuristic rules. Because `hhi` was intentionally dropped prior to training to avoid direct leakage, the model learns to approximate whether a portfolio violates the concentration/volatility boundary using proxy features (drawdowns, Sortino, sector allocations).

---

## SECTION G: TRAIN/TEST SPLIT AND DATA-LEAKAGE AUDIT

### Dataset Construction Parameters
- **Historical Asset Universe**: **292 CSV files** in [`ai-service/ml/datasets/raw/`](file:///e:/nexfolio/ai-service/ml/datasets/raw/) representing NSE listed equities and benchmark indices (`^NSEI`, `^NSEBANK`, `^BSESN`). 289 equities have multi-year histories; 3 (`GSPL.NS`, `GUJGASLTD.NS`, `TMCV.NS`) have truncated histories (< 200 trading days).
- **Historical Time Horizon**: 2015-01-01 to 2026-08-07 (~2,867 trading days).
- **Generated Portfolios**: **1,000 synthetic portfolios** (`PORT_0001` through `PORT_1000`) generated via [`portfolio_builder.py`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/portfolio_builder.py) using `np.random.seed(42)`. Constituent holdings count uniformly sampled between 5 and 20 equities; serialized as **12,299 constituent holding rows** in [`sample_portfolios.csv`](file:///e:/nexfolio/ai-service/ml/datasets/portfolio/sample_portfolios.csv).
- **Split Ratio**: 80% train (800 samples) / 20% test (200 samples).
- **Split Type**: **Random stratified split** via `sklearn.model_selection.train_test_split(..., test_size=0.2, stratify=y, random_state=42)` in [`05_xgboost_dataset_preparation.py#L77-L83`](file:///e:/nexfolio/ai-service/ml/training/05_xgboost_dataset_preparation.py#L77).
- **Cross-Validation**: 5-fold Stratified Cross-Validation was performed for **Random Forest** in [`04_random_forest_ensemble.py#L100`](file:///e:/nexfolio/ai-service/ml/training/04_random_forest_ensemble.py#L100) yielding $86.25\% \pm 2.09\%$, but **no cross-validation** was run for XGBoost (single 80/20 train/test split).

### Comprehensive Data-Leakage Audit

| Leakage Category | Source Code Location | Verification Finding | Academic Impact Severity | Disclosure Required in Paper |
| :--- | :--- | :--- | :--- | :--- |
| **Pre-Split Imputation Leakage** | `05_xgboost_dataset_preparation.py#L70` | `X = X.fillna(X.median())` was executed across all 1,000 rows on line 70 before `train_test_split()` on line 77. | **Minor Leakage**: Feature median incorporates data from the 200 test samples. Missing values accounted for < 0.1% of cells, so quantitative impact is negligible. | Disclose that global median imputation preceded the split. Future work should fit `SimpleImputer` strictly on $X_{train}$. |
| **Early Stopping Test Leakage** | `06_xgboost_training.py#L70-L75` | `model.fit(X_train, y_train, eval_set=[(X_test, y_test)], early_stopping_rounds=25)` monitored test set loss directly. | **Methodological Leakage**: The holdout test set influenced model training by halting boosting at iteration 193. The test set was not purely pristine. | Disclose that early stopping monitored the test set directly. Recommend a 3-way split ($X_{train}, X_{val}, X_{test}$) in future work. |
| **Target Leakage** | `05_xgboost_dataset_preparation.py#L52-L64` | `hhi`, `diversification_score`, `largest_sector_pct`, `top_3_holdings_pct`, `top_5_holdings_pct`, and warning flags were dropped. | **Clean / Resolved**: Variables that directly encode the target labels were purged. | Confirmed clean. |
| **Look-Ahead Bias / Future Prices**| `ml/feature_engineering/` | Rolling metrics use backward-looking windows with `min_periods=win`. | **Clean**: No forward-looking price data used in rolling return/volatility metrics. | Confirmed clean. |
| **Overlapping Portfolio Samples** | `portfolio_builder.py` | 1,000 portfolios independently sampled via Dirichlet distributions. | **Clean**: Portfolios are distinct combinatorial entities; holdings vary between 5 and 20 assets. | Confirmed clean. |

---

## SECTION H: TREE SHAP EXPLAINABILITY

Verified in training script [`ai-service/ml/training/07_shap_global_analysis.py`](file:///e:/nexfolio/ai-service/ml/training/07_shap_global_analysis.py), runtime service [`ai-service/app/services/explainability_service.py`](file:///e:/nexfolio/ai-service/app/services/explainability_service.py), and translation service [`ai-service/app/services/shap_translation_service.py`](file:///e:/nexfolio/ai-service/app/services/shap_translation_service.py).

### Mathematical Formulation
TreeSHAP computes exact Shapley values in polynomial time $O(TLD^2)$ (where $T$ is tree count, $L$ is maximum leaves, and $D$ is maximum depth) based on cooperative game theory:

$$\phi_i(f, x) = \sum_{S \subseteq N \setminus \{i\}} \frac{|S|!(|N| - |S| - 1)!}{|N|!} \left[ f_x(S \cup \{i\}) - f_x(S) \right]$$

Satisfying the Efficiency Axiom: $\sum_{i=1}^{36} \phi_i(f, x) = f(x) - \mathbb{E}[f(x)]$.

### Implementation Details
- **Explainer Class**: `shap.TreeExplainer` fitted on `xgboost_risk_model.pkl` and serialized to [`ai-service/ml/models/shap_explainer.pkl`](file:///e:/nexfolio/ai-service/ml/models/shap_explainer.pkl) (736 KB).
- **Explained Output**: Explains the multi-class margin/probability output of the XGBoost classifier.
- **Scope**: Computed **per portfolio** dynamically at inference time.
- **Multiclass Handling**: In [`explainability_service.py#L34-L45`](file:///e:/nexfolio/ai-service/app/services/explainability_service.py#L34), the implementation predicts the class label first, then slices the SHAP values strictly for the **predicted class**:
  ```python
  prediction = int(model.predict(df)[0])
  shap_values = explainer.shap_values(df)
  if isinstance(shap_values, list):
      values = shap_values[prediction][0]
  elif len(shap_values.shape) == 3:
      values = shap_values[0, :, prediction]
  else:
      values = shap_values[0]
  ```
  This guarantees that displayed explanations explain *why the model selected that specific risk category*.
- **Local Selection**: Filters features into:
  - **Top 5 Positive Contributors (Amplifiers)**: $\phi_i > 0$, sorted descending.
  - **Top 5 Negative Contributors (Mitigators)**: $\phi_i < 0$, sorted ascending.
- **Plain-English Translation**: `shap_translation_service.py` maps feature names and impact signs to structured headline, narrative, and contextual recommendation cards (e.g., `annualized_volatility` $\rightarrow$ "Heightened Volatility Regime" vs "Controlled Portfolio Volatility").
- **Dynamic vs Stored**: Explanations are **generated dynamically at runtime** for user portfolios. Offline global importances are stored in `shap_global_importance.csv`.

---

## SECTION I: FOUR-PILLAR PORTFOLIO HEALTH SCORECARD

The scorecard is implemented in [`ai-service/app/services/portfolio_analytics_service.py#L286-L306`](file:///e:/nexfolio/ai-service/app/services/portfolio_analytics_service.py#L286).

### Pillar Mathematical Formulations

```python
def calculate_health_score(metrics: Dict[str, float]) -> int:
    # Pillar 1: Diversification (25%)
    div_component = min(100.0, metrics["diversification_score"]) * 0.25

    # Pillar 2: Volatility Moderation (25%)
    vol = metrics["annualized_volatility"]
    vol_component = max(0.0, min(100.0, (1.0 - (vol / 0.40)) * 100.0)) * 0.25

    # Pillar 3: Sharpe Ratio / Return Efficiency (25%)
    sharpe = metrics["portfolio_sharpe_ratio"]
    sharpe_component = max(0.0, min(100.0, (sharpe + 1.0) / 3.0 * 100.0)) * 0.25

    # Pillar 4: Drawdown Resilience (25%)
    mdd = abs(metrics["portfolio_max_drawdown"])
    drawdown_component = max(0.0, min(100.0, (1.0 - (mdd / 0.50)) * 100.0)) * 0.25

    total_score = int(round(div_component + vol_component + sharpe_component + drawdown_component))
    return max(15, min(98, total_score))
```

### Detailed Pillar Breakdown

| Pillar Dimension | Weight | Input Variable | Normalization Formula | Boundary Conditions & Thresholds | Component Max Points |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **1. Diversification** | 25% | `diversification_score` | $\min(100.0, \text{div\_score}) \times 0.25$ | Derived as $\max(10, \min(100, (1-\text{HHI})\times 100 + \min(2N, 20)))$ | 25.0 |
| **2. Volatility Moderation** | 25% | `annualized_volatility` | $\max\left(0, \min\left(100, \left(1 - \frac{\sigma_{\text{ann}}}{0.40}\right) \times 100\right)\right) \times 0.25$ | $\sigma_{\text{ann}} = 0 \rightarrow 25$ pts; $\sigma_{\text{ann}} \ge 0.40 \rightarrow 0$ pts | 25.0 |
| **3. Return Efficiency** | 25% | `portfolio_sharpe_ratio`| $\max\left(0, \min\left(100, \frac{\text{Sharpe} + 1.0}{3.0} \times 100\right)\right) \times 0.25$ | $\text{Sharpe} \le -1.0 \rightarrow 0$ pts; $\text{Sharpe} \ge 2.0 \rightarrow 25$ pts | 25.0 |
| **4. Drawdown Resilience** | 25% | `portfolio_max_drawdown`| $\max\left(0, \min\left(100, \left(1 - \frac{\vert\text{MDD}\vert}{0.50}\right) \times 100\right)\right) \times 0.25$ | $\vert\text{MDD}\vert = 0 \rightarrow 25$ pts; $\vert\text{MDD}\vert \ge 0.50 \rightarrow 0$ pts | 25.0 |

### Critical Findings on Scorecard
1. **Clamping Range**: The composite score is clamped to **`[15, 98]`** via `max(15, min(98, total_score))` on line 306. A portfolio never scores 0 or 100.
2. **Missing-Data Handling**: Default feature values are provided by `FINANCIAL_FALLBACK_DEFAULTS` in `prediction_service.py` if metrics are missing.
3. **Weighting**: Equal weighting ($25\%$ per pillar) is strictly applied.
4. **Independence from XGBoost**: The scorecard is **100% independent of the XGBoost classifier**. It calculates scores deterministically from continuous econometric metrics.
5. **Contradiction with Report Drafts**: Table 3.1 in `report_chapter_3.py` proposed:
   - Volatility Pillar: $\min(25, \max(0, (15 - 40\sigma) + \max(0, 10 - 10\vert\beta-1\vert) + 5))$.
   - Drawdown Pillar: $\min(25, \max(0, 25 - 65\vert\text{MDD}\vert))$.
   - The actual implemented code in `portfolio_analytics_service.py` **omits beta entirely from the health score**, and uses different linear slope denominators ($0.40$ for volatility, $0.50$ for MDD, $3.0$ range for Sharpe). The IEEE paper must publish the verified code formulas.

---

## SECTION J: PORTFOLIO MATHEMATICAL DEFINITIONS

### 1. Portfolio Return
- **Formula**: $R_{p,t} = \sum_{i=1}^K w_i R_{i,t}$, where $R_{i,t} = \frac{P_{i,t} - P_{i,t-1}}{P_{i,t-1}}$.
- **Weight Assumption**: In offline reconstruction ([`return_volatility_engine.py#L28-L31`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/return_volatility_engine.py#L28)), weights $w_i$ are **fixed beginning-of-period weights**.
- **Rebalancing**: **No periodic rebalancing is assumed** during historical time-series generation.
- **Transaction Costs**: **Zero transaction costs** are incorporated into historical return series.
- **Missing Asset Prices**: Filled with `0.0` daily return (`feature_df['daily_return'].fillna(0)`) to simulate cash drag prior to an equity's IPO date.

### 2. Annualized Volatility
- **Formula**: $\sigma_{\text{ann}} = \sigma_{\text{daily}} \times \sqrt{252} = \sqrt{\frac{1}{N-1}\sum_{t=1}^N (R_{p,t} - \bar{R}_p)^2} \times \sqrt{252}$ ([`return_volatility_engine.py#L65`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/return_volatility_engine.py#L65)).

### 3. Sharpe Ratio
- **Formula**: $\text{Sharpe} = \frac{\text{annualized\_return} - R_f}{\text{annualized\_volatility}}$.
- **Risk-Free Rate**: $R_f = 0.06$ (6.0% per annum) in [`drawdown_risk_ratio_engine.py#L5`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/drawdown_risk_ratio_engine.py#L5) and [`portfolio_analytics_service.py#L234`](file:///e:/nexfolio/ai-service/app/services/portfolio_analytics_service.py#L234). (Note: Report Chapter 3 cited 6.5% / 7.0%, which is a documentation contradiction).

### 4. Portfolio Beta
- **Formula**: $\beta_p = \frac{\text{Cov}(R_p, R_m)}{\text{Var}(R_m)}$, where $R_m$ is the daily return of the benchmark index (NIFTY 50, `^NSEI`). Implemented in [`risk_scoring_beta_engine.py#L25-L33`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/risk_scoring_beta_engine.py#L25).

### 5. Herfindahl-Hirschman Index (HHI) & Diversification Score
- **HHI Formula**: $\text{HHI} = \sum_{i=1}^K w_i^2$, where constituent weights satisfy $\sum w_i = 1.0$ and $w_i \ge 0$.
- **Interpretation**: $\text{HHI} \in (0, 1]$.
  - $\text{HHI} < 0.15$: Well diversified.
  - $0.15 \le \text{HHI} \le 0.25$: Moderate concentration.
  - $\text{HHI} > 0.25$: Highly concentrated.
- **Diversification Score**:
  - Offline engine ([`diversification_engine.py#L58`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/diversification_engine.py#L58)): $\text{Score} = \text{clip}((1.0 - \text{HHI}) \times 100, 0, 100)$.
  - Online serving ([`portfolio_analytics_service.py#L218`](file:///e:/nexfolio/ai-service/app/services/portfolio_analytics_service.py#L218)): $\text{Score} = \max(10.0, \min(100.0, (1.0 - \text{HHI}) \times 100.0 + \min(2N, 20.0)))$, which adds an asset breadth bonus of up to 20 points ($2N$).

---

## SECTION K: FIFO TAX COMPUTATION — INDIAN EQUITIES

Audited in [`ai-service/app/services/tax_service.py`](file:///e:/nexfolio/ai-service/app/services/tax_service.py) (726 lines) and verified by [`ai-service/tests/test_tax_service.py`](file:///e:/nexfolio/ai-service/tests/test_tax_service.py).

### Statutory Framework & Tax Rates Registry

| Tax Schedule | Governing Law | Effective Window | STCG Rate (Hold $\le$ 12M) | LTCG Rate (Hold > 12M) | Sec 112A Exemption | Cess Rate | Loss Carryforward |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Tax Year 2026-27** | Income-tax Act, 2025 | 2026-04-01 to 2027-03-31 | 20.0% (Sec 111A) | 12.5% (Sec 112A) | ₹1,25,000 | 4.0% | 8 Assessment Years |
| **FY 2025-26** | Income-tax Act, 1961 | 2025-04-01 to 2026-03-31 | 20.0% | 12.5% | ₹1,25,000 | 4.0% | 8 Assessment Years |
| **FY 2024-25** | Income-tax Act, 1961 | 2024-04-01 to 2025-03-31 | 20.0% | 12.5% | ₹1,25,000 | 4.0% | 8 Assessment Years |

### Tax Engine Implementation Status Inventory

| Tax Engine Subsystem | Status | Implementation Details / Code Reference |
| :--- | :---: | :--- |
| **Transaction Data Model** | IMPLEMENTED | Pydantic schemas in `app/schemas/tax.py`; transactions stored in MongoDB `transactions` collection. |
| **Purchase & Sale Formats** | IMPLEMENTED | Transaction types: `BUY`, `SELL`, `BUYBACK`. Fields: `quantity`, `price`, `transaction_date`, `stt_paid`, `promoter_category`. |
| **FIFO Lot Selection** | IMPLEMENTED | Uses `collections.deque` per canonical symbol ([`tax_service.py#L176,L203,L214`](file:///e:/nexfolio/ai-service/app/services/tax_service.py#L176)). Earliest lots popped first. |
| **Acquisition Lot Sorting** | IMPLEMENTED | `sorted_txs = sorted(raw_txs, key=lambda x: x.get('transaction_date'))` ([`tax_service.py#L174`](file:///e:/nexfolio/ai-service/app/services/tax_service.py#L174)). |
| **Partial Lot Handling** | IMPLEMENTED | When `remaining_sell_qty < earliest_lot['quantity']`, decrements open lot quantity in place ([`tax_service.py#L274`](file:///e:/nexfolio/ai-service/app/services/tax_service.py#L274)). |
| **Remaining Quantity Math** | IMPLEMENTED | When `earliest_lot['quantity'] <= 1e-6`, pops lot from deque ([`tax_service.py#L277`](file:///e:/nexfolio/ai-service/app/services/tax_service.py#L277)). |
| **Cost Basis Calculation** | IMPLEMENTED | $\text{Cost Basis} = \text{round}(\text{matched\_qty} \times \text{buy\_price}, 2)$ ([`tax_service.py#L222`](file:///e:/nexfolio/ai-service/app/services/tax_service.py#L222)). |
| **Realized Gain/Loss Math** | IMPLEMENTED | $\text{Realized PnL} = \text{round}(\text{sale\_proceeds} - \text{cost\_basis}, 2)$ ([`tax_service.py#L224`](file:///e:/nexfolio/ai-service/app/services/tax_service.py#L224)). |
| **Calendar Holding Period** | IMPLEMENTED | Exact calendar months comparison with leap year handling (Feb 29 $\rightarrow$ March 1 threshold) ([`tax_service.py#L127-L158`](file:///e:/nexfolio/ai-service/app/services/tax_service.py#L127)). |
| **STCG vs LTCG Classification**| IMPLEMENTED | Listed equity held $\le 12$ calendar months is Short-Term; held $> 12$ calendar months is Long-Term ([`tax_service.py#L157`](file:///e:/nexfolio/ai-service/app/services/tax_service.py#L157)). |
| **Section 70/71 Set-Off Hierarchy**| IMPLEMENTED | 1. STCL offsets STCG. 2. LTCL offsets 112A LTCG. 3. Unabsorbed STCL offsets remaining 112A LTCG. 4. LTCL *never* offsets STCG ([`tax_service.py#L333-L347`](file:///e:/nexfolio/ai-service/app/services/tax_service.py#L333)). |
| **Loss Carryforward Logic** | IMPLEMENTED | Unabsorbed losses tracked in `TaxLossBank` for 8 succeeding assessment years ([`tax_service.py#L601-L624`](file:///e:/nexfolio/ai-service/app/services/tax_service.py#L601)). |
| **Corporate Buybacks** | IMPLEMENTED | Classified as capital gains (non-promoter retail) or statutory rates (22% domestic company, 30% other promoter) ([`tax_service.py#L228-L238`](file:///e:/nexfolio/ai-service/app/services/tax_service.py#L228)). |
| **Bonus Shares & Stock Splits**| NOT FOUND | No automated split adjustment or zero-cost bonus share lot insertion logic exists in `tax_service.py`. |
| **Rights Issues, Mergers** | NOT FOUND | No merger/demerger cost apportionment logic found. |
| **Securities Transaction Tax (STT)**| PARTIALLY IMPLEMENTED| `stt_paid` field exists in schema and is exported to CSV, but STT is **not deducted** from capital gains (which correctly adheres to Indian tax law Section 111A/112A). |
| **Transfer Expenses / Brokerage**| NOT FOUND | No explicit deduction of brokerage, exchange turnover fees, or stamp duty in `tax_service.py`. |
| **Rounding Rules** | IMPLEMENTED | Explicitly rounded to 2 decimal places using `round(x, 2)`. |

### Traceable FIFO Realization Examples (Verified by Unit Tests)

#### Example 1: One Sale Matched Against a Single Purchase Lot (Short-Term Gain)
- **Input BUY**: 100 shares of `RELIANCE.NS` @ ₹1,000 on 2026-01-01. (Invested: ₹1,00,000)
- **Input SELL**: 40 shares of `RELIANCE.NS` @ ₹1,500 on 2026-08-01.
- **Traceable Execution** ([`test_tax_service.py#L54-L97`](file:///e:/nexfolio/ai-service/tests/test_tax_service.py#L54)):
  - Matched Quantity: $40$ shares.
  - Acquisition Cost Basis: $40 \times ₹1,000 = ₹40,000.00$.
  - Sale Consideration Proceeds: $40 \times ₹1,500 = ₹60,000.00$.
  - Realized P&L: $₹60,000 - ₹40,000 = +₹20,000.00$.
  - Holding Duration: 7 months (Jan 1 to Aug 1) $\le 12$ months $\rightarrow$ **STCG_111A**.
  - Tax Rate: $20.0\%$ base tax ($₹4,000.00$) $+ 4\%$ cess ($₹160.00$) $= ₹4,160.00$.
  - Remaining Open Lot: 60 shares @ ₹1,000.

#### Example 2: One Sale Matched Across Multiple Purchase Lots (Split Multi-Lot FIFO)
- **Input BUY Lot 1**: 50 shares of `INFY.NS` @ ₹1,200 on 2025-01-01. (LTCG vintage)
- **Input BUY Lot 2**: 50 shares of `INFY.NS` @ ₹1,600 on 2026-04-01. (STCG vintage)
- **Input SELL**: 70 shares of `INFY.NS` @ ₹2,000 on 2026-08-01.
- **Traceable Execution**:
  - **Sub-Lot 1**: Consumes all 50 shares from Lot 1.
    - Matched Quantity: $50$ shares.
    - Cost Basis: $50 \times ₹1,200 = ₹60,000.00$. Proceeds: $50 \times ₹2,000 = ₹1,00,000.00$.
    - Realized P&L: $+₹40,000.00$.
    - Holding Period: 19 months $> 12$ months $\rightarrow$ **LTCG_112A** (Base tax rate 12.5%).
  - **Sub-Lot 2**: Consumes 20 shares from Lot 2.
    - Matched Quantity: $20$ shares.
    - Cost Basis: $20 \times ₹1,600 = ₹32,000.00$. Proceeds: $20 \times ₹2,000 = ₹40,000.00$.
    - Realized P&L: $+₹8,000.00$.
    - Holding Period: 4 months $\le 12$ months $\rightarrow$ **STCG_111A** (Base tax rate 20.0%).
  - Remaining Open Lot: 30 shares in Lot 2 @ ₹1,600.

#### Example 3: Partial Lot Remaining & Section 112A Threshold Absorption
- **Input BUY**: 100 shares of `TCS.NS` @ ₹2,000 on 2025-01-01. (Cost: ₹2,00,000)
- **Input SELL**: 100 shares of `TCS.NS` @ ₹4,250 on 2026-06-01. (Proceeds: ₹4,25,000)
- **Traceable Execution** ([`test_tax_service.py#L110-L148`](file:///e:/nexfolio/ai-service/tests/test_tax_service.py#L110)):
  - Realized Gain: $₹4,25,000 - ₹2,00,000 = +₹2,25,000.00$.
  - Holding Period: 17 months $\rightarrow$ **LTCG_112A**.
  - Section 112A Statutory Exemption: $₹1,25,000.00$.
  - Threshold Consumed: $₹1,25,000.00$; Threshold Remaining: $₹0.00$.
  - Taxable LTCG: $₹2,25,000 - ₹1,25,000 = ₹1,00,000.00$.
  - Base Tax @ 12.5%: $₹12,500.00$.
  - 4% Health & Education Cess: $₹500.00$.
  - Total Estimated Tax Liability: $₹13,000.00$.

---

## SECTION L: WHAT-IF TAX SANDBOX

Verified in [`ai-service/app/services/intelligence_service.py#L390-L510`](file:///e:/nexfolio/ai-service/app/services/intelligence_service.py#L390) and test [`ai-service/tests/test_intelligence.py#L134-L192`](file:///e:/nexfolio/ai-service/tests/test_intelligence.py#L134).

### Operational Architecture of What-If Simulation
- **Endpoint**: `POST /api/v1/portfolios/{portfolio_id}/simulate`.
- **Pure In-Memory Functional Sandbox**: Operates entirely in RAM on transient request objects (`WhatIfSimulationRequest`).
- **Database Non-Mutation**: The service **never** writes temporary records, shadow collections, or virtual transactions to MongoDB. Verified by test `test_what_if_simulation_sandbox_isolation`:
  ```python
  # ai-service/tests/test_intelligence.py, line 185
  # Confirm holdings count in DB is STILL exactly 1 (Zero database mutations!)
  holdings_after = await get_holdings_by_portfolio(port_id, USER_A)
  assert len(holdings_after) == 1
  ```
- **Recalculation Flow**:
  1. Validates simulated allocations (e.g. `equity_pct=50, etf_pct=20, debt_pct=15, gold_pct=15, crypto_pct=0`).
  2. Normalizes allocation percentages to 100%.
  3. Reconstructs a simulated 36-feature vector $X_{sim}$ in RAM.
  4. Dispatches $X_{sim}$ to `predict_portfolio_risk()`, `explain_portfolio_risk()`, and `calculate_health_score()`.
  5. Computes structured `SimulationMetricDelta` comparing baseline vs simulated volatility, beta, Sharpe, and diversification score.
  6. Discards all virtual objects upon returning JSON.
- **Tax Harvesting Simulator**: In `tax_service.py` (`analyze_harvesting_opportunities`), candidate holdings with unrealized losses are evaluated in memory against the capital gains schedule to project `post_harvest_estimated_tax_liability`, also without database mutation.
- **Clarification for IEEE Paper**: What-If simulation operates on **portfolio asset allocation, risk category, and health score**, while Tax Loss Harvesting operates as an unrealized loss scanner. There is **no persistent "What-If Tax Transaction" database table**.

---

## SECTION M: MARKET DATA PEDIGREE AND SIX DATA CONDITIONS

Verified in [`ai-service/app/schemas/market.py#L7-L13`](file:///e:/nexfolio/ai-service/app/schemas/market.py#L7), [`ai-service/app/services/market_data/live_provider.py#L109-L124`](file:///e:/nexfolio/ai-service/app/services/market_data/live_provider.py#L109), [`ai-service/app/services/market_data/market_session.py`](file:///e:/nexfolio/ai-service/app/services/market_data/market_session.py), and test [`ai-service/tests/test_degradation_chain.py`](file:///e:/nexfolio/ai-service/tests/test_degradation_chain.py).

### The Six Named Data Conditions

| Pedigree State (DataBadge) | Detection & Trigger Conditions | Source / Provider | Freshness Threshold | System Fallback Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **`LIVE`** | Active WebSocket connection; heartbeat fresh; regular trading hours (09:15–15:30 IST) | Upstox API v2 / Authorized Broker | Age $\le 60.0$ seconds | Emits live quote ticks; updates fast valuation cache |
| **`DELAYED`** | Feed connected, but heartbeat age exceeds max staleness | Upstox or Yahoo Finance fallback | Age $> 60.0$ seconds | Flags `is_stale=True`; alerts UI with amber badge |
| **`SIMULATED`** | Test harness or sandbox environment active | `SimulatedLiveFeedAdapter` | Algorithmic tick clock | Emits synthetic prices; explicitly marked (never falsified as LIVE) |
| **`REFERENCE`** | Offline mode, development, or academic benchmarking | `ReferenceMarketProvider` | Static closing prices | Serves closing quotes from curated Parquet dataset (292 NSE stocks) |
| **`FALLBACK_REFERENCE`** | Primary live broker disconnects or unhandled exception occurs | `LiveMarketProvider` fallback | N/A (Static fallback) | Gracefully falls back to static Parquet reference; prevents 500 error |
| **`UNAVAILABLE`** | Complete provider disconnection and reference store missing | System failure | Heartbeat missing | Disengages valuation streaming; returns standardized error envelope |

### Finite State Machine (FSM) Transition Table

| Source State | Event / Trigger | Guard Condition | Destination State | Implementation Code Reference |
| :--- | :--- | :--- | :--- | :--- |
| `REFERENCE` | Application boots in `live` mode | Valid Upstox credentials | `LIVE` | [`manager.py#L96-L114`](file:///e:/nexfolio/ai-service/app/services/market_data/manager.py#L96) |
| `LIVE` | Broker heartbeat age $> 60$ seconds | `is_connected == True` | `DELAYED` | [`live_provider.py#L120-L122`](file:///e:/nexfolio/ai-service/app/services/market_data/live_provider.py#L120) |
| `DELAYED` | Fresh tick received with current timestamp | `is_connected == True` | `LIVE` | [`live_provider.py#L123`](file:///e:/nexfolio/ai-service/app/services/market_data/live_provider.py#L123) |
| `LIVE` / `DELAYED`| WebSocket connection dropped | `is_connected == False` | `FALLBACK_REFERENCE` | [`live_provider.py#L111-L113`](file:///e:/nexfolio/ai-service/app/services/market_data/live_provider.py#L111) |
| `FALLBACK_REFERENCE`| Broker reconnects successfully | `connect() == True` | `LIVE` | [`test_degradation_chain.py#L69-L74`](file:///e:/nexfolio/ai-service/tests/test_degradation_chain.py#L69) |
| Any State | Unhandled provider exception during query | Try-except block | `FALLBACK_REFERENCE` | [`manager.py#L137-L143`](file:///e:/nexfolio/ai-service/app/services/market_data/manager.py#L137) |

---

## SECTION N: DUAL-LOOP VALUATION ENGINE

Verified in [`ai-service/app/services/valuation_engine.py`](file:///e:/nexfolio/ai-service/app/services/valuation_engine.py) (Fast Loop) and [`ai-service/app/services/intelligence_service.py`](file:///e:/nexfolio/ai-service/app/services/intelligence_service.py) (Slow Loop).

### Dual-Loop Execution Architecture

```
Incoming WebSocket Quote Ticks (Upstox / Yahoo)
                  |
                  v
       [Market Data Cache] (15s TTL)
                  |
     +------------+------------+
     |                         |
     v                         v
[FAST LOOP]               [SLOW LOOP]
RealtimeValuationEngine   PortfolioAnalyticsService & ML Pipeline
- In-memory hash lookup   - Reconstructs 252d return time series
- O(K) weighted valuation - Computes Covariance & Beta vs NIFTY 50
- Zero ML / Zero Disk I/O - Derives 36-feature institutional vector
- Emits SSE ticks (<5ms)  - XGBoost risk inference (2.1.4)
                          - TreeSHAP exact attribution (0.47.2)
                          - 4-Pillar Scorecard calculation
                          - Cached in LRU cache for 60s
```

### Operational Separation
1. **Fast Loop (`RealtimeValuationEngine`)**:
   - Computes: Invested capital, current valuation, unrealized P&L, day P&L, and asset weights for $K$ constituent holdings.
   - Algorithmic Complexity: $O(K)$ array traversal over in-memory cached quotes.
   - Isolation Guarantee: **Zero ML invocations**.
   - Output: Emitted over SSE streaming connections or `GET /api/v1/portfolios/{id}/valuation`.
2. **Slow Analytical Loop (`generate_portfolio_intelligence`)**:
   - Computes: Covariance matrices, beta vs NIFTY 50, Sortino, Calmar, drawdown profiles, 36-feature inference vector, XGBoost risk class, TreeSHAP Shapley values, and the 4-Pillar Scorecard.
   - Execution Trigger: On user page load, rebalancing simulation, or report generation.
   - Caching: Bounded in-memory LRU cache (`_intelligence_cache`, max 256 entries) with a 60-second TTL keyed on holding signature hash (`_compute_holdings_signature`).
3. **5 ms Latency Claim Audit**:
   - The code comments and test docstrings specify `< 5ms` as an architectural design constraint.
   - Fast loop operations execute purely in RAM with dictionary lookups.
   - **Academic Integrity Caveat**: The repository contains **no formal wall-clock micro-benchmarking script** recording 5ms execution under load. In the paper, cite 5 ms as a **configured architectural target**, not an empirically benchmarked SLA.

---

## SECTION O: EXPERIMENTAL RESULTS AND TEST EVIDENCE

All metrics reported below were extracted directly from serialized report artifacts in [`ai-service/ml/datasets/portfolio/phase7_reports/`](file:///e:/nexfolio/ai-service/ml/datasets/portfolio/phase7_reports/) and test execution logs.

### 1. Champion Model: XGBoost Evaluation Metrics
Extracted from [`xgboost_metrics.json`](file:///e:/nexfolio/ai-service/ml/datasets/portfolio/phase7_reports/xgboost_metrics.json):
- **Test Accuracy**: **`0.9100` (91.00%)**
- **Macro Precision**: **`0.9142`**
- **Macro Recall**: **`0.9100`**
- **Macro F1-Score**: **`0.9098`**
- **Optimal Boosting Round**: **`193`** (terminated via early stopping on test loss)
- **Holdout Test Samples**: **200 portfolios** (800 train / 200 test)

### 2. Test Set Confusion Matrix ($N = 200$)
Extracted from [`xgboost_confusion_matrix.csv`](file:///e:/nexfolio/ai-service/ml/datasets/portfolio/phase7_reports/xgboost_confusion_matrix.csv):

$$\begin{pmatrix} 
 & \text{Predicted LOW} & \text{Predicted MEDIUM} & \text{Predicted HIGH} \\
\text{Actual LOW (32)} & \mathbf{26} & 6 & \mathbf{0} \\
\text{Actual MEDIUM (101)} & 3 & \mathbf{97} & 1 \\
\text{Actual HIGH (67)} & \mathbf{0} & 8 & \mathbf{59} 
\end{pmatrix}$$

### 3. Per-Class Performance Breakdown
Extracted from [`xgboost_classification_report.txt`](file:///e:/nexfolio/ai-service/ml/datasets/portfolio/phase7_reports/xgboost_classification_report.txt):

| Risk Class | Class Support (Test) | Precision | Recall | F1-Score | Critical Safety Finding |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **LOW Risk** | 32 | 0.8966 (0.90) | 0.8125 (0.81) | 0.8525 (0.85) | Zero High-risk portfolios classified as Low |
| **MEDIUM Risk** | 101 | 0.8739 (0.87) | 0.9604 (0.96) | 0.9151 (0.92) | Minor boundary confusion with Low/High |
| **HIGH Risk** | 67 | 0.9833 (0.98) | 0.8806 (0.88) | 0.9291 (0.93) | Zero Low-risk portfolios classified as High |
| **Weighted Average** | **200** | **0.9142 (0.91)** | **0.9100 (0.91)** | **0.9098 (0.91)** | **Zero Extreme Type II Misclassifications** |

### 4. Comprehensive Baseline Model Comparison
Extracted from [`baseline_model_comparison.csv`](file:///e:/nexfolio/ai-service/ml/datasets/portfolio/phase7_reports/baseline_model_comparison.csv), [`full_vs_reduced_comparison.csv`](file:///e:/nexfolio/ai-service/ml/datasets/portfolio/phase7_reports/full_vs_reduced_comparison.csv), and [`random_forest_metrics.json`](file:///e:/nexfolio/ai-service/ml/datasets/portfolio/phase7_reports/random_forest_metrics.json):

| Model Name | Feature Representation | Test Accuracy | Macro Precision | Macro Recall | Macro F1-Score | Cross-Validation Accuracy |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Decision Tree (CART)** | Full Features with HHI (44) | 98.50% | 0.9856 | 0.9850 | 0.9851 | N/A |
| **Logistic Regression** | Full Features with HHI (44) | 91.50% | 0.9161 | 0.9150 | 0.9152 | N/A |
| **Logistic Regression** | **Reduced 36-Feature Set** | **91.00%** | **0.9110** | **0.9100** | **0.9100** | N/A |
| **Decision Tree (CART)** | Reduced 36-Feature Set | 88.00% | 0.8810 | 0.8800 | 0.8800 | N/A |
| **Random Forest (500 trees)** | Reduced 36-Feature Set | 86.50% | 0.8671 | 0.8650 | 0.8655 | 5-Fold Stratified: $86.25\% \pm 2.09\%$ |
| **XGBoost (Champion)** | **Reduced 36-Feature Set** | **91.00%** | **0.9142** | **0.9100** | **0.9098** | Early-stopped @ round 193 |

### Academic Significance of Baseline Findings:
1. **Parity with Logistic Regression**: On the 36-feature set without HHI, **Logistic Regression achieves 91.00%**, matching XGBoost's 91.00%.
2. **Why Decision Tree Scored 98.5% on Full Features**: Full features contained `hhi`. Because labels were generated by orthogonal threshold cuts on $\sigma_{\text{ann}}$ and $\text{HHI}$, a single unpruned decision tree reconstructed the labeling boundaries almost perfectly. Dropping `hhi` reduced Decision Tree accuracy to 88.00%.
3. **The True Scientific Justification for XGBoost**: XGBoost was chosen **not** because it beat linear regression in test accuracy, but because:
   - It captures non-linear sector-weight interactions and tail risks naturally.
   - It integrates directly with **TreeSHAP** for exact polynomial-time game-theoretic feature attribution. Linear SHAP on Logistic Regression requires assuming feature independence, which is severely violated in financial portfolio data.

### 5. Automated Test Suite Evidence
- **Backend Test Suite**: **107 PASSED**, 0 failed, 4 non-fatal warnings across 22 test files in **111.17 seconds**.
- **Frontend TypeScript Safety**: `npx tsc --noEmit` exited with **code 0** across all 54 files.

---

## SECTION P: FIVE-FIGURE VERIFICATION AGAINST IMPLEMENTATION

### Figure 1: Three-Tier System Architecture
- **Shown in Diagram**: Next.js 15.5 Frontend Client, FastAPI AI Intelligence Backend, MongoDB 7.0 Document Store, Google Firebase Identity, Upstox WebSocket API, Yahoo Finance REST API.
- **Implementation Mapping**:
  - Presentation Tier: `frontend/app/` (`layout.tsx`, `dashboard/`, `portfolios/`, `intelligence/`, `reports/`).
  - Application Tier: `ai-service/app/main.py`, `ai-service/app/api/` (19 routers), `ai-service/app/services/`.
  - Persistence Tier: `ai-service/app/db/mongodb.py`, `ai-service/ml/models/`.
- **Unsupported Elements in Prior Drafts**: Prior drafts cited `app/routers/` (actual path is `app/api/`), local HS256 password hashing with `/token` routes (actual is stateless Firebase RS256 PKI), and live broker trading execution (actual is simulated in MongoDB).
- **Recommended Diagram Changes**: Update directory labels to `app/api/`, clarify that Upstox provides market streaming only, and show Google x509 PKI certificate fetching.

### Figure 2: Dual-Loop Valuation Engine
- **Shown in Diagram**: Fast Valuation Loop (<5ms, in-memory, SSE stream) decoupled from Slow Analytical Loop (XGBoost, TreeSHAP, Health Scorecard).
- **Implementation Mapping**:
  - Fast Loop: `RealtimeValuationEngine` in [`app/services/valuation_engine.py`](file:///e:/nexfolio/ai-service/app/services/valuation_engine.py).
  - Slow Loop: `generate_portfolio_intelligence` in [`app/services/intelligence_service.py`](file:///e:/nexfolio/ai-service/app/services/intelligence_service.py).
  - Cache: `_intelligence_cache` (60s TTL) and `MarketDataCache` (15s TTL).
- **Unsupported Elements in Prior Drafts**: Prior drafts depicted background queue workers (Celery/Redis). In reality, execution is asynchronous in-process via Python `asyncio`.
- **Recommended Diagram Changes**: Replace Celery/worker queues with in-process `asyncio` task dispatching and LRU caching.

### Figure 3: Market Data Pedigree FSM
- **Shown in Diagram**: 6 Data Conditions: `LIVE`, `DELAYED`, `SIMULATED`, `REFERENCE`, `FALLBACK_REFERENCE`, `UNAVAILABLE`.
- **Implementation Mapping**:
  - Enum: `DataBadge` in [`app/schemas/market.py#L7-L13`](file:///e:/nexfolio/ai-service/app/schemas/market.py#L7).
  - State Transitions: `_determine_current_badge()` in [`app/services/market_data/live_provider.py#L109`](file:///e:/nexfolio/ai-service/app/services/market_data/live_provider.py#L109).
  - Orchestration: `MarketDataManager` in [`app/services/market_data/manager.py`](file:///e:/nexfolio/ai-service/app/services/market_data/manager.py).
  - UI Visualization: [`frontend/components/data-badge.tsx`](file:///e:/nexfolio/frontend/components/data-badge.tsx).
- **Unsupported Elements in Prior Drafts**: Some prior drafts referred to a "5-State FSM". The schema contains 6 states.
- **Recommended Diagram Changes**: Ensure all 6 states are depicted with their exact trigger guards (e.g. heartbeat staleness $> 60$s for `DELAYED`).

### Figure 4: XGBoost, TreeSHAP and Health Scorecard Pipeline
- **Shown in Diagram**: 36-feature vector generation, XGBoost risk classification (Low/Moderate/High), TreeSHAP feature attributions, Linguistic translation, and 4-Pillar Health Scorecard.
- **Implementation Mapping**:
  - Feature Extraction: `derive_institutional_features()` in [`portfolio_analytics_service.py`](file:///e:/nexfolio/ai-service/app/services/portfolio_analytics_service.py).
  - Model Inference: `predict_portfolio_risk()` in [`prediction_service.py`](file:///e:/nexfolio/ai-service/app/services/prediction_service.py).
  - SHAP Attribution: `explain_portfolio_risk()` in [`explainability_service.py`](file:///e:/nexfolio/ai-service/app/services/explainability_service.py).
  - Translation: `translate_shap_drivers()` in [`shap_translation_service.py`](file:///e:/nexfolio/ai-service/app/services/shap_translation_service.py).
  - Scorecard: `calculate_health_score()` in [`portfolio_analytics_service.py`](file:///e:/nexfolio/ai-service/app/services/portfolio_analytics_service.py).
- **Unsupported Elements in Prior Drafts**: Feature scaling step (`StandardScaler`) was depicted in drafts but is absent in code.
- **Recommended Diagram Changes**: Remove the `StandardScaler` block; reflect that the 4-Pillar Scorecard operates deterministically in parallel with the ML inference path rather than taking XGBoost output as an input.

### Figure 5: FIFO Tax Computation & What-If Workflow
- **Shown in Diagram**: Transaction ledger ingestion, FIFO lot deque matching, holding duration classification ($\le 12$M vs $> 12$M), Section 112A threshold deduction, loss set-off hierarchy, 8-year loss bank, and What-If simulation.
- **Implementation Mapping**:
  - FIFO Matcher: `match_transactions_fifo()` in [`tax_service.py#L165`](file:///e:/nexfolio/ai-service/app/services/tax_service.py#L165).
  - Capital Gains Schedule: `compute_capital_gains_schedule()` in [`tax_service.py#L287`](file:///e:/nexfolio/ai-service/app/services/tax_service.py#L287).
  - Harvesting Optimizer: `analyze_harvesting_opportunities()` in [`tax_service.py#L429`](file:///e:/nexfolio/ai-service/app/services/tax_service.py#L429).
  - What-If Simulator: `simulate_what_if_risk()` in [`intelligence_service.py#L390`](file:///e:/nexfolio/ai-service/app/services/intelligence_service.py#L390).
- **Unsupported Elements in Prior Drafts**: Drafts implied a virtual tax transaction database sandbox; in code, What-If simulation operates on portfolio asset allocations in memory.
- **Recommended Diagram Changes**: Clearly separate the Deterministic Tax Realization path from the In-Memory Allocation Simulation Sandbox.

---

## SECTION Q: RESEARCH PAPER CLAIM AUDIT

| Research Paper Claim | Implementation Verdict | Empirical Evidence & File Line Reference |
| :--- | :---: | :--- |
| **Three-Tier Architecture** | **VERIFIED IN CODE** | Implemented across Next.js 15.5 (`frontend/package.json`), FastAPI 0.115 (`ai-service/app/main.py`), and MongoDB 7.0 (`docker-compose.yml`). |
| **36-Feature Econometric Matrix** | **VERIFIED IN CODE** | Exactly 36 features defined in `feature_metadata.json` and verified by `test_gate_13_exact_36_feature_ordering`. |
| **Regularized XGBoost** | **VERIFIED IN CODE** | `xgb.XGBClassifier` configured with depth=5, lr=0.05, n_est=500, reg_alpha=0.1, reg_lambda=1.0 in `06_xgboost_training.py#L51-L66`. |
| **Low/Moderate/High Risk Classes** | **VERIFIED IN CODE** | Multiclass 3-label mapping (0: LOW, 1: MEDIUM/MODERATE, 2: HIGH) in `05_xgboost_dataset_preparation.py` and `prediction_service.py`. |
| **TreeSHAP Explainability** | **VERIFIED IN CODE** | `shap.TreeExplainer` serialized in `shap_explainer.pkl`; slices predicted class dynamically in `explainability_service.py#L38-L45`. |
| **Four-Pillar 0–100 Health Scorecard**| **PARTIALLY VERIFIED** | Implemented in `portfolio_analytics_service.py#L286-L306`, but composite score is clamped to `[15, 98]` and formulas diverge from Table 3.1. |
| **Six Market Data Pedigree Conditions**| **VERIFIED IN CODE & TESTS** | Exactly 6 enum states in `app/schemas/market.py#L7-L13`. Verified in `test_degradation_chain.py`. |
| **Dual-Loop Valuation Engine** | **VERIFIED IN CODE** | In-memory Fast Loop (`valuation_engine.py`) separated from Slow Analytical Loop (`intelligence_service.py`). |
| **Fast Loop Target Below 5 ms** | **PARTIALLY VERIFIED** | Docstrings and test comments cite `< 5ms`, but no formal wall-clock micro-benchmark script exists in the repository. |
| **FIFO-Based Tax Computation** | **VERIFIED IN CODE & TESTS** | Full deterministic FIFO queue in `tax_service.py#L165-L280`. Verified by 7 passing tests in `test_tax_service.py`. |
| **Eight-Year Loss Carryforward** | **VERIFIED IN CODE** | Modeled in `TaxLossBank` with `loss_carryforward_years=8` in `tax_service.py#L601-L624`. |
| **Virtual What-If Sandbox** | **VERIFIED IN CODE & TESTS** | In-memory allocation simulation in `intelligence_service.py#L390`. Non-mutation proven by `test_what_if_simulation_sandbox_isolation`. |
| **292 NSE Equities** | **VERIFIED IN CODE** | 292 CSV files in `ai-service/ml/datasets/raw/` (289 multi-year histories, 3 truncated records). |
| **NIFTY 50 Benchmark** | **VERIFIED IN CODE** | Index `^NSEI` curated in raw datasets and used for portfolio beta covariance calculations in `risk_scoring_beta_engine.py#L22`. |
| **1,000 Generated Portfolios** | **VERIFIED IN CODE** | 12,299 constituent holding rows across 1,000 unique synthetic portfolios in `sample_portfolios.csv`. |
| **800 Training / 200 Testing Samples** | **VERIFIED IN CODE** | 80/20 stratified split (`X_train.parquet`: 800×36, `X_test.parquet`: 200×36) in `05_xgboost_dataset_preparation.py`. |

---

## SECTION R: MISSING INFORMATION AND CONTRADICTIONS

1. **XGBoost Hyperparameters (Draft vs Code)**:
   - *Dossier Draft Assertion*: Claimed `max_depth=4` and `n_estimators=250`.
   - *Source Code Ground Truth*: [`06_xgboost_training.py#L54-L55`](file:///e:/nexfolio/ai-service/ml/training/06_xgboost_training.py#L54) specifies `max_depth=5` and `n_estimators=500` (early-stopped at round 193).
2. **Model Baseline Outperformance Claim**:
   - *Draft Assertion*: Claimed XGBoost (91.0%) significantly outperformed Logistic Regression (reported as 78.5%).
   - *Source Code Ground Truth*: [`full_vs_reduced_comparison.csv`](file:///e:/nexfolio/ai-service/ml/datasets/portfolio/phase7_reports/full_vs_reduced_comparison.csv) reveals Logistic Regression achieved **91.00% accuracy** on the exact same 36-feature reduced set, identically matching XGBoost.
3. **Four-Pillar Scorecard Formulas (Table 3.1 vs Code)**:
   - *Report Draft Table 3.1*: Proposed $\min(25, \max(0, (15 - 40\sigma) + \max(0, 10 - 10\vert\beta-1\vert) + 5))$ for Volatility/Beta.
   - *Source Code Ground Truth*: [`portfolio_analytics_service.py#L296-L298`](file:///e:/nexfolio/ai-service/app/services/portfolio_analytics_service.py#L296) omits beta entirely: `max(0.0, min(100.0, (1.0 - (vol / 0.40)) * 100.0)) * 0.25`. Furthermore, the final score is clamped to `[15, 98]`.
4. **Risk-Free Rate ($R_f$) Parameter**:
   - *Report Draft Assertion*: Stated $R_f = 6.5\%$ or $7.0\%$ as RBI repo proxy.
   - *Source Code Ground Truth*: [`drawdown_risk_ratio_engine.py#L5`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/drawdown_risk_ratio_engine.py#L5) and [`portfolio_analytics_service.py#L234`](file:///e:/nexfolio/ai-service/app/services/portfolio_analytics_service.py#L234) define `rf_rate = 0.06` (6.0%).
5. **Feature Standardization Claim**:
   - *Report Draft Algorithm 3.2*: Step 11 claims $X$ is standardized using $(\mu_{train}, \sigma_{train})$.
   - *Source Code Ground Truth*: No scaler is applied anywhere in `05_xgboost_dataset_preparation.py` or `06_xgboost_training.py`. Tree models do not require scaling.
6. **Backend Directory Paths**:
   - *Draft Assertion*: Cited `ai-service/app/routers/`.
   - *Source Code Ground Truth*: Active router modules reside in `ai-service/app/api/` and `ai-service/app/api/v1/endpoints/`.
7. **Broker Trading Integration Scope**:
   - *Draft Assertion*: Implied active live broker order execution via Upstox.
   - *Source Code Ground Truth*: Upstox adapter implements market data streaming only. Order execution and transactions operate as simulated internal paper-trading ledgers in MongoDB.
8. **Academic Paper Citations**:
   - *Base Paper Authors*: Singh et al. (2023) authors are Priya Singh, Manoj Jha, Mohamed Sharaf, Mohammed A. El-Meligy, and Thippa Reddy Gadekallu (*IEEE Access*, vol. 11, DOI: `10.1109/ACCESS.2023.3317953`).
   - *Supporting Papers*: Vijayanand & Smrithy (2025) covers financial fraud detection; Aruleba & Sun (2024, 2025) cover credit risk prediction. They should be cited as methodological parallels in ensemble XAI, not direct portfolio management papers.

---

## SECTION S: EXACT CORRECTIONS REQUIRED IN THE IEEE PAPER

To ensure the research paper is bulletproof under rigorous IEEE peer review, the following exact text adjustments must be made:

1. **Clarify Model Selection Justification**:
   - *Current Flawed Wording*: "XGBoost was chosen because it achieved superior predictive accuracy (91.0%) over linear models (78.5%)."
   - *Required Corrected Wording*: "On the 36-feature reduced input matrix, Logistic Regression achieved an identical 91.00% test accuracy. XGBoost was selected not for an empirical accuracy advantage, but because gradient boosted decision trees naturally capture non-linear feature interactions across sector allocations and drawdowns, and integrate natively with polynomial-time TreeSHAP ($O(TLD^2)$), avoiding the feature-independence assumptions required by linear Shapley estimators."
2. **Disclose Data Leakage Safeguards and Limitations**:
   - *Required Disclosure*: "In the prototype dataset preparation pipeline, global median imputation was executed prior to the 80/20 train/test split, and early stopping was monitored on the holdout test set (halting at iteration 193). While missing data accounted for less than 0.1% of cells, future iterations will implement a strict three-way partition ($X_{train}, X_{val}, X_{test}$) with preprocessors fitted strictly on training observations."
3. **Qualify the Target Risk Labels**:
   - *Required Disclosure*: "Target risk classifications (LOW, MEDIUM, HIGH) were generated deterministically based on annualized volatility ($\sigma_{\text{ann}} \lessgtr 15\%, 25\%$) and concentration ($\text{HHI} \lessgtr 0.15, 0.25$). The classifier operates as a non-linear surrogate model learning to approximate this multi-factor rule boundary without direct access to concentration indices. The reported 91.00% accuracy reflects boundary reconstruction fidelity, not predictive risk forecasting of empirical market defaults."
4. **Publish Verified Health Scorecard Formulas**:
   - Update Table 3.1 to match `portfolio_analytics_service.py`:
     $$\text{Score} = \text{clamp}_{15}^{98}\left( 0.25 \cdot \text{div} + 0.25 \cdot \max\left(0, \left(1 - \frac{\sigma}{0.40}\right)\cdot 100\right) + 0.25 \cdot \max\left(0, \frac{\text{Sharpe} + 1.0}{3.0} \cdot 100\right) + 0.25 \cdot \max\left(0, \left(1 - \frac{|\text{MDD}|}{0.50}\right)\cdot 100\right) \right)$$
5. **Correct Hyperparameter Specifications**:
   - Report `n_estimators=500` (terminated at 193 via early stopping), `max_depth=5`, `learning_rate=0.05`, `reg_alpha=0.1`, and `reg_lambda=1.0`.
6. **Correct Risk-Free Rate**:
   - Update $R_f$ from $6.5\%$ / $7.0\%$ to $6.0\%$ ($0.06$) to match both offline and online calculation code.
7. **Frame 5 ms Latency as Target**:
   - Frame the 5 ms fast valuation loop as an architectural specification and design target, rather than a proven benchmark result.

---

## SECTION 18: FINAL PRIORITY CORRECTION TABLE

| Paper Correction | Exact Verified Information | Evidence File and Lines | Status | Recommended Paper Change |
| :--- | :--- | :--- | :---: | :--- |
| **1. Baseline Accuracy Parity** | Logistic Regression achieved 91.00% on the 36-feature set, matching XGBoost (91.00%). | [`full_vs_reduced_comparison.csv#L3`](file:///e:/nexfolio/ai-service/ml/datasets/portfolio/phase7_reports/full_vs_reduced_comparison.csv#L3) | CONTRADICTED | Remove claim that XGBoost beat Logistic Regression in accuracy; justify XGBoost via TreeSHAP integration and non-linear interactions. |
| **2. Feature Standardization Claim** | No `StandardScaler` or normalization is executed in the dataset or training pipeline. | [`05_xgboost_dataset_preparation.py`](file:///e:/nexfolio/ai-service/ml/training/05_xgboost_dataset_preparation.py), [`06_xgboost_training.py`](file:///e:/nexfolio/ai-service/ml/training/06_xgboost_training.py) | CONTRADICTED | Remove Step 11 from Algorithm 3.2; state that raw econometric ratios enter GBDT invariant to monotonic scaling. |
| **3. Early Stopping Split** | Early stopping monitored `(X_test, y_test)` directly, halting training at iteration 193. | [`06_xgboost_training.py#L73`](file:///e:/nexfolio/ai-service/ml/training/06_xgboost_training.py#L73) | CONFIRMED WITH QUALIFICATION | Transparently disclose test set early stopping as an academic limitation; recommend 3-way split in future work. |
| **4. Pre-Split Median Imputation** | `X = X.fillna(X.median())` ran on full 1,000 samples before `train_test_split()`. | [`05_xgboost_dataset_preparation.py#L70`](file:///e:/nexfolio/ai-service/ml/training/05_xgboost_dataset_preparation.py#L70) | CONFIRMED WITH QUALIFICATION | Acknowledge pre-split median imputation as minor leakage (<0.1% cells missing). |
| **5. XGBoost Hyperparameters** | `max_depth=5`, `n_estimators=500` (stopped at 193), `reg_alpha=0.1`, `reg_lambda=1.0`. | [`06_xgboost_training.py#L51-L66`](file:///e:/nexfolio/ai-service/ml/training/06_xgboost_training.py#L51) | CONTRADICTED | Correct hyperparameter values in paper methodology table from depth=4/n_est=250 to depth=5/n_est=500. |
| **6. Target Label Derivation** | Rule-derived surrogate: LOW $(\sigma<0.15 \land \text{HHI}<0.15)$, HIGH $(\sigma>0.25 \lor \text{HHI}>0.25)$. | [`risk_scoring_beta_engine.py#L41-L49`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/risk_scoring_beta_engine.py#L41) | CONFIRMED WITH QUALIFICATION | Explicitly define the model as a non-linear surrogate approximating deterministic regulatory rules. |
| **7. Health Scorecard Formulas** | Clamped to `[15, 98]`. Volatility pillar omits beta; denominators are 0.40, 3.0, 0.50. | [`portfolio_analytics_service.py#L286-L306`](file:///e:/nexfolio/ai-service/app/services/portfolio_analytics_service.py#L286) | CONTRADICTED | Replace Table 3.1 formulas in paper with verified `calculate_health_score()` implementation code. |
| **8. Risk-Free Rate Parameter** | $R_f = 0.06$ (6.0%) in all calculation scripts. | [`drawdown_risk_ratio_engine.py#L5`](file:///e:/nexfolio/ai-service/ml/portfolio_analytics/drawdown_risk_ratio_engine.py#L5), [`portfolio_analytics_service.py#L234`](file:///e:/nexfolio/ai-service/app/services/portfolio_analytics_service.py#L234) | CONTRADICTED | Update $R_f$ from 6.5% / 7.0% to 6.0% across all formulas in the paper. |
| **9. Fast Loop Latency Target** | Claimed < 5ms is a design specification, not an empirical wall-clock benchmark. | [`valuation_engine.py#L46`](file:///e:/nexfolio/ai-service/app/services/valuation_engine.py#L46), [`test_fast_valuation.py#L29`](file:///e:/nexfolio/ai-service/tests/test_fast_valuation.py#L29) | PARTIALLY VERIFIED | Clarify in paper that 5ms is an architectural latency target; avoid presenting it as a measured benchmark. |
| **10. What-If Sandbox Scope** | Operates on asset allocation weights in memory; no virtual tax transaction table. | [`intelligence_service.py#L390-L510`](file:///e:/nexfolio/ai-service/app/services/intelligence_service.py#L390) | CONFIRMED WITH QUALIFICATION | Clarify that What-If simulates portfolio weights and risk, while tax harvesting operates as an unrealized loss optimizer. |
| **11. Base Paper Authors & DOI** | Priya Singh, Manoj Jha, Mohamed Sharaf, Mohammed A. El-Meligy, Thippa Reddy Gadekallu (2023). | [`Research Papers/BASE PAPER/Singh_2023_Hybrid_CNN_LSTM_Portfolio.pdf`](file:///e:/nexfolio/Research%20Papers/BASE%20PAPER/Singh_2023_Hybrid_CNN_LSTM_Portfolio.pdf) | CONTRADICTED | Correct author list in references to Singh, P., Jha, M., Sharaf, M., El-Meligy, M. A., & Gadekallu, T. R., DOI: `10.1109/ACCESS.2023.3317953`. |
| **12. Supporting Papers Scope** | Vijayanand & Smrithy (fraud detection); Aruleba & Sun (credit risk). | [`Research Papers/Supporting_Papers/`](file:///e:/nexfolio/Research%20Papers/Supporting_Papers/) | CONTRADICTED | Frame supporting references as ensemble XAI parallels in credit risk and fraud, not portfolio selection. |
