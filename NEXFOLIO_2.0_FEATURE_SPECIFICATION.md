# 🚀 NexFolio 2.0: Master Feature Specification & Implementation Blueprint

An institutional-grade, multi-asset wealth operating system and explainable AI risk intelligence platform tailored for Indian capital markets.

---

```
                                  ┌──────────────────────────────────────────────────────────────────┐
                                  │                  NexFolio 2.0 Core Architecture                  │
                                  └────────────────────────────────┬─────────────────────────────────┘
                                                                   │
         ┌────────────────────────────────┬────────────────────────┴────────┬───────────────────────────────┬──────────────────────────────┐
         ▼                                ▼                                  ▼                               ▼                              ▼
┌──────────────────┐            ┌──────────────────┐               ┌──────────────────┐            ┌──────────────────┐           ┌──────────────────┐
│ MODULE 1:        │            │ MODULE 2:        │               │ MODULE 3:        │            │ MODULE 4:        │           │ MODULE 5:        │
│ Dual Ingestion   │            │ 3-Second Risk    │               │ Multi-Asset &    │            │ Automated Tax    │           │ AI Copilot &     │
│ (Broker + Manual)│            │ Visual Engine    │               │ MF Look-Through  │            │ & Rebalancing    │           │ Alerts / PWA     │
└──────────────────┘            └──────────────────┘               └──────────────────┘            └──────────────────┘           └──────────────────┘
```

---

## 📋 Table of Contents
1. [Project Health & Technical Debt Cleanup](#-project-health--technical-debt-cleanup)
2. [Module 1: Dual Ingestion Engine (1-Click Broker Sync + 4 Manual Methods)](#-module-1-dual-ingestion-engine-1-click-broker-sync--4-manual-methods)
3. [Module 2: 3-Second Crystal Clear Risk Intelligence & Crash Simulator](#-module-2-3-second-crystal-clear-risk-intelligence--crash-simulator)
4. [Module 3: Multi-Asset Engine & Mutual Fund Look-Through Deconstruct](#-module-3-multi-asset-engine--mutual-fund-look-through-deconstruct)
5. [Module 4: Automated Portfolio Rebalancing & Zerodha Basket Generator](#-module-4-automated-portfolio-rebalancing--zerodha-basket-generator)
6. [Module 5: Dividend Radar & Income Forecaster (Section 194 TDS)](#-module-5-dividend-radar--income-forecaster-section-194-tds)
7. [Module 6: Smart Volatility & Drawdown Alert Engine](#-module-6-smart-volatility--drawdown-alert-engine)
8. [Module 7: Conversational AI Financial Copilot (RAG Chatbot)](#-module-7-conversational-ai-financial-copilot-rag-chatbot)
9. [Module 8: Mobile PWA & Native Gesture Framework](#-module-8-mobile-pwa--native-gesture-framework)
10. [🛠️ Master Implementation Roadmap & File Change Manifest](#️-master-implementation-roadmap--file-change-manifest)

---

# 🧹 Project Health & Technical Debt Cleanup

Prior to building new modules, the existing codebase should be cleaned up to ensure zero runtime warnings, proper indexation, and optimized bundle sizes.

### Action Items
1. **Backend Lifespan Implementation (`ai-service/app/main.py`)**:
   * Add `@asynccontextmanager async def lifespan(app: FastAPI)` to call `ensure_db_indexes()` on MongoDB startup and connect market data feed adapters.
   * Gracefully close MongoDB client sessions and HTTP clients on application shutdown.
2. **Declare Missing Dependencies (`ai-service/requirements.txt`)**:
   * Add `certifi>=2024.0.0` (required by `mongodb.py` for SSL cert verification).
3. **Delete Ghost NPM Files in Python Backend**:
   * Delete `ai-service/package.json`, `ai-service/package-lock.json`, and `ai-service/node_modules/`.
4. **Remove Unused Frontend Test Routes & Folders**:
   * Remove `frontend/app/test-api/` and `frontend/app/test-risk/`.
   * Delete the empty directory `frontend/services/`.
5. **Standardize Virtual Environments**:
   * Consolidate on a single `.venv` under `ai-service/`, removing redundant root `.venv` and inactive venvs.
6. **Organize Root Clutter**:
   * Move academic PDFs (`Base Paper.pdf`, `Supporting Paper 1-3.pdf`) to `docs/research_papers/`.
   * Move presentation decks (`NexFolio_Review1_*.pptx`, `*.pdf`) to `docs/presentations/`.
   * Move generator scripts (`generate_fig1.py`, `generate_pdf_report.py`, etc.) to `scripts/`.

---

# 📥 Module 1: Dual Ingestion Engine (1-Click Broker Sync + 4 Manual Methods)

Provides complete flexibility: users can automatically link Demat accounts **or** manage everything 100% privately without sharing credentials.

```
                                  ┌──────────────────────────────────────────────┐
                                  │      How Do You Want to Add Your Assets?     │
                                  └──────────────────────┬───────────────────────┘
                                                         │
               ┌─────────────────────────────────────────┴─────────────────────────────────────────┐
               ▼                                                                                   ▼
┌─────────────────────────────────────────┐                               ┌─────────────────────────────────────────┐
│     METHOD A: 1-Click Automated Sync    │                               │     METHOD B: 100% Manual & Private     │
├─────────────────────────────────────────┤                               ├─────────────────────────────────────────┤
│ • Zerodha Kite / Upstox / Angel One     │                               │ • 1. Smart Multi-Asset Quick-Add Modal  │
│ • Secure OAuth 2.0 (Read-Only)          │                               │ • 2. 1-Click CSV/Excel Drag & Drop      │
│ • Auto-fetches buy prices & quantities  │                               │ • 3. CAMS / KFintech CAS PDF Import     │
│ • Auto-adjusts for splits & dividends   │                               │ • 4. Inline Spreadsheet Grid View      │
└─────────────────────────────────────────┘                               └─────────────────────────────────────────┘
```

### 1.1 Automated Broker Sync Architecture
* **OAuth 2.0 Flow**: Handshake with Zerodha Kite Connect, Upstox API v2, or Angel One SmartAPI.
* **Token Security**: Tokens are AES-256 encrypted in MongoDB (`broker_connections` collection) with `read_only` scope.
* **Backend Endpoint**: `POST /api/v1/integrations/broker/sync`
* **Data Mapping**: Normalizes broker ticker strings (`NSE:RELIANCE-EQ` $\rightarrow$ `RELIANCE.NS`).

### 1.2 The 4 Frictionless Manual Ingestion Methods
1. **Smart Multi-Asset Quick-Add Modal**: Single auto-complete search bar categorizing Equities, Mutual Funds, SGBs, Gold ETFs, FDs, and G-Secs.
2. **Universal CSV / Excel Drag & Drop**: Auto-detects columns from broker tradebook exports (Zerodha, Groww, ICICI Direct, HDFC Sky).
3. **CAMS / KFintech eCAS PDF Parser**: Extracts folios, schemes, and SIP transaction histories from password-protected mutual fund CAS statements using `pypdf` / `pdfplumber`.
4. **Spreadsheet "Quick-Edit" Mode**: Inline editable table on `/holdings` allowing direct adjustments of quantities, buy dates, and purchase prices.

---

# 🎯 Module 2: 3-Second Crystal Clear Risk Intelligence & Crash Simulator

Eliminates complex statistical confusion and delivers instant, actionable risk comprehension.

```
 ┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
 │ 🎯 OVERALL PORTFOLIO RISK STATUS                                                                        │
 │                                                                                                        │
 │       LOW RISK 🟢              MODERATE RISK 🟡              HIGH RISK 🔴                              │
 │   [ Conservative ]             [  Balanced  ]           [   AGGRESSIVE   ]                             │
 │   ═══════════════════════════════════════════════════════════▲════════════════                         │
 │                                                         Score: 78/100                                  │
 │                                                                                                        │
 │  🗣️ IN PLAIN ENGLISH:                                                                                  │
 │  "Your portfolio is in the HIGH RISK zone because 52% of your capital is concentrated in just 2 tech   │
 │   stocks, making your portfolio 34% more volatile than the Nifty 50 index."                            │
 └────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 The 3-Pillar Visual Breakdown Cards
1. **Concentration Risk (Single Asset & Sector Dominance)**:
   * Color-coded badge: Safe ($< 25\%$), Moderate ($25\% - 40\%$), Danger ($> 40\%$).
2. **Market Sensitivity ($\beta$)**:
   * Measures speed of portfolio movement relative to Nifty 50 ($\beta = 1.0$).
3. **Downside Drawdown Risk**:
   * Projects the worst-case drop based on historical covariance matrices.

```
┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│ 1. Concentration Risk   │    │ 2. Market Sensitivity   │    │ 3. Max Simulated Drop   │
│         🔴 HIGH         │    │       🟡 MODERATE       │    │      🔴 -22.4% DROP     │
│ 52% in Top 2 Stocks     │    │ Beta: 1.18 (Nifty=1.0)  │    │ Worst-case 1-year dip   │
│ Safe Target: < 25%      │    │ Moves slightly faster   │    │ simulated on 2020 crash │
└─────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
```

### 2.2 Visual "What's Pulling Your Risk UP vs DOWN?" (SHAP Drivers)
* **Risk Amplifiers (Red)**: Identifies the exact positions driving risk higher (e.g., *+38% High IT Sector Exposure*).
* **Risk Mitigators (Green)**: Identifies positions protecting the portfolio (e.g., *-24% Sovereign Gold Bond Allocation*).

### 2.3 Rupee Market Crash Simulator (Stress Test)
Translates percentage drawdowns into actual financial impact:
* **Normal Correction (-5% Nifty)** $\rightarrow$ *Portfolio drops -5.9% (-₹1,08,500)*
* **Major Bear Market (-15% Nifty)** $\rightarrow$ *Portfolio drops -18.2% (-₹3,35,000)*
* **2020 Covid Crash Repeat (-30% Nifty)** $\rightarrow$ *Portfolio drops -34.8% (-₹6,42,000)*

---

# 🪙 Module 3: Multi-Asset Engine & Mutual Fund Look-Through Deconstruct

Enables full tracking of Indian wealth assets and eliminates hidden portfolio concentration.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       Multi-Asset Portfolio View                                        │
├──────────────────────────┬──────────────────────────┬─────────────────────────┬─────────────────────────┤
│ 📊 Equities (40%)        │ 📈 Mutual Funds (30%)    │ 🪙 Gold & SGBs (20%)    │ 🏛️ Debt & Cash (10%)    │
│ • Direct NSE/BSE stocks  │ • AMFI Daily NAV sync    │ • 2.5% RBI Coupon SGBs  │ • G-Secs & Fixed Dep.   │
└──────────────────────────┴──────────────────────────┴─────────────────────────┴─────────────────────────┘
```

### 3.1 Supported Asset Classes
* **Mutual Funds**: Tracks daily NAV via AMFI open data feeds (`https://www.amfiindia.com/spages/NAVAll.txt`).
* **Sovereign Gold Bonds (SGBs)**: Tracks live trading prices on NSE + computes semi-annual 2.5% sovereign interest payouts + calculates tax-exempt maturity redemption value.
* **Gold & Silver ETFs**: Live tick tracking for `GOLDBEES`, `SILVERBEES`.
* **Debt & Fixed Income**: RBI Retail Direct G-Secs, T-Bills, Corporate NCDs, FDs, PPF/EPF.

### 3.2 Mutual Fund Look-Through & Overlap Matrix
Disassembles underlying fund portfolios to compute true consolidated exposure:
$$\text{True Weight of Stock } i = \frac{\text{Direct Shares Value}_i + \sum_{k=1}^M \left(\text{MF Value}_k \times \text{Weight of Stock } i \text{ in Fund } k\right)}{\text{Total Portfolio Valuation}}$$

* **Alert Example**:
  > ⚠️ *Hidden Overlap Warning: Although you own 3 separate mutual funds, HDFC Bank represents 21.4% of your total wealth.*

---

# ⚖️ Module 4: Automated Portfolio Rebalancing & Zerodha Basket Generator

Converts risk insights into exact, tax-optimized buy/sell execution orders.

```
┌───────────────────────────┐    Target: Moderate Risk    ┌──────────────────────────────────┐
│ Over-concentrated in Tech │ ──────────────────────────> │ Generated Trades:                │
│ Health Score: 61/100      │   [Run Quadratic Optimizer] │ • SELL 12 TCS.NS  (Harvest STCL) │
│ Portfolio Beta: 1.34      │                             │ • BUY  25 HDFCBANK.NS            │
│                           │                             │ 📥 Download Zerodha Basket .csv  │
└───────────────────────────┘                             └──────────────────────────────────┘
```

### 4.1 Optimization Logic
* **Objective Function**:
  $$\min_{\mathbf{w}} \; \mathbf{w}^T \mathbf{\Sigma} \mathbf{w} - \lambda \mathbf{w}^T \mathbf{\mu}$$
  * *Subject to*: $\text{Max Stock Cap} \le 15\%$, $\text{Max Sector Cap} \le 25\%$, $\beta_{\text{target}} \le 1.05$.
* **Tax-Loss Harvesting Priority**:
  * Sells loss-making positions first to bank Short-Term Capital Losses ($\text{STCL}$) to offset realized gains.
  * Avoids selling long-term holdings close to the 365-day boundary to protect the 12.5% LTCG rate.
* **Order Export**:
  * Generates 1-click downloadable `.csv` ready for import into **Zerodha Basket Orders**, **Groww**, or **Upstox**.

---

# 💰 Module 5: Dividend Radar & Income Forecaster (Section 194 TDS)

Tracks corporate actions, ex-dividend dates, and tax obligations under the Income-tax Act, 2025.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  📅 Dividend Calendar (Next 30 Days):                                                  │
│  • TCS (Ex-Date: 18 Oct)     ──> ₹28.00 / share  ──> Projected Payout: ₹1,400          │
│  • ITC (Ex-Date: 04 Nov)     ──> ₹6.25  / share  ──> Projected Payout: ₹3,125          │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  💵 Projected FY 2025-26 Dividends: ₹48,600  │  🏷️ Estimated TDS (Sec 194): ₹4,860     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Key Capabilities
* **Ex-Date Timeline**: Shows upcoming dividend dates and alerts users when to hold through the record date.
* **Projected 12-Month Cashflow**: Regression-based dividend forecast by month (Jan–Dec).
* **Section 194 TDS Tracking**: Flags companies where single-year dividend payouts exceed ₹5,000, triggering 10% TDS deduction.

---

# 🔔 Module 6: Smart Volatility & Drawdown Alert Engine

Monitors market movements in real time and triggers instant notifications.

```
┌───────────────────────────┐     ┌────────────────────────────┐     ┌────────────────────────────┐
│ Real-Time Market SSE Feed │ ──> │ Rule Engine Evaluation     │ ──> │ Alert Dispatcher           │
│ (2-second tick updates)   │     │ • Intraday Drawdown > 2.5% │     │ • Browser Web Push API     │
│                           │     │ • Portfolio Beta > 1.30    │     │ • Audio Toast Notification │
│                           │     │ • 52-Week High Breakout    │     │ • Telegram / Email Webhook │
└───────────────────────────┘     └────────────────────────────┘     └────────────────────────────┘
```

### 6.1 Rule Triggers
1. **Intraday Drawdown Spike**: Triggers if portfolio value drops $> 2.5\%$ in a single session.
2. **Beta Inflation**: Triggers if portfolio $\beta$ crosses $1.25$.
3. **Sector Concentration Cap**: Triggers if a single sector crosses $35\%$ of total portfolio valuation.
4. **52-Week High/Low Breakouts**: Alerts when held stocks break historical highs or lows.
5. **Delivery**: Sent via SSE in-app toast banners and Browser Web Push notifications when offline.

---

# 🤖 Module 7: Conversational AI Financial Copilot (RAG Chatbot)

An intelligent, context-aware financial copilot powered by Google Gemini.

```
                       ┌────────────────────────────────────────────────────────┐
                       │                   User Copilot Query                   │
                       │  "Why did my portfolio underperform Nifty 50 today?"   │
                       └──────────────────────────┬─────────────────────────────┘
                                                  │
                                                  ▼
                       ┌────────────────────────────────────────────────────────┐
                       │          Dynamic Portfolio & Market RAG Context        │
                       │  • Live Holdings, P&L, Beta, Sector Weights            │
                       │  • SHAP Risk Drivers (Mitigators & Amplifiers)         │
                       │  • Capital Gains Schedule (STCG/LTCG, Loss Bank)       │
                       │  • Live Macro Indicators (Crude, Repo Rate, USD/INR)   │
                       └──────────────────────────┬─────────────────────────────┘
                                                  │
                                                  ▼
                       ┌────────────────────────────────────────────────────────┐
                       │               Gemini Financial LLM Engine               │
                       └──────────────────────────┬─────────────────────────────┘
                                                  │
                                                  ▼
                       ┌────────────────────────────────────────────────────────┐
                       │                     Copilot Answer                     │
                       │ "Your portfolio fell 1.4% while Nifty fell 0.3%.       │
                       │  Primary cause: 42% exposure to IT (TCS, INFY) which   │
                       │  dropped following US Fed rate commentary.             │
                       │  Suggested action: Consider hedging with Banking/FMCG" │
                       └────────────────────────────────────────────────────────┘
```

### 7.1 Key Queries Supported
* *"Why did my portfolio drop today compared to Nifty?"*
* *"What is my tax liability if I sell 100 shares of Reliance today?"*
* *"Suggest 3 low-beta FMCG stocks to balance my tech-heavy portfolio."*

---

# 📱 Module 8: Mobile PWA & Native Gesture Framework

Delivers a responsive, mobile-first progressive web application.

```
┌────────────────────────────────────────────────────────┐
│                   NexFolio Mobile PWA                  │
├────────────────────────────────────────────────────────┤
│  🟢 NIFTY 50: 24,252 (+0.72%)                          │
│                                                        │
│  Portfolio: ₹18,45,200   Day P&L: +₹14,230 (+0.78%)    │
│                                                        │
│  [ 👈 Swipe left on holding to Harvest Loss / Sell ]   │
│  [ 👇 Pull down to trigger live market refresh ]       │
│  [ 📳 Haptic feedback on price flashes and trades ]    │
│                                                        │
│  ⚡ Offline Mode Supported • 📲 Instant App Install     │
└────────────────────────────────────────────────────────┘
```

### 8.1 Key Features
* **PWA App Shell**: `manifest.json` with dark/light splash screens and standalone mobile display.
* **Offline Caching**: Service worker caches UI assets and last-known portfolio state.
* **Touch Gestures & Haptics**: Swipe-to-sell/harvest, pull-to-refresh, and haptic feedback via `navigator.vibrate`.

---

# 🛠️ Master Implementation Roadmap & File Change Manifest

| Module | Backend Files to Add / Modify | Frontend Files to Add / Modify |
| :--- | :--- | :--- |
| **Clean Up & Lifespan** | • `ai-service/app/main.py` (Add `lifespan`)<br>• `ai-service/requirements.txt` (Add `certifi`)<br>• Delete ghost `ai-service/package.json` | • Delete `frontend/app/test-api`<br>• Delete `frontend/app/test-risk`<br>• Delete empty `frontend/services` |
| **Module 1: Dual Ingestion** | • `ai-service/app/api/integrations.py`<br>• `ai-service/app/services/cas_parser_service.py` | • `frontend/components/add-asset-modal.tsx`<br>• `frontend/components/csv-importer.tsx`<br>• `frontend/components/cas-upload-dialog.tsx` |
| **Module 2: 3-Second Risk** | • `ai-service/app/services/stress_test_service.py`<br>• `ai-service/app/api/intelligence.py` | • `frontend/components/risk-gauge-speedometer.tsx`<br>• `frontend/components/crash-simulator-card.tsx`<br>• `frontend/app/intelligence/page.tsx` |
| **Module 3: Multi-Asset & MF** | • `ai-service/app/services/mf_lookup_service.py`<br>• `ai-service/app/services/sgb_service.py` | • `frontend/components/asset-allocation-breakdown.tsx`<br>• `frontend/components/mf-overlap-matrix.tsx` |
| **Module 4: Auto-Rebalancing** | • `ai-service/app/services/rebalancer_service.py`<br>• `ai-service/app/api/portfolios.py` | • `frontend/components/rebalance-preview-modal.tsx`<br>• `frontend/components/basket-export-button.tsx` |
| **Module 5: Dividend Radar** | • `ai-service/app/services/dividend_service.py` | • `frontend/app/dividends/page.tsx`<br>• `frontend/components/dividend-calendar.tsx` |
| **Module 6: Smart Alerts** | • `ai-service/app/services/alert_evaluator.py`<br>• `ai-service/app/api/notifications.py` | • `frontend/components/alert-manager-modal.tsx`<br>• `frontend/lib/push-notifications.ts` |
| **Module 7: AI Copilot** | • `ai-service/app/services/copilot_service.py`<br>• `ai-service/app/api/copilot.py` | • `frontend/components/ai-copilot-drawer.tsx` |
| **Module 8: Mobile PWA** | N/A | • `frontend/public/manifest.json`<br>• `frontend/public/sw.js`<br>• `frontend/app/layout.tsx` |

---

*Generated for NexFolio Architecture & Engineering Team.*
