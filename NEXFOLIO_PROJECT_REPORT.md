# NexFolio: Complete Project Architectural & Engineering Master Report

**Project Title**: NexFolio — An Explainable AI (XAI) Framework for Intelligent Portfolio Risk Profiling, Real-Time Analytics, and Institutional Tax Optimization  
**Repository**: [https://github.com/Lokeshreddy-047/NexFolio.git](https://github.com/Lokeshreddy-047/NexFolio.git)  
**Live Production URL**: [https://nexfolio.vercel.app](https://nexfolio.vercel.app)  
**Backend AI API**: [https://nexfolio-ai-service.onrender.com](https://nexfolio-ai-service.onrender.com)  
**Academic & Industry Domain**: Quantitative Finance, Explainable Machine Learning (XAI), Real-Time Distributed Systems, Indian Statutory Tax Accounting  

---

## Executive Summary

**NexFolio** is an enterprise-grade investment intelligence platform designed to replace legacy "black-box" risk profiling and lagging portfolio trackers with a transparent, institutional-grade analytical framework. 

NexFolio bridges quantitative portfolio theory with modern machine learning:
1. **Explainable AI Risk Profiling**: Uses an institutional **XGBoost Multiclass Risk Classifier (`v1.2.0-xgboost`)** trained on 36 quantitative features, paired with **SHAP TreeExplainer** to calculate local game-theoretic feature attributions for every prediction.
2. **Transparent 4-Pillar Portfolio Health Scorecard**: Evaluates portfolios on a deterministic 0–100 scale across Diversification, Volatility & Beta Control, Risk-Adjusted Efficiency (Sharpe/Sortino), and Capital Preservation (Max Drawdown/Calmar) with transparent formulas.
3. **Real-Time Dual-Loop Valuation Engine**: Implements a high-throughput Fast Loop (<1ms in-memory valuation & SSE market tick broadcasting) alongside a Slow Analytical Loop (snapshot checkpointing, historical risk attribution).
4. **Honest Market Data Pedigree Architecture**: Explicitly displays and enforces the pedigree of incoming market quotes across 5 verifiable states (`LIVE`, `DELAYED`, `REFERENCE`, `FALLBACK_REFERENCE`, `UNAVAILABLE`) with automated Upstox WebSocket integration and Parquet offline fallback.
5. **Institutional Tax Suite (Budget 2026–27 / Income-tax Act, 2025)**: Implements statutory capital gains calculations under the new Income-tax Act, 2025 (STCG @ 20%, Section 112A LTCG @ 12.5% > ₹1.25L, Budget 2026 Corporate Buyback taxation, 4% Cess, 15% Surcharge cap, 8-year Tax Loss Bank, interactive harvesting simulator, and ITR Schedule-Compatible CSV export).
6. **Universal Dark & Light UI Theme System**: Sleek Swiss-fintech design with Obsidian Dark and Clean Light themes with zero hydration errors across 17 static and dynamic routes.

---

## 1. Complete System Architecture & Technology Stack

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT TIER (Browser / Mobile / Desktop)                         │
│                    Next.js 15 (Turbopack) · React 19 · Tailwind CSS v4 · TypeScript             │
└───────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                │ HTTPS / WSS / REST / SSE (X-Request-ID)
                                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                BACKEND SERVICES TIER (FastAPI / Python 3.12)                    │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────────────┐  │
│  │   Security & Routing    │  │   Market Data Manager   │  │   Dual-Loop Valuation Engine    │  │
│  │ - SecurityHeaders (OWASP│  │ - Upstox Live WebSocket │  │ - Fast Loop (<1ms Live Quotes)  │  │
│  │ - Sliding Window RateLim│  │ - Parquet Reference Feed│  │ - Slow Loop (Deep Analytics)    │  │
│  │ - Firebase JWT PKI Auth │  │ - Pedigree State Machine│  │ - Timeline Snapshot Engine      │  │
│  └─────────────────────────┘  └─────────────────────────┘  └─────────────────────────────────┘  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────────────┐  │
│  │    XGBoost XAI Engine   │  │  4-Pillar Health Engine │  │ Institutional Tax Suite (2026)  │  │
│  │ - 36-Feature Pipeline   │  │ - 0-100 Scorecard (A-D) │  │ - Income-tax Act, 2025 (TY 26-27│  │
│  │ - TreeExplainer (SHAP)  │  │ - Transparent Formulas  │  │ - STCG 20% / LTCG 12.5% (>₹1.25L│  │
│  │ - Human Translation Lyr │  │ - What-If Simulation Box│  │ - Buybacks / 8-Yr Loss Bank     │  │
│  └─────────────────────────┘  └─────────────────────────┘  └─────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┬───────────────────────────────┘
                                │ Motor Async Driver (TLS)        │ Zero-Copy Disk / In-Memory
                                ▼                                 ▼
┌────────────────────────────────────────────────┐  ┌────────────────────────────────────────────┐
│          MONGODB ATLAS 7.0 CLOUD DB            │  │          TRAINED ML ARTIFACTS STORE        │
│  - Portfolios & Multi-Tenant Isolation         │  │  - xgboost_risk_model.pkl (v1.2.0)         │
│  - Realized Lots & Transaction Ledgers         │  │  - shap_explainer.pkl (TreeExplainer)      │
│  - Snapshots, Checkpoints & System Audit Logs  │  │  - feature_metadata.json (36 Features)     │
└────────────────────────────────────────────────┘  └────────────────────────────────────────────┘
```

### Detailed Stack Specifications

* **Frontend**: Next.js 15.5.23 (App Router with Turbopack), React 19.1.0, Tailwind CSS v4, TypeScript 5, Recharts 3.10.1, Lucide React icons, Firebase Client SDK 12.17.1.
* **Backend**: FastAPI 0.115, Python 3.12, Uvicorn, Motor (Async MongoDB), PyMongo, Pydantic v2, Pydantic-Settings, XGBoost 2.1.0, SHAP 0.46.0, Scikit-Learn, Pandas 2.2, NumPy, PyArrow (Parquet), Cryptography, PyJWT, Requests, SSE-Starlette.
* **Database & Auth**: MongoDB Atlas (Replica Set with TLS), Firebase Authentication (Google OAuth + Email/Password with Google x509 PKI certificate verification).
* **Testing & Build Verification**: Pytest 9.1 (53 / 53 passed), AnyIO, Starlette TestClient, Next.js static build optimization (17 / 17 routes compiled).

---

## 2. End-to-End Project Development Journey: Phase by Phase

---

### Phase 1: High-Performance Architecture & Monorepo Foundation

1. **Repository Layout**: Monorepo split between `frontend/` (Next.js 15 App Router) and `ai-service/` (FastAPI).
2. **Asynchronous Database Architecture**: Configured Motor with MongoDB Atlas connection pooling, retry writes, and TLS CA verification (`certifi`).
3. **Stateless Firebase Token Verification**: Implemented public x509 certificate decoding (`firebase_auth.py`) fetching Google's authoritative public keys (`https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`). This completely eliminates dependencies on local service account JSON files or GCP Application Default Credentials (ADC).
4. **Enterprise Multi-Tenant Isolation**: Enforced strict `user_id == current_user.uid` queries across all repositories (`portfolio_repository.py`, `holding_repository.py`, `transaction_repository.py`, `snapshot_repository.py`, `audit_repository.py`).

---

### Phase 2: Feature Engineering Pipeline & Quantitative Dataset Curation

To train the machine learning risk classifier, we engineered a comprehensive 36-feature quantitative dataset representing real-world portfolio behavior:

| Feature Category | Features Included | Mathematical Basis |
| :--- | :--- | :--- |
| **Return Profile** | `total_return`, `annualized_return`, `return_1M`, `return_3M`, `return_6M`, `return_1Y`, `trading_days` | Compounded discrete log-returns & cumulative ROI |
| **Volatility & Dispersion** | `annualized_volatility`, `downside_deviation_annualized` | $\sigma_{\text{ann}} = \sigma_{\text{daily}} \times \sqrt{252}$; Semi-deviation below $R_f$ |
| **Drawdown Dynamics** | `portfolio_max_drawdown`, `rolling_max_drawdown_30d`, `rolling_max_drawdown_252d` | $\text{MDD} = \min_{t} \left(\frac{V_t - \max_{\tau \le t} V_\tau}{\max_{\tau \le t} V_\tau}\right)$ |
| **Risk-Adjusted Ratios** | `portfolio_sharpe_ratio`, `portfolio_sortino_ratio`, `portfolio_calmar_ratio` | $\text{Sharpe} = \frac{R_p - R_f}{\sigma_p}$; $\text{Sortino} = \frac{R_p - R_f}{\sigma_d}$; $\text{Calmar} = \frac{R_p}{\|\text{MDD}\|}$ |
| **Market Sensitivity (Beta)** | `portfolio_beta` | $\beta = \frac{\text{Cov}(R_p, R_m)}{\text{Var}(R_m)}$ measured against Nifty 50 |
| **Diversification & Breadth** | `asset_count`, `sector_count` | Number of non-zero active constituents and industry groups |
| **Sector Allocation (18 Sectors)** | `sector_financial_services_pct`, `sector_information_technology_pct`, `sector_oil_gas_pct`, `sector_healthcare_pct`, `sector_automobile_pct`, `sector_fmcg_pct`, `sector_metals_mining_pct`, `sector_power_pct`, `sector_capital_goods_pct`, etc. | Cross-sectional weights: $w_s = \frac{\sum_{i \in s} V_i}{V_{\text{total}}} \times 100$ |

---

### Phase 3: Machine Learning Model Training & XGBoost Optimization

1. **Target Formulation**: Multiclass classification categorizing portfolios into:
   * **`LOW Risk` (Class 0)**: High diversification, moderate beta ($\beta \approx 0.8 - 1.0$), low annualized volatility ($\le 18\%$), healthy Sharpe ($>1.2$).
   * **`MEDIUM Risk` (Class 1)**: Moderate concentration, market beta ($\beta \approx 1.0 - 1.25$), volatility ($18\% - 25\%$).
   * **`HIGH Risk` (Class 2)**: Heavy sector concentration (>35%), high beta ($\beta > 1.25$), high volatility (>25%), significant drawdowns.
2. **Model Training**: Trained an **XGBoost Classifier (`xgboost_risk_model.pkl`)** using `multi:softprob` objective across 800 training samples and 200 validation samples, validated alongside a Random Forest baseline (`random_forest_risk_model.pkl`).
3. **Inference Pipeline**: Output returns deterministic predicted class label, confidence percentage, and class probability distribution (e.g. `Low: 0.2%`, `Medium: 0.9%`, `High: 98.9%`).

---

### Phase 4: Explainable AI (XAI) Engine with SHAP TreeExplainer

Machine learning models in finance are dangerous if unexplainable. NexFolio solves this by integrating **SHAP (SHapley Additive exPlanations)** based on cooperative game theory:

$$\phi_i(v) = \sum_{S \subseteq N \setminus \{i\}} \frac{|S|!(|N| - |S| - 1)!}{|N|!} (v(S \cup \{i\}) - v(S))$$

1. **SHAP TreeExplainer Artifact**: Exported `shap_explainer.pkl` capable of extracting exact local Shapley values for any portfolio feature vector.
2. **Human-Readable Translation Engine (`shap_translation_service.py`)**:
   * Analyzes top positive risk drivers (features that pushed the model toward HIGH risk) and top negative risk dampeners (features that kept risk lower).
   * Generates natural language explanations: *"High concentration in Information Technology (45.2% weight) is the primary contributor increasing risk (+0.34 SHAP units). Low market beta (0.92β) partially offsets the downside (-0.12 SHAP units)."*

---

### Phase 5: Transparent 4-Pillar Portfolio Health Scorecard (0–100 Points)

To give investors an intuitive, deterministic diagnostic, NexFolio calculates a **4-Pillar Health Scorecard** (each pillar scored 0–25 points):

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        COMPOSITE HEALTH SCORE: 0 - 100 POINTS                          │
├────────────────────────────┬────────────────────────────┬──────────────────────────────┤
│ Pillar 1: Diversification  │ Pillar 2: Volatility & Beta│ Pillar 3: Risk-Adjusted Eff. │
│ 0 - 25 Points              │ 0 - 25 Points              │ 0 - 25 Points                │
│ Formula:                   │ Formula:                   │ Formula:                     │
│ DivNorm*18 + min(7, N*0.7) │ max(0, 15 - Vol*40) +      │ min(15, Sharpe*7.5) +        │
│                            │ max(0, 10 - |Beta-1|*10)   │ min(10, Sortino*5)           │
├────────────────────────────┴────────────────────────────┴──────────────────────────────┤
│ Pillar 4: Capital Preservation & Drawdown Resilience: 0 - 25 Points                     │
│ Formula: max(0, 15 - MDD*50) + min(10, Calmar*5)                                       │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

* **Grade Scale**: Grade A (`80–100`), Grade B (`65–79`), Grade C (`50–64`), Grade D (`<50`).
* **Transparency**: Clicking any pillar in the UI opens a modal showing the exact formula, observed inputs, and score weighting.

---

### Phase 6: Traceable Recommendations & What-If Simulation Sandbox

1. **Traceable Action Plan**: Automatically generates actionable recommendations with priority rankings (Priority 1–4) and deterministic trigger conditions (e.g. *Trigger: IT sector allocation (42.5%) > 35% concentration ceiling*).
2. **Interactive What-If Simulation Sandbox**:
   * Investors can test portfolio changes (e.g., adding ₹1,00,000 of `HDFCBANK.NS` or trimming `RELIANCE.NS`) in memory.
   * Instantly calculates the **Delta Change** in Health Score, Beta, Volatility, Sharpe, and Predicted Risk Class without writing to the database.

---

### Phase 7: Real-Time Dual-Loop Valuation & Market Data Pedigree Architecture

```
                               ┌───────────────────────────┐
                               │  Incoming Market Data Feed│
                               └─────────────┬─────────────┘
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
       ┌─────────────────────────────┐               ┌─────────────────────────────┐
       │   Upstox Live WebSocket     │               │  Parquet Offline Reference  │
       │   - Live Tick Ingestion     │               │  - market_features.parquet  │
       │   - Sub-second quote cache  │               │  - 292 Verified NSE Tickers │
       └──────────────┬──────────────┘               └──────────────┬──────────────┘
                      │                                             │
                      └──────────────────────┬──────────────────────┘
                                             ▼
                               ┌───────────────────────────┐
                               │ Market Data Pedigree FSM  │
                               │ [LIVE | DELAYED | REF]    │
                               └─────────────┬─────────────┘
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
       ┌─────────────────────────────┐               ┌─────────────────────────────┐
       │     FAST VALUATION LOOP     │               │    SLOW ANALYTICS LOOP      │
       │ - In-memory live quotes     │               │ - Snapshot preservation     │
       │ - Real-time Portfolio Value │               │ - Deep Risk Attribution     │
       │ - SSE Stream (/stream)      │               │ - Historical Decision Logs  │
       └─────────────────────────────┘               └─────────────────────────────┘
```

* **Market Data Pedigree States**:
  1. `LIVE`: Real-time streaming from active licensed vendor.
  2. `DELAYED`: 15-minute delayed vendor feed.
  3. `REFERENCE`: Verified analytical Parquet reference dataset.
  4. `FALLBACK_REFERENCE`: Automated fallback when vendor heartbeat drops (>60s).
  5. `UNAVAILABLE`: Complete market outage.
* **Dual-Loop Execution**: The Fast Loop delivers instant valuations (<1ms) via in-memory math, while the Slow Loop manages historical persistence without blocking.

---

### Phase 8: Institutional Tax Suite & Harvesting Optimizer (Budget 2026–27 / Income-tax Act, 2025)

The tax module was engineered to adhere to the statutory changes of the **Union Budget 2026–27** and the new **Income-tax Act, 2025** (effective 1 April 2026):

1. **Statutory Terminology**: Replaced legacy "Assessment Year" with **`Tax Year 2026–27 · Income-tax Act, 2025`**.
2. **Holding Period Accounting**: Replaced crude 365-day approximations with exact **calendar-month duration logic** (`calculate_calendar_holding_period`):
   * $\le 12$ calendar months $\rightarrow$ Short-Term Capital Gains (`STCG_111A` @ **20%**).
   * $> 12$ calendar months $\rightarrow$ Long-Term Capital Gains (`LTCG_112A` @ **12.5%** on gains exceeding the **₹1,25,000 Section 112A annual exemption threshold**).
3. **Budget 2026 Share Buyback Framework**:
   * Transferred share buybacks from dividend taxation into the Capital Gains framework (allowing cost of acquisition deductions).
   * Categorizes transactions into `NON_PROMOTER` (standard capital gains), `PROMOTER_DOMESTIC_COMPANY` (effective 22% rate), and `PROMOTER_OTHER` (effective 30% rate).
4. **Multi-Stage Loss Set-Off Hierarchy**:
   $$\text{STCL} \xrightarrow{\text{offsets}} \text{STCG} \xrightarrow{\text{unabsorbed offsets}} \text{LTCG (112A)}$$
   $$\text{LTCL} \xrightarrow{\text{offsets}} \text{LTCG (112A only)}$$
5. **8-Year Tax Loss Carryforward Bank**: Stores unabsorbed STCL and LTCL with an active 8-year expiration countdown. Includes migration support for pre-2026 losses under the 1961 Act.
6. **Surcharge & 4% Health & Education Cess**: Separately computes Base Tax $\rightarrow$ Surcharge (capped at 15% for special-rate capital gains) $\rightarrow$ 4% Cess on total tax.
7. **Interactive Tax Loss Harvesting Simulator**:
   * Scans open portfolio holdings for unrealized losses.
   * Calculates **true incremental tax savings** against available taxable gains.
   * Interactive checkboxes let investors simulate harvesting in real time without modifying transaction ledgers.
8. **ITR Schedule-Compatible CSV Export**: Generates lot-level audit schedules with buy/sell dates, holding months, cost basis, consideration, realized P&L, and tax classification for direct reconciliation.
9. **Zero ML Invocations Guarantee**: Pure deterministic accounting math with zero machine learning invocations.

---

### Phase 9: UI Theme System & Comprehensive Front-End Polish

1. **Universal Theme Engine (`ThemeProvider`, `useTheme`)**:
   * **`Dark Mode (Obsidian & Emerald)`**: Low eye-strain deep slate contrast with glowing status badges.
   * **`Light Mode (Clean Swiss-Fintech Slate)`**: Modern, high-contrast white-slate typography and glassmorphic panels for daylight environments.
   * **`System Sync`**: Real-time synchronization with OS color scheme preferences.
2. **Access Points**:
   * Top Header quick toggle button with dropdown popover (<kbd>Sun</kbd> / <kbd>Moon</kbd> / <kbd>Laptop</kbd>).
   * Desktop & Mobile Sidebar footer toggle.
   * Settings Page (`/settings`) visual theme cards.
3. **Hydration & Reliability**: Zero hydration mismatches (`suppressHydrationWarning`), persistent `localStorage`, and responsive layouts across all 17 routes.

---

### Phase 10: Security Hardening, Testing Suite & Cloud Deployment

1. **Enterprise Security Middleware**:
   * `X-Request-ID`: Distributed trace correlation UUID.
   * `X-Content-Type-Options: nosniff`
   * `X-Frame-Options: DENY`
   * `X-XSS-Protection: 1; mode=block`
   * `Strict-Transport-Security: max-age=31536000; includeSubDomains`
2. **Sliding Window Rate Limiter**: 300 requests/min for standard APIs; 60 requests/min for heavy ML endpoints.
3. **Test Suite Execution**:
   * **Backend**: `53 / 53 unit & integration tests passing` (`pytest -v`).
   * **Frontend**: `17 / 17 Next.js static and dynamic pages compiled with 0 errors and 0 warnings`.
4. **Cloud Production Deployment**:
   * Frontend: **Vercel** (`https://nexfolio.vercel.app`)
   * Backend: **Render** (`https://nexfolio-ai-service.onrender.com`)
   * Database: **MongoDB Atlas**
   * Auth: **Firebase Authentication**

---

## 3. Complete Application Route Sitemap & Capabilities

| Route | Page Name | Primary Features & User Capabilities |
| :--- | :--- | :--- |
| **`/`** | Landing Page | Hero banner, value proposition, feature preview, and CTA to Login/Signup. |
| **`/login`** | Login & Auth | Google Sign-In & Email/Password login, session persistence, secure redirection. |
| **`/signup`** | User Registration | Email/Password account creation, Firebase registration, user profile synchronization. |
| **`/dashboard`** | Command Center | Real-time total portfolio valuation, live NSE market status pill, P&L delta, interactive valuation timeline chart (Recharts), 4-pillar health scorecard summary, sector allocation breakdown, and top holdings table. |
| **`/portfolios`** | Portfolio Manager | Multi-portfolio CRUD, currency configuration (`INR`), setting default portfolio, and portfolio switching. |
| **`/holdings`** | Active Holdings | Detailed holdings table with live LTP, day change, total valuation, average buy price, unrealized P&L, portfolio weight, and sector tags. |
| **`/transactions`**| Transaction Ledger | Historical ledger table, NSE stock search autocomplete, recording BUY, SELL, and corporate BUYBACK transactions with lot tracking. |
| **`/intelligence`**| AI Risk Intelligence | XGBoost multi-class risk classification, confidence score, probability distribution bars, SHAP TreeExplainer feature attributions, transparent 4-pillar formula drilldowns, prioritized action plan, and interactive What-If simulation sandbox. |
| **`/markets`** | Markets Overview | NSE Market Overview (Nifty 50, Bank Nifty, Market Pulse), sector performance heatmap, and Market Screener with presets (Top Gainers, High Beta, Value, Large Cap). |
| **`/stocks/[symbol]`**| Stock Detail View | Interactive historical price chart, 52-week High/Low range, key financial ratios, and company summary. |
| **`/watchlist`** | Watchlists | Custom watchlist creation, symbol searching, and real-time quote tracking. |
| **`/reports`** | Reports & Tax Suite | **Executive Dossier**: PDF-ready institutional report with SHA-256 integrity hash.<br>**Tax Intelligence**: Budget 2026–27 / Income-tax Act, 2025 STCG @ 20%, Section 112A LTCG @ 12.5% > ₹1.25L, Buyback intelligence, Surcharge & 4% Cess, 8-year Tax Loss Bank, interactive harvesting simulator, and ITR CSV export.<br>**Audit Trail**: System event logs. |
| **`/settings`** | Settings & Profile | Appearance & UI Theme selector (Dark/Light/System), Profile management, Risk limits & guardrail sliders, and live SSE stream preferences. |

---

## 4. Verification & Quality Assurance Summary

* **Backend Unit & Integration Tests**: **`53 / 53 passed (100%)`**
* **Frontend Build**: **`17 / 17 routes compiled successfully`** (Turbopack, **0 errors, 0 warnings**)
* **API Health Status**: **`READY`** (`/api/v1/health/ready`)
* **Security & Auth**: **Enterprise-grade multi-tenant user isolation** and Google x509 PKI certificate verification.

---

## 5. Summary of Achievements

Through this systematic development lifecycle, **NexFolio** has evolved into a complete, mathematically grounded, and statutory-compliant investment intelligence platform. It seamlessly combines explainable artificial intelligence, real-time market data streaming, institutional portfolio risk diagnostics, and deterministic statutory tax optimization in a polished, multi-themed user interface.
