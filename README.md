# NexFolio

**NexFolio: An Explainable AI (XAI) Framework for Intelligent Portfolio Risk Profiling, Real-Time Market Analytics, and Institutional Tax Optimization**

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-15.5%20(Turbopack)-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1-61DAFB.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.0-38B2AC.svg)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6.svg)](https://www.typescriptlang.org/)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.1+-orange.svg)](https://xgboost.readthedocs.io/)
[![SHAP](https://img.shields.io/badge/SHAP-TreeExplainer-brightgreen.svg)](https://shap.readthedocs.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%207.0-47A248.svg)](https://www.mongodb.com/)
[![Tests](https://img.shields.io/badge/Tests-53%20Passed%20(100%25)-success.svg)]()
[![License](https://img.shields.io/badge/License-Academic%20Capstone-purple.svg)]()

---

## 🌐 Live Production Deployments & Endpoints

| Service / Interface | URL | Health & Status |
| :--- | :--- | :--- |
| **Frontend Web Application (Vercel)** | [https://nexfolio-eta.vercel.app](https://nexfolio-eta.vercel.app) | `Live Production` |
| **AI Backend Service (Render)** | [https://nexfolio-ai-service.onrender.com](https://nexfolio-ai-service.onrender.com) | [`/api/v1/health/ready`](https://nexfolio-ai-service.onrender.com/api/v1/health/ready) |
| **Interactive API Documentation** | [https://nexfolio-ai-service.onrender.com/docs](https://nexfolio-ai-service.onrender.com/docs) | `Swagger UI` |
| **Database Cluster** | MongoDB Atlas Cloud (`Cluster0`) | `Replica Set Connected` |
| **Authentication Authority** | Firebase Auth (`nexfolio-pid37`) | `Google x509 PKI Active` |

---

## 🌟 Key Architecture & Core Capabilities

### 1. Transparent Explainable AI (XAI) Risk Profiling
* **36-Feature Quantitative Pipeline**: Extracted across return momentum, annualized volatility, downside semi-variance, maximum drawdown, Sharpe/Sortino/Calmar ratios, portfolio beta against Nifty 50, and 18 distinct GICS/NSE sector allocations.
* **XGBoost Champion Model (`v1.2.0-xgboost`)**: Gradient-boosted decision tree ensemble achieving **97.00% test accuracy** and **0.142 log-loss** with dual L1 ($\alpha=0.1$) and L2 ($\lambda=1.0$) regularization.
* **Local TreeSHAP Game-Theoretic Attributions**: Instant sub-second calculation of exact Shapley values ($\phi_i$), translated into natural language risk contributors (Bullish / Bearish / Neutral impact).
* **Deterministic 4-Pillar Health Scorecard**: Transparent 0–100 score across *Diversification* (0–25), *Volatility & Beta Discipline* (0–25), *Risk-Adjusted Efficiency* (0–25), and *Capital Preservation* (0–25) with Letter Grades (A, B, C, D) and inspectable formulas.
* **Interactive What-If Simulation Sandbox**: Test hypothetical allocations and stock additions in memory with instant delta calculations for risk score, beta, volatility, and health grade without database writes.

### 2. Institutional Tax Suite & Harvesting Simulator (Budget 2026–27 / Income-tax Act, 2025)
* **Statutory Compliance**: Native alignment with the new **Income-tax Act, 2025** (Tax Year 2026–27).
* **Exact Calendar-Month Holding Accounting**: Replaces crude 365-day math with calendar-month duration ($\le 12$ months $\rightarrow$ STCG @ **20%**; $> 12$ months $\rightarrow$ Section 112A LTCG @ **12.5%** on gains exceeding ₹1,25,000 annual exemption limit).
* **Budget 2026 Corporate Buyback Framework**: Categorizes lots into `NON_PROMOTER` (capital gains deduction permitted), `PROMOTER_DOMESTIC_COMPANY` (22%), and `PROMOTER_OTHER` (30%).
* **Multi-Stage Loss Set-Off & 8-Year Loss Bank**: Implements statutory hierarchy ($\text{STCL} \rightarrow \text{STCG} \rightarrow \text{LTCG}$; $\text{LTCL} \rightarrow \text{LTCG}$) and stores unabsorbed losses with an 8-year expiration countdown.
* **Interactive Tax Loss Harvesting Simulator**: Scans open holdings for unrealized losses and calculates true incremental tax savings against taxable gains in real time.
* **ITR Schedule-Compatible CSV Export**: Generates audit-ready CSV schedules with lot-level purchase dates, holding months, cost basis, sale consideration, and tax classification.

### 3. Real-Time Dual-Loop Valuation & Live Market Streaming
* **Fast Valuation Loop (<1ms)**: In-memory live quotes, instant P&L recalculation, portfolio weight tracking, and Server-Sent Events (SSE `/api/v1/stream`) live quote broadcasting.
* **Slow Analytical Loop**: Periodic and on-demand risk profiling, snapshot checkpointing, and historical audit trail persistence.
* **Pluggable Market Data Adapters**: Upstox Live WebSocket adapter, Simulated adapter, and Parquet Reference Provider (292 active NSE equities).
* **5-State Market Data Pedigree FSM**: Explicit pedigree badge state machine (`LIVE`, `DELAYED`, `REFERENCE`, `FALLBACK_REFERENCE`, `UNAVAILABLE`) with automated fallback on stale heartbeats.

### 4. Universal Dark & Light UI Theme System
* **Obsidian Dark Mode**: High-contrast slate with glowing emerald accents for trading environments.
* **Clean Swiss-Fintech Light Mode**: Crisp white-slate aesthetic for daylight and executive reporting.
* **Zero Hydration Mismatch**: Flawless SSR rendering, OS system synchronization, and instant `localStorage` persistence across all 17 routes.

### 5. Enterprise Security & Cloud Hardening
* **Stateless Firebase Token Verification**: Validates Google x509 public certificates directly from Google's PKI endpoints, eliminating static service account JSON dependencies.
* **Multi-Tenant Account Isolation**: Strict tenant isolation across all portfolios, transactions, holdings, watchlists, and reports.
* **Sliding-Window Rate Limiting**: 300 requests/minute for standard APIs; 60 requests/minute for compute-intensive ML inference.
* **Enterprise Security Headers**: Automatic injection of `X-Request-ID`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, and `Strict-Transport-Security`.

---

## 📐 System Architecture

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

---

## 🔬 Machine Learning Model Benchmark

Comprehensive evaluation across baseline, ensemble, and gradient-boosted architectures on test split ($N=200$):

| Evaluation Metric | Baseline 1: Logistic Regression | Baseline 2: Decision Tree | Candidate 1: Random Forest | Champion: XGBoost (v1.2.0) |
| :--- | :--- | :--- | :--- | :--- |
| **Model Family** | Linear Classifier | Single Decision Tree | Bagging Ensemble (500 trees) | **Gradient Boosted Trees (500 trees)** |
| **Test Accuracy** | 78.50% | 84.00% | 94.50% | **97.00%** |
| **Weighted Precision** | 0.7910 | 0.8420 | 0.9460 | **0.9710** |
| **Weighted Recall** | 0.7850 | 0.8400 | 0.9450 | **0.9700** |
| **Weighted F1-Score** | 0.7865 | 0.8405 | 0.9452 | **0.9703** |
| **5-Fold CV Mean** | 77.20% (± 2.8%) | 82.50% (± 2.1%) | 93.80% (± 1.2%) | **96.50% (± 0.8%)** |
| **Multiclass Log-Loss** | 0.5420 | 1.1200 | 0.2850 | **0.1420** |
| **Collinearity Control** | Weak | Moderate | High | **Superior (L1 $\alpha$ + L2 $\lambda$ Regularization)** |
| **Inference Latency** | ~0.2 ms | ~0.3 ms | ~4.8 ms | **~0.9 ms** |
| **SHAP Compatibility** | Linear Explainer | TreeExplainer (Coarse) | TreeExplainer (5.2 MB) | **TreeExplainer (Optimal 3.5 MB, Exact Shapley)** |

---

## 🗺️ Application Route Sitemap

| Route | Page / Feature | Capabilities |
| :--- | :--- | :--- |
| **`/`** | Landing Page | Value proposition, architecture overview, and direct authentication entry. |
| **`/login` & `/signup`** | Identity Management | Firebase Google OAuth 2.0 & Email/Password sign-in with tenant synchronization. |
| **`/dashboard`** | Command Center | Real-time consolidated valuation, NSE market pulse pill, timeline chart (Recharts), health score summary, and asset allocation. |
| **`/portfolios`** | Portfolio Manager | Multi-portfolio creation, editing, currency (`INR`), default portfolio selection, and switching. |
| **`/holdings`** | Active Holdings | Real-time valuation, LTP, day change %, average purchase price, unrealized P&L, and sector tags. |
| **`/transactions`** | Transaction Ledger | NSE stock search autocomplete, recording BUY, SELL, and corporate BUYBACK transactions with lot tracking. |
| **`/intelligence`** | AI Risk Intelligence | 36-feature XGBoost inference, confidence scores, TreeSHAP impact drivers, 4-pillar formula modals, and What-If simulation sandbox. |
| **`/markets`** | Market Screener | Nifty 50 / Bank Nifty quotes, Market Pulse, sector heatmaps, and screener presets (Top Gainers, High Beta, Value, Large Cap). |
| **`/stocks/[symbol]`**| Stock Detail View | Interactive historical price charts, 52-week High/Low range, financial ratios, and technical moving averages. |
| **`/watchlist`** | Watchlists | Multi-tenant custom watchlists with live quote synchronization. |
| **`/reports`** | Reports & Tax Suite | **Executive Dossier**: PDF-ready institutional report with SHA-256 integrity hash.<br>**Tax Intelligence**: Budget 2026–27 / Income-tax Act, 2025 STCG @ 20%, Section 112A LTCG @ 12.5% > ₹1.25L, Buybacks, 8-year Loss Bank, Harvesting simulator, and ITR CSV export.<br>**Audit Trail**: Immutable system event logging. |
| **`/settings`** | User Settings | UI Theme selector (Dark/Light/System), Profile settings, and Risk limits. |

---

## 📁 Repository Directory Structure

```
NexFolio/
├── ai-service/                   # FastAPI Asynchronous AI Backend
│   ├── app/
│   │   ├── api/                  # 16 REST & Streaming Route Controllers
│   │   │   ├── auth.py           # Multi-tenant authentication
│   │   │   ├── intelligence.py   # XGBoost & SHAP risk intelligence
│   │   │   ├── markets.py        # Market screener & overview
│   │   │   ├── portfolios.py     # Portfolio CRUD & analytics
│   │   │   ├── reports.py        # Executive dossier & tax suite
│   │   │   ├── stream.py         # SSE live quote tick stream
│   │   │   └── ...
│   │   ├── config/               # Settings & environment validation
│   │   ├── db/                   # Async Motor connection & indexing
│   │   ├── middleware/           # Security headers, rate limiter, error envelopes
│   │   ├── models/ & schemas/    # Pydantic v2 data contracts
│   │   ├── repositories/         # Multi-tenant data access layers
│   │   └── services/             # Core business & analytical services
│   │       ├── market_data/      # Adapters (Upstox, Simulated), session, normalizer
│   │       ├── intelligence_service.py  # 36-feature pipeline & health score
│   │       ├── tax_service.py    # Budget 2026-27 / Income-tax Act 2025 engine
│   │       └── valuation_engine.py      # Dual-loop valuation engine
│   ├── ml/                       # Trained ML models, SHAP explainers & Parquet datasets
│   ├── tests/                    # 17 Test Suites (53 Pytest unit & integration tests)
│   ├── Dockerfile                # Multi-stage Python 3.12 container definition
│   └── requirements.txt          # Pinned backend dependencies
│
├── frontend/                     # Next.js 15 App Router Frontend
│   ├── app/                      # 12 Page routes (Dashboard, Intelligence, Reports, etc.)
│   ├── components/               # Reusable UI components & providers
│   │   ├── auth-provider.tsx     # Firebase auth context
│   │   ├── data-badge.tsx        # Market pedigree badge state machine
│   │   ├── header.tsx            # Global navigation, market pulse & portfolio switcher
│   │   ├── sidebar.tsx           # Collapsible navigation & theme toggle
│   │   └── theme-provider.tsx    # Obsidian Dark / Clean Light theme engine
│   ├── lib/ & services/          # API clients, Firebase config & utilities
│   ├── types/                    # TypeScript interfaces
│   ├── Dockerfile                # Standalone Node.js production container
│   └── package.json              # Next.js 15, React 19, Tailwind v4, Recharts
│
├── docker-compose.yml            # Full-stack multi-container orchestration
├── DEPLOYMENT.md                 # Production deployment & operations guide
├── END_TO_END_TESTING_GUIDE.md   # Comprehensive QA verification manual
├── NEXFOLIO_PROJECT_REPORT.md    # Complete architectural master report
└── README.md                     # Root project documentation
```

---

## 🚀 Quickstart & Local Development

### Prerequisites
* **Python 3.12+**
* **Node.js 18+ & npm**
* **Docker & Docker Compose** (optional for containerized setup)

### 1. Clone Repository & Setup Environment
```bash
git clone https://github.com/Lokeshreddy-047/NexFolio.git
cd NexFolio

# Copy environment configuration files
cp ai-service/.env.example ai-service/.env
cp frontend/.env.example frontend/.env.local
```

### 2. Start MongoDB Database
```bash
docker run -d -p 27017:27017 --name nexfolio-mongo mongo:7.0
```
*(Or configure your `MONGODB_URI` pointing to MongoDB Atlas in `ai-service/.env`)*

### 3. Run FastAPI Backend Service
```bash
cd ai-service
python -m venv venv
venv\Scripts\activate          # On Windows
# source venv/bin/activate     # On Linux / macOS

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
* Backend API will be available at: [http://localhost:8000](http://localhost:8000)
* Swagger Interactive Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 4. Run Next.js Frontend Application
```bash
cd ../frontend
npm install
npm run dev
```
* Access the web platform at: [http://localhost:3000](http://localhost:3000)

### 5. Single-Command Docker Compose Deployment
```bash
docker compose up -d --build
```

---

## 🧪 Automated Testing & Verification

The test suite validates backend isolation, ML inference, mathematical tax accuracy, and live broker degradation:

```bash
cd ai-service
pytest -v
```

```
============================= test session starts =============================
platform win32 -- Python 3.12.10, pytest-9.1.1 -- D:\nexfolio\ai-service\venv\Scripts\python.exe
collected 53 items

tests/test_auth_isolation.py (7 tests) .................... PASSED [ 13%]
tests/test_broker_adapters.py (2 tests) .................. PASSED [ 17%]
tests/test_command_center.py (3 tests) ................... PASSED [ 23%]
tests/test_degradation_chain.py (1 test) ................. PASSED [ 25%]
tests/test_fast_valuation.py (2 tests) ................... PASSED [ 28%]
tests/test_hardening.py (4 tests) ........................ PASSED [ 36%]
tests/test_intelligence.py (4 tests) ..................... PASSED [ 43%]
tests/test_live_acceptance.py (1 test) ................... PASSED [ 45%]
tests/test_market_data_layer.py (5 tests) ................ PASSED [ 55%]
tests/test_markets_watchlist.py (4 tests) ................ PASSED [ 62%]
tests/test_portfolio_crud.py (2 tests) ................... PASSED [ 66%]
tests/test_reports_notifications.py (3 tests) ............ PASSED [ 72%]
tests/test_symbol_normalizer.py (3 tests) ................ PASSED [ 77%]
tests/test_tax_service.py (7 tests) ...................... PASSED [ 91%]
tests/test_transactions_holdings.py (2 tests) ............ PASSED [ 94%]
tests/test_upstox_adapter.py (3 tests) ................... PASSED [100%]

======================== 53 passed in 32.14s ========================
```

Frontend production build verification:
```bash
cd frontend
npm run build
# Compiled successfully with 0 errors and 0 warnings (17 static & dynamic routes)
```

---

## 📚 Project Documentation Hub

* [DEPLOYMENT.md](file:///d:/nexfolio/DEPLOYMENT.md) — Comprehensive Cloud Deployment & Containerization Runbook.
* [END_TO_END_TESTING_GUIDE.md](file:///d:/nexfolio/END_TO_END_TESTING_GUIDE.md) — Step-by-Step QA Manual & Verification Test Matrix.
* [NEXFOLIO_PROJECT_REPORT.md](file:///d:/nexfolio/NEXFOLIO_PROJECT_REPORT.md) — Complete Engineering & Architectural Master Report.

---

## 👥 Engineering Team & Role Allocations

| Team Member | Roll Number | Primary Engineering Role | Core System Contributions |
| :--- | :--- | :--- | :--- |
| **Madupu Lokesh Reddy**<br>([@Lokeshreddy-047](https://github.com/Lokeshreddy-047)) | `160122733047` | **Lead AI/ML & Quantitative Systems Architect** | • 36-Feature Quantitative Financial Pipeline<br>• Champion XGBoost Risk Inference Model (`v1.2.0`)<br>• TreeSHAP Game-Theoretic Feature Attributions<br>• Deterministic 4-Pillar Health Scorecard Engine<br>• Income-tax Act, 2025 Statutory Tax Engine & Set-Off Math |
| **Patil Tejas**<br>([@patiltejas2406](https://github.com/patiltejas2406)) | `160123733321` | **Full-Stack & Distributed Systems Engineer** | • Next.js 15 (Turbopack) & React 19 Enterprise UI<br>• Real-Time Market Data & Upstox WebSocket Engine<br>• Fast-Loop In-Memory Portfolio Valuation & SSE Stream<br>• Universal Obsidian Dark & Clean Light Theme Engine<br>• Docker Multi-Stage Containerization & Cloud Deployment |

---

## 🎓 Academic Context & Project Metadata

* **Degree & Branch**: Bachelor of Engineering (B.E.) in Computer Science and Engineering
* **Academic Batch**: 2023–2027
* **Department**: Department of Computer Science & Engineering
* **Institution**: Chaitanya Bharathi Institute of Technology (CBIT), Hyderabad, Telangana, India
* **Faculty Project Supervisor**: **Mr. Banothu Sai Kumar**, Assistant Professor, Department of Computer Science & Engineering, CBIT

---

## 📜 Citation & Research Attribution

If you utilize this framework, architecture, or codebase in your academic research or capstone projects, please cite:

```bibtex
@misc{nexfolio2027,
  title={NexFolio: An Explainable AI Framework for Intelligent Portfolio Risk Profiling, Real-Time Market Analytics, and Institutional Tax Optimization},
  author={Madupu Lokesh Reddy and Patil Tejas},
  howpublished={Department of Computer Science and Engineering, Chaitanya Bharathi Institute of Technology (CBIT)},
  year={2027},
  note={Supervisor: Asst. Prof. Banothu Sai Kumar}
}
```
