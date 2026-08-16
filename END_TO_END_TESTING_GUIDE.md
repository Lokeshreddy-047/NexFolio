# NexFolio End-to-End Testing & Verification Guide

This document is the comprehensive QA and team verification manual for **NexFolio: An Explainable AI Framework for Intelligent Portfolio Risk Profiling, Real-Time Analytics, and Institutional Tax Optimization**.

---

## 🌐 Live Production Deployment Endpoints

| Component | Target URL | Status Probe |
| :--- | :--- | :--- |
| **Frontend Web App (Vercel)** | [https://nexfolio.vercel.app](https://nexfolio.vercel.app) *(or your deployed Vercel URL)* | Status `200 OK` |
| **AI Backend Service (Render)** | [https://nexfolio-ai-service.onrender.com](https://nexfolio-ai-service.onrender.com) *(or your Render URL)* | [`/api/v1/health/ready`](https://nexfolio-ai-service.onrender.com/api/v1/health/ready) |
| **Database (MongoDB Atlas)** | `Cluster0` (M0 Shared Cloud Cluster) | Connected |
| **Authentication (Firebase)** | Project ID: `nexfolio-pid37` | Multi-Tenant Active |
| **GitHub Repository** | [https://github.com/Lokeshreddy-047/NexFolio.git](https://github.com/Lokeshreddy-047/NexFolio.git) | Branch: `main` |

---

## 📋 Comprehensive Test Matrix & Execution Checklist

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   TESTING WORKFLOW MAP                                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. Auth & Session  ──► 2. Command Center  ──► 3. Portfolios & Holdings                │
│ 4. XGBoost AI      ──► 5. Tax Optimizer   ──► 6. Markets & Watchlists                  │
│ 7. Audit & Reports ──► 8. Theme Switcher  ──► 9. Health & Security Probes             │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Test Suite 1: Authentication & Account Isolation

**Objective**: Verify secure Google Sign-In, Email/Password login, token verification, and strict multi-tenant user isolation.

| Step | Action | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **1.1** | Navigate to `/login` on Vercel frontend. | Clean login page renders with Google Sign-In and Email/Password options. | [ ] |
| **1.2** | Click **"Sign in with Google"** and complete OAuth. | Redirects seamlessly to `/dashboard`; user photo/initials appear in Header & Sidebar. | [ ] |
| **1.3** | Sign in with Email/Password (or register new user at `/signup`). | Account is created/authenticated in Firebase and profile synced to MongoDB Atlas. | [ ] |
| **1.4** | Open an incognito window and sign in with a different account. | User B sees only their own portfolios and zero data from User A (Enterprise Account Isolation). | [ ] |
| **1.5** | Click **"Sign Out"** in header or sidebar profile dropdown. | Session is cleared from `localStorage` and user is redirected back to `/login`. | [ ] |

---

### Test Suite 2: Command Center & Real-Time Analytics (`/dashboard`)

**Objective**: Validate real-time portfolio valuation, NSE ticker, health score summary, and interactive charts.

| Step | Action | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **2.1** | View the Top Header Market Badge. | Displays `NSE: ACTIVE` (or `DELAYED` / `REFERENCE`) with live status indicator. | [ ] |
| **2.2** | Observe Portfolio Summary Cards. | Displays Total Valuation (₹), Net Unrealized P&L, Daily ROI Delta (%), and Asset Count. | [ ] |
| **2.3** | Inspect the Interactive Timeline Chart. | Recharts renders interactive valuation checkpoints with tooltips on hover. | [ ] |
| **2.4** | Verify 4-Pillar Health Scorecard Widget. | Displays overall Health Score (e.g. `42/100 · Grade D`) with 4 individual pillar bars. | [ ] |
| **2.5** | Switch active portfolio using the Header Portfolio Dropdown. | Command Center instantly refreshes valuation and timeline for the newly selected portfolio. | [ ] |

---

### Test Suite 3: Portfolios, Holdings & Transactions (`/portfolios`, `/holdings`, `/transactions`)

**Objective**: Test transaction ledger accounting, FIFO lot updates, stock search, and buybacks.

| Step | Action | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **3.1** | Navigate to `/portfolios` ➔ Click **"New Portfolio"**. | Creates portfolio with custom name, currency (`INR`), and optional default flag. | [ ] |
| **3.2** | Navigate to `/transactions` ➔ Click **"Record Transaction"**. | Stock search bar autocompletes NSE symbols (`RELIANCE.NS`, `TCS.NS`, `INFY.NS`, `HDFCBANK.NS`). | [ ] |
| **3.3** | Record a **BUY** transaction (e.g. 50 shares of `TCS.NS` @ ₹3,800). | Holding is created/updated in `/holdings` with recalculated average buy price and total investment. | [ ] |
| **3.4** | Record a **SELL** transaction (e.g. 20 shares of `TCS.NS` @ ₹4,100). | Holding quantity reduces to 30; realized capital gain (+₹6,000) is logged to ledger. | [ ] |
| **3.5** | Record a **BUYBACK** transaction with Promoter Category (`NON_PROMOTER`, `PROMOTER_DOMESTIC_COMPANY`, `PROMOTER_OTHER`). | Deducts holding balance and tags lot as buyback with corresponding statutory tax rates. | [ ] |

---

### Test Suite 4: Explainable AI Risk Intelligence (`/intelligence`)

**Objective**: Verify the XGBoost multiclass model, TreeExplainer SHAP drivers, 4-pillar drilldowns, and What-If simulation.

| Step | Action | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **4.1** | Navigate to `/intelligence`. | Model provenance badge shows `v1.2.0-xgboost · Dataset: v2026.08-institutional`. | [ ] |
| **4.2** | Click **"Re-Analyze Portfolio"**. | Model executes 36-feature inference, returning risk category (`LOW`, `MEDIUM`, or `HIGH`) and confidence score. | [ ] |
| **4.3** | Inspect Class Probability Distribution. | Displays exact class probabilities (e.g. Low: 0.2%, Medium: 0.9%, High: 98.9%). | [ ] |
| **4.4** | Click each of the 4 Health Scorecard Pillars to inspect. | Opens transparent modal/drawer detailing formulas, observed inputs, and scoring weights (0-25 each). | [ ] |
| **4.5** | Inspect Top SHAP Risk Drivers. | Displays positive & negative feature impact bars (e.g. `annualized_volatility`, `portfolio_beta`). | [ ] |
| **4.6** | Test the **"What-If Simulation Sandbox"**. | Adjust position weights or add simulated holdings; verifies risk score recalculates in memory without modifying database. | [ ] |

---

### Test Suite 5: Institutional Tax Suite & Harvesting Simulator (`/reports`)

**Objective**: Verify Budget 2026–27 / Income-tax Act, 2025 tax rules, calendar-month math, loss set-offs, and CSV download.

| Step | Action | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **5.1** | Navigate to `/reports` ➔ Switch to **"Tax Intelligence"** tab. | Context badge displays `Tax Year 2026–27 · Income-tax Act, 2025`. | [ ] |
| **5.2** | Verify **Section 111A (STCG)** Card. | Displays gross STCG, STCL set-off, net STCG, and Base Tax @ 20%. | [ ] |
| **5.3** | Verify **Section 112A (LTCG)** Tracker Card. | Tracks ₹1,25,000 annual exemption limit with visual progress bar and taxable gains @ 12.5%. | [ ] |
| **5.4** | Verify **Total Estimated Tax Liability** Card. | Displays Base Tax + Surcharge + 4% Health & Education Cess breakdown. | [ ] |
| **5.5** | Inspect **Tax Loss Bank** Card. | Displays banked STCL and LTCL with active 8-year expiration countdown. | [ ] |
| **5.6** | Test **Interactive Harvesting Simulator**. | Toggling candidate checkboxes dynamically recalculates simulated tax savings and net post-harvest tax in real time. | [ ] |
| **5.7** | Inspect **Realized Capital Gains & Buyback Ledger**. | Matched lots display Lot ID, Buy/Sell timestamps, holding months, cost basis, sale consideration, and classification. | [ ] |
| **5.8** | Click **"Export ITR Schedule CSV"**. | Downloads `NexFolio_ITR_Schedule_...csv` formatted for ITR schedule reconciliation. | [ ] |

---

### Test Suite 6: Markets & Watchlists (`/markets`, `/watchlist`, `/stocks/[symbol]`)

**Objective**: Validate real-time market data feed, stock screener presets, and individual ticker details.

| Step | Action | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **6.1** | Navigate to `/markets`. | Displays Nifty 50, Bank Nifty, Market Pulse, and sector performance breakdown. | [ ] |
| **6.2** | Test Market Screener Presets. | Clicking *Top Gainers*, *High Beta*, *Value*, or *Large Cap* filters table accurately. | [ ] |
| **6.3** | Click any stock ticker (e.g. `RELIANCE.NS`). | Navigates to `/stocks/RELIANCE.NS` displaying interactive price chart, 52-week range, and sector metrics. | [ ] |
| **6.4** | Navigate to `/watchlist` ➔ Add stocks to custom watchlist. | Watchlist updates with live quotes and day change percentage. | [ ] |

---

### Test Suite 7: Executive Dossier & Audit Trail (`/reports`)

**Objective**: Verify printable institutional report dossiers, SHA-256 hashes, and immutable system audit logs.

| Step | Action | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **7.1** | On `/reports`, select **"Executive Dossier"** tab. | Generates institutional report with SHA-256 integrity hash and prioritized recommendations. | [ ] |
| **7.2** | Click **"JSON"** button. | Downloads structured `NexFolio_Report_....json` audit snapshot. | [ ] |
| **7.3** | Click **"Print / PDF"** button. | Opens clean print view optimized for physical printing or PDF export (sidebars hidden). | [ ] |
| **7.4** | Switch to **"Audit Trail"** tab. | Lists chronological ledger of all portfolio valuation checkpoints, transactions, and risk evaluations. | [ ] |

---

### Test Suite 8: UI Theme Selector (Dark / Light / System)

**Objective**: Validate zero-error light and dark theme switching and persistence.

| Step | Action | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- |
| **8.1** | Click Theme Icon in Top Header (<kbd>Moon</kbd> / <kbd>Sun</kbd> / <kbd>Laptop</kbd>). | Dropdown popover opens with *Dark (Obsidian)*, *Light (Clean)*, and *System Sync*. | [ ] |
| **8.2** | Select **"Light (Clean)"**. | Entire app transforms into crisp white-slate light theme with sharp contrast and zero unreadable text. | [ ] |
| **8.3** | Select **"Dark (Obsidian)"**. | Entire app returns to deep slate obsidian mode with glowing emerald accents. | [ ] |
| **8.4** | Navigate to `/settings` ➔ **Appearance & UI Theme**. | Theme selector cards reflect active state; clicking any card updates theme immediately. | [ ] |
| **8.5** | Reload page (<kbd>F5</kbd>). | Theme preference persists from `localStorage` without flash of wrong theme (FOUC) or hydration errors. | [ ] |

---

### Test Suite 9: Automated Backend & Cloud Health Probes

**Objective**: Validate production API health, rate limiting, and security headers.

#### 1. Backend Health Check
```bash
curl -i https://nexfolio-ai-service.onrender.com/api/v1/health/ready
```
**Expected Response**:
```json
{
  "status": "READY",
  "service": "NexFolio AI Service",
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "HEALTHY",
      "engine": "MongoDB"
    },
    "ml_model": {
      "status": "HEALTHY",
      "model_version": "v1.2.0-xgboost",
      "features_count": 36
    },
    "market_data": {
      "status": "HEALTHY" or "DEGRADED" (with reference fallback)
    }
  }
}
```

#### 2. Security Headers Probe
```bash
curl -I https://nexfolio-ai-service.onrender.com/api/v1/health/live
```
**Expected Headers**:
* `X-Request-ID`: Trace UUID
* `X-Content-Type-Options: nosniff`
* `X-Frame-Options: DENY`
* `X-XSS-Protection: 1; mode=block`
* `Strict-Transport-Security: max-age=31536000; includeSubDomains`

#### 3. Run Automated Pytest Suite Locally
```bash
cd ai-service
pytest -v
# Output: 53 passed in ~27s
```

#### 4. Run Frontend Production Build Validation Locally
```bash
cd frontend
npm run build
# Output: 17/17 static pages compiled successfully in ~9s
```

---

## 🎯 Verification Sign-Off Table

| Test Suite | Tester Name | Date | Outcome | Comments / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **1. Auth & Account Isolation** | | | `PASS` / `FAIL` | |
| **2. Command Center & Analytics** | | | `PASS` / `FAIL` | |
| **3. Portfolios & Holdings** | | | `PASS` / `FAIL` | |
| **4. XGBoost AI Risk Engine** | | | `PASS` / `FAIL` | |
| **5. Tax Suite & Harvesting** | | | `PASS` / `FAIL` | |
| **6. Markets & Watchlists** | | | `PASS` / `FAIL` | |
| **7. Reports & Audit Trail** | | | `PASS` / `FAIL` | |
| **8. UI Theme Selector** | | | `PASS` / `FAIL` | |
| **9. System Probes & Security** | | | `PASS` / `FAIL` | |
