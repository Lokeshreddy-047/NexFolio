from fastapi import APIRouter
from pydantic import BaseModel
from bson import ObjectId
from bson.errors import InvalidId


from app.schemas.portfolio_request import PortfolioRequest
from app.repositories.prediction_repository import (
    get_recent_predictions,
    get_prediction_by_id
)
from app.services.persistence_service import persist_prediction

router = APIRouter()


class SavePredictionRequest(BaseModel):
    user_id: str
    portfolio_id: str
    portfolio_data: PortfolioRequest


@router.post("/predictions/save", tags=["Prediction History"])
async def save_prediction_endpoint(payload: SavePredictionRequest):
    return await persist_prediction(
        user_id=payload.user_id,
        portfolio_id=payload.portfolio_id,
        portfolio_data=payload.portfolio_data.model_dump()
    )


@router.get("/predictions", tags=["Prediction History"])
async def recent_predictions(limit: int = 20):
    documents = await get_recent_predictions(limit)

    response = []
    for doc in documents:
        response.append({
            "prediction_id": str(doc["_id"]),
            "portfolio_id": doc["portfolio_id"],
            "risk_category": doc["risk_category"],
            "confidence": doc["confidence"],
            "created_at": doc["created_at"]
        })

    return response


@router.get("/predictions/{prediction_id}")
async def prediction_detail(prediction_id: str):

    try:
        ObjectId(prediction_id)

    except InvalidId:
        return {"error": "Invalid prediction ID"}

    document = await get_prediction_by_id(prediction_id)

    if not document:
        return {"error": "Prediction not found"}

    document["_id"] = str(document["_id"])
    return document