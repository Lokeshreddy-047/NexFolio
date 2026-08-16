from fastapi import APIRouter, Response, status
from app.config.settings import settings
from app.db.mongodb import get_database
from app.services.prediction_service import get_model, get_feature_metadata
from app.services.market_data import market_data_manager

router = APIRouter()


@router.get("/health", tags=["Health"])
async def health_check():
    """Liveness probe returning basic process heartbeat."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.version,
        "message": "NexFolio AI backend is running successfully"
    }


@router.get("/health/ready", tags=["Health"])
async def readiness_probe(response: Response):
    """
    Readiness probe verifying database connectivity, ML model loading,
    and market data provider status.
    """
    checks = {}
    is_ready = True

    # 1. MongoDB connectivity check
    try:
        db = get_database()
        if hasattr(db, "command"):
            await db.command("ping")
        checks["database"] = {"status": "HEALTHY", "engine": "MongoDB"}
    except Exception as exc:
        checks["database"] = {"status": "UNHEALTHY", "error": str(exc)}
        is_ready = False

    # 2. XGBoost Model & Metadata Check
    try:
        model = get_model()
        meta = get_feature_metadata()
        checks["ml_model"] = {
            "status": "HEALTHY" if model is not None else "DEGRADED",
            "model_version": meta.get("model_version", "v1.2.0-xgboost") if meta else "unknown",
            "features_count": len(meta.get("feature_names", [])) if meta else 0
        }
    except Exception as exc:
        checks["ml_model"] = {"status": "UNHEALTHY", "error": str(exc)}
        is_ready = False

    # 3. Market Data Manager Check
    try:
        mkt_health = await market_data_manager.health_check()
        checks["market_data"] = mkt_health
    except Exception as exc:
        checks["market_data"] = {"status": "DEGRADED", "error": str(exc)}

    overall_status = "READY" if is_ready else "NOT_READY"
    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": overall_status,
        "service": settings.app_name,
        "version": settings.version,
        "checks": checks
    }