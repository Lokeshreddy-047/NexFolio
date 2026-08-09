from fastapi import APIRouter
from app.config.settings import settings

router = APIRouter()


@router.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "message": "NexFolio AI backend is running successfully"
    }