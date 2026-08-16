from fastapi import APIRouter

from app.schemas.portfolio_request import PortfolioRequest
from app.schemas.portfolio_response import RiskPredictionResponse
from app.services.prediction_service import predict_portfolio_risk


router = APIRouter(tags=["Risk Prediction"])


@router.post("/predict-risk", response_model=RiskPredictionResponse)
@router.post("/risk", response_model=RiskPredictionResponse)
async def predict_risk(payload: PortfolioRequest):
    result = predict_portfolio_risk(payload.model_dump())
    return result