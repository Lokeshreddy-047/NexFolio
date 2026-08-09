from pydantic import BaseModel


class FeatureImpact(BaseModel):
    feature: str
    impact: float


class ExplainabilityResponse(BaseModel):
    risk_category: str
    confidence: float
    top_positive_contributors: list[FeatureImpact]
    top_negative_contributors: list[FeatureImpact]