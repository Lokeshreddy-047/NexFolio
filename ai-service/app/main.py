from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.api.health import router as health_router

from app.api.risk import router as risk_router
from app.api.explain import router as explain_router


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Explainable AI backend for intelligent portfolio risk profiling and investment analytics."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(risk_router, prefix=settings.api_prefix)
app.include_router(explain_router, prefix=settings.api_prefix)


@app.get("/", tags=["Root"])
async def root():
    return {
        "project": "NexFolio",
        "title": "An Explainable AI Framework for Intelligent Portfolio Risk Profiling and Investment Analytics",
        "status": "running"
    }