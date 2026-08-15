from fastapi import APIRouter

from app.schemas.portfolio_request import PortfolioRequest
from app.schemas.explanation_response import ExplainabilityResponse
from app.services.explainability_service import explain_portfolio_risk


router = APIRouter()


@router.post("/explain-risk", response_model=ExplainabilityResponse, tags=["Explainability"])
async def explain_risk(payload: PortfolioRequest):
    return explain_portfolio_risk(payload.model_dump())