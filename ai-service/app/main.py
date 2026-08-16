from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.api.health import router as health_router

from app.api.risk import router as risk_router
from app.api.explain import router as explain_router
from app.api.recommendations import router as recommendations_router
from app.api.prediction_history import router as prediction_history_router
from app.api.auth import router as auth_router
from app.api.portfolios import router as portfolios_router
from app.api.intelligence import router as intelligence_router
from app.api.holdings import router as holdings_router
from app.api.transactions import router as transactions_router
from app.api.stocks import router as stocks_router
from app.api.markets import router as markets_router
from app.api.watchlists import router as watchlists_router
from app.api.reports import router as reports_router
from app.api.notifications import router as notifications_router
from app.api.stream import router as stream_router
from app.middleware.security import SecurityHeadersMiddleware
from app.middleware.rate_limit import SlidingWindowRateLimiter
from app.middleware.error_handler import register_exception_handlers


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Explainable AI backend for intelligent portfolio risk profiling and investment analytics."
)

# 1. Security Headers & Request ID Tracing
app.add_middleware(SecurityHeadersMiddleware)

# 2. Rate Limiting Middleware
app.add_middleware(
    SlidingWindowRateLimiter,
    default_limit_per_minute=300,
    ml_limit_per_minute=60
)

# 3. Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins if settings.allowed_origins != ["*"] else ["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"https://.*\.vercel\.app|https://.*\.onrender\.com|http://localhost:.*|http://127.0.0.1:.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Standardized Global Exception Handlers
register_exception_handlers(app)

app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(portfolios_router, prefix=settings.api_prefix)
app.include_router(intelligence_router, prefix=settings.api_prefix)
app.include_router(markets_router, prefix=settings.api_prefix)
app.include_router(watchlists_router, prefix=settings.api_prefix)
app.include_router(reports_router, prefix=settings.api_prefix)
app.include_router(notifications_router, prefix=settings.api_prefix)
app.include_router(stream_router, prefix=settings.api_prefix)
app.include_router(holdings_router, prefix=settings.api_prefix)
app.include_router(transactions_router, prefix=settings.api_prefix)
app.include_router(stocks_router, prefix=settings.api_prefix)
app.include_router(risk_router, prefix=settings.api_prefix)
app.include_router(explain_router, prefix=settings.api_prefix)
app.include_router(recommendations_router, prefix=settings.api_prefix)
app.include_router(prediction_history_router, prefix=settings.api_prefix)


@app.get("/", tags=["Root"])
async def root():
    return {
        "project": "NexFolio",
        "title": "An Explainable AI Framework for Intelligent Portfolio Risk Profiling and Investment Analytics",
        "status": "running"
    }