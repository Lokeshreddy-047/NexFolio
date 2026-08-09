from pydantic import BaseModel


class RiskPredictionResponse(BaseModel):
    risk_category: str
    confidence: float
    probabilities: dict[str, float]