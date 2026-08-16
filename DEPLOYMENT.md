# NexFolio Production Deployment & Operations Guide

This guide outlines the production architecture, containerization, environment configuration, and deployment procedures for **NexFolio: An Explainable AI Framework for Intelligent Portfolio Risk Profiling and Investment Analytics**.

---

## 1. System Architecture

```
                               ┌─────────────────────────┐
                               │  Client Browser / HTTPS │
                               └────────────┬────────────┘
                                            │
                                            ▼
                        ┌───────────────────────────────────────┐
                        │   Next.js 14 Frontend (Port 3000)     │
                        │   - Standalone Node.js Container      │
                        │   - SSR / Client-Side Auth State      │
                        └───────────────────┬───────────────────┘
                                            │ REST / JSON (X-Request-ID)
                                            ▼
                        ┌───────────────────────────────────────┐
                        │    FastAPI AI Backend (Port 8000)     │
                        │    - Security Headers & Tracing       │
                        │    - Sliding Window Rate Limiting     │
                        │    - Dual-Loop Valuation Engine       │
                        │    - Market Data Provider (Pluggable) │
                        └─────────┬───────────────────┬─────────┘
                                  │                   │
                     Read / Write │                   │ Inference
                                  ▼                   ▼
     ┌──────────────────────────────┐       ┌──────────────────────────────┐
     │      MongoDB 7.0 (Port 27017)│       │  XGBoost & SHAP Models       │
     │  - Portfolios & Transactions │       │  - 28-Feature Pipeline       │
     │  - Immutable Report Snapshots│       │  - TreeExplainer             │
     │  - Audit Logs & Dedupe State │       │  - Four-Pillar Health Engine │
     └──────────────────────────────┘       └──────────────────────────────┘
```

---

## 2. Quickstart with Docker Compose

Ensure Docker and Docker Compose are installed on the host machine.

### Step 1: Clone Repository & Configure Environment
```bash
git clone https://github.com/Lokeshreddy-047/NexFolio.git
cd NexFolio

# Copy environment templates
cp ai-service/.env.example ai-service/.env
cp frontend/.env.example frontend/.env
```

### Step 2: Build and Launch Containers
```bash
docker compose up -d --build
```

### Step 3: Verify Service Health
```bash
# Check container status
docker compose ps

# Check backend readiness probe
curl -i http://localhost:8000/api/v1/health/ready

# Check frontend accessibility
curl -I http://localhost:3000/
```

Access the application at [http://localhost:3000](http://localhost:3000).

---

## 3. Production Environment Hardening Checklist

### 1. Data Feed Pedigree Architecture
NexFolio strictly honors honest market data pedigree across 5 distinct states:
- `LIVE`: Permitted real-time tick streaming from licensed NSE vendors.
- `DELAYED`: 15-minute delayed vendor feed.
- `REFERENCE`: Offline analytical parquet dataset (`market_features.parquet`).
- `FALLBACK_REFERENCE`: Automatic fallback when live stream drops or heartbeat timeouts occur.
- `UNAVAILABLE`: Complete market feed outage.

To connect an authorized real-time vendor, set:
```env
MARKET_DATA_PROVIDER=live
LIVE_FEED_VENDOR_URL=wss://feed.vendor.com/nse/v1
LIVE_FEED_API_KEY=your_production_key
```

### 2. Security Headers & Tracing
The backend automatically injects enterprise security headers on every response:
- `X-Request-ID`: Distributed UUID4 trace correlation header.
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### 3. Rate Limiting Protection
- Standard API endpoints: **300 requests / minute**.
- Heavy ML Inference & Report Generation (`/intelligence`, `/explain`, `/report`): **60 requests / minute**.
- Responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `Retry-After` headers.

---

## 4. Cloud Deployment Runbooks

### Option A: AWS ECS / Fargate
1. Push container images to Amazon Elastic Container Registry (ECR):
   - `aws ecr get-login-password | docker login ...`
   - Tag and push `nexfolio-ai-service` and `nexfolio-frontend`.
2. Provision Amazon DocumentDB or MongoDB Atlas cluster.
3. Deploy ECS Task Definitions with Fargate launch type.
4. Put Application Load Balancer (ALB) in front with TLS termination.

### Option B: Google Cloud Run
1. Build and push to Google Artifact Registry:
   ```bash
   gcloud builds submit --tag gcr.io/PROJECT_ID/nexfolio-ai-service ./ai-service
   gcloud builds submit --tag gcr.io/PROJECT_ID/nexfolio-frontend ./frontend
   ```
2. Deploy AI Service:
   ```bash
   gcloud run deploy nexfolio-ai-service \
     --image gcr.io/PROJECT_ID/nexfolio-ai-service \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```
3. Deploy Frontend Service with `NEXT_PUBLIC_API_URL` pointing to the AI Service URL.

---

## 5. Automated Verification & Testing
To run the automated validation suite locally:
```bash
# AI Service unit & integration tests (33 tests)
cd ai-service
pytest -v

# Frontend linting & build validation
cd ../frontend
npm run lint
npm run build
```
