# NexFolio

**NexFolio: An Explainable AI Framework for Intelligent Portfolio Risk Profiling and Investment Analytics**

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.0+-orange.svg)](https://xgboost.readthedocs.io/)
[![SHAP](https://img.shields.io/badge/SHAP-Explainability-brightgreen.svg)](https://shap.readthedocs.io/)
[![Tests](https://img.shields.io/badge/Tests-33%20Passed-success.svg)]()

---

## 🌟 Key Architecture & Capabilities

1. **Dual-Loop Portfolio & Market Valuation Engine**
   - **Fast Loop**: Real-time / reference quote caching, day P&L calculations, advance/decline pulse, live multi-watchlist synchronization.
   - **Slow Loop**: Periodic and on-demand portfolio risk profiling, 28 financial feature extraction, XGBoost multi-class risk inference, and TreeSHAP feature attribution.
2. **Honest Data Pedigree & Session Intelligence**
   - Unified `DataBadge` state machine (`LIVE`, `DELAYED`, `REFERENCE`, `FALLBACK_REFERENCE`, `UNAVAILABLE`).
   - IST Market Session & NSE Holiday Calendar validator.
   - Pluggable `MarketDataProvider` architecture with automated fallback on stale heartbeats.
3. **Transparent Explainable AI (XAI)**
   - Continuous SHAP driver spectrum (Bullish / Bearish / Neutral impact).
   - 4-Pillar Portfolio Health Scorecard (`Diversification`, `Drawdown Protection`, `Volatility Discipline`, `Sharpe Efficiency`).
   - 1-Click Interactive "What-If" Simulation Sandbox (`Defensive Shift`, `Max Diversification`, `Concentration Taper`, `Custom`).
4. **Institutional Reporting & Auditability**
   - Single-source-of-truth immutable report snapshot generation (`NXF-XXXXXXXXXXXXXX`).
   - Clean `@media print` styling for board-ready PDF generation.
   - Audit trail logging and deduplicated notification system.
5. **Enterprise Production Hardening**
   - Multi-tenant Firebase X.509 JWT authentication with strict data isolation.
   - Sliding-window rate limiting with standard vs compute-intensive ML tiering.
   - Enterprise security headers (`X-Content-Type-Options`, `X-Frame-Options`, `HSTS`, `X-Request-ID`).
   - Liveness (`/health`) and readiness (`/health/ready`) probes.

---

## 📊 Completed Milestones

- ✅ **Milestone 1 — Authentication & Security Foundation**: Multi-tenant Firebase auth, verified mock tokens for test suites, tenant-isolated data access.
- ✅ **Milestone 2 — Core Portfolio Management**: Portfolio CRUD, 292 NSE stock search, transaction ledger (BUY/SELL weighted average math), real-time holdings.
- ✅ **Milestone 3 — Command Center & Historical Analytics**: Consolidated multi-portfolio overview, asset class breakdown, 30-min snapshot checkpoints.
- ✅ **Milestone 4 — Portfolio Risk Intelligence & Explainability**: 28-feature engineering pipeline, XGBoost inference, continuous SHAP scale, 4-Pillar Health Scorecard, What-If simulation sandbox.
- ✅ **Milestone 5 — Market Intelligence, Screener & Watchlists**: 289+ NSE stock screener with 7 presets, multi-tenant watchlists, institutional stock detail with SMA-20/50 overlays.
- ✅ **Milestone 6 — Comprehensive Reports, Notifications & Audit Trail**: Immutable report snapshots (`NXF-...`), version selector, PDF export, audit log pipeline, in-app notification center.
- ✅ **Milestone 7 — Production Hardening, Live Market Data Architecture & Deployment**: `MarketDataProvider` abstraction, IST session validator, rate limiting middleware, security headers, readiness probe, multi-stage Dockerfiles, and `docker-compose.yml`.

---

## 🚀 Quickstart

### Local Development

#### 1. Start MongoDB
```bash
docker run -d -p 27017:27017 --name nexfolio-mongo mongo:7.0
```

#### 2. Start FastAPI Backend
```bash
cd ai-service
python -m venv venv
venv\Scripts\activate      # Windows (or source venv/bin/activate on Unix)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### 3. Start Next.js Frontend
```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the NexFolio platform.

### Docker Compose Deployment
```bash
docker compose up -d --build
```

---

## 🧪 Automated Testing
```bash
cd ai-service
pytest -v
```
All **33 backend unit and integration tests** pass with 100% code integrity.

---

## 📜 License & Citation
Developed for advanced portfolio risk profiling and explainable financial analytics. See [DEPLOYMENT.md](file:///d:/nexfolio/DEPLOYMENT.md) for deployment specifications.

---

## 👥 Core Contributors & Project Roles
* **Tejas Patil** ([@patiltejas2406](https://github.com/patiltejas2406)) – AI/ML pipeline design, predictive risk modeling (Random Forest, LSTM, NLP), FastAPI risk inference engine, and System Architecture[cite: 1].
* **Lokesh Reddy** ([@Lokeshreddy-047](https://github.com/Lokeshreddy-047)) – Full-stack microservices, database schemas, and frontend integration[cite: 1].
