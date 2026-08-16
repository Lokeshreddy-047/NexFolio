from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from bson import ObjectId
from bson.errors import InvalidId

from app.schemas.user import UserPrincipal
from app.dependencies.auth import get_current_user
from app.schemas.portfolio_request import PortfolioRequest
from app.repositories.prediction_repository import (
    get_predictions_by_user,
    get_prediction_by_id_and_user
)
from app.services.persistence_service import persist_prediction

router = APIRouter(tags=["Prediction History"])


class SavePredictionRequest(BaseModel):
    user_id: Optional[str] = None
    portfolio_id: str
    portfolio_data: PortfolioRequest


@router.post("/predictions/save")
async def save_prediction_endpoint(
    payload: SavePredictionRequest,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Persists an AI risk prediction and SHAP explanation bound to the authenticated user.
    """
    # The authenticated user's verified UID always takes precedence
    authoritative_user_id = current_user.uid

    return await persist_prediction(
        user_id=authoritative_user_id,
        portfolio_id=payload.portfolio_id,
        portfolio_data=payload.portfolio_data.model_dump()
    )


@router.get("/predictions")
async def recent_predictions(
    limit: int = 20,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Retrieves the prediction history belonging exclusively to the authenticated user.
    """
    try:
        documents = await get_predictions_by_user(user_id=current_user.uid, limit=limit)
    except Exception as exc:
        print(f"Prediction history endpoint error: {exc}")
        return []

    response = []
    for doc in documents:
        try:
            response.append({
                "prediction_id": str(doc["_id"]),
                "portfolio_id": doc.get("portfolio_id", "UNKNOWN"),
                "risk_category": doc.get("risk_category", "MEDIUM"),
                "confidence": doc.get("confidence", 0.0),
                "created_at": doc.get("created_at")
            })
        except Exception:
            continue

    return response


@router.get("/predictions/{prediction_id}")
async def prediction_detail(
    prediction_id: str,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Retrieves detailed risk metrics and SHAP explanation for a specific prediction ID.
    Enforces user isolation: will return 404 if the prediction does not belong to the user.
    """
    try:
        ObjectId(prediction_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid prediction ID format."
        )

    document = await get_prediction_by_id_and_user(prediction_id, user_id=current_user.uid)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prediction record not found or access denied."
        )

    document["_id"] = str(document["_id"])
    return document