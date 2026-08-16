from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ModelProvenance(BaseModel):
    model_name: str = "XGBoost Multiclass Portfolio Risk Classifier"
    model_version: str = "v1.2.0-xgboost"
    feature_dataset_version: str = "v2026.08-institutional"
    data_quality_badge: str = "REFERENCE"  # "REFERENCE" | "LIVE" | "DELAYED"
    analyzed_at: datetime
    data_sufficiency_status: str = "READY"  # "READY" | "INSUFFICIENT_HISTORY" | "MARKET_DATA_UNAVAILABLE" | "MODEL_UNAVAILABLE"
    data_sufficiency_notes: Optional[str] = None


class HumanReadableDriver(BaseModel):
    feature_key: str
    feature_name: str
    impact_score: float
    direction: str  # "RISK_MITIGATOR" | "RISK_AMPLIFIER"
    observed_value: float
    benchmark_baseline: float
    headline: str
    narrative: str
    contextual_effect: str


class HealthScorePillar(BaseModel):
    name: str
    score: int = Field(..., ge=0, le=25)
    max_score: int = 25
    rating: str  # "EXCELLENT" | "GOOD" | "MODERATE" | "NEEDS_ATTENTION"
    description: str
    key_metric_label: str
    key_metric_value: str
    scoring_logic: str = ""
    formula: str = ""
    inputs_observed: Dict[str, Any] = {}


class HealthScorecard(BaseModel):
    overall_score: int = Field(..., ge=0, le=100)
    grade: str  # "A+" | "A" | "B" | "C" | "D"
    pillars: List[HealthScorePillar] = []
    summary: str


class TraceableRecommendation(BaseModel):
    id: str
    priority_rank: int
    category: str  # "SECTOR_REBALANCING" | "ASSET_DIVERSIFICATION" | "DEFENSIVE_ALLOCATION" | "VOLATILITY_MITIGATION"
    severity: str  # "HIGH" | "MEDIUM" | "LOW"
    title: str
    description: str
    trigger_condition: str
    metric_name: str
    metric_observed: str
    metric_threshold: str
    affected_holdings: List[str] = []
    suggested_review_action: str


class QuantitativeMetrics(BaseModel):
    annualized_return: float
    annualized_volatility: float
    portfolio_beta: float
    portfolio_sharpe_ratio: float
    portfolio_sortino_ratio: float
    portfolio_calmar_ratio: float
    diversification_score: float
    portfolio_max_drawdown: float
    asset_count: int
    sector_count: int


class DecisionTimelinePoint(BaseModel):
    checkpoint_date: str
    health_score: int
    risk_category: str
    primary_driver: str
    portfolio_value: float


class PortfolioIntelligenceResponse(BaseModel):
    portfolio_id: str
    portfolio_name: str
    provenance: ModelProvenance
    risk_category: str  # "LOW" | "MODERATE" | "HIGH"
    confidence: float
    probabilities: Dict[str, float]
    health_scorecard: HealthScorecard
    risk_mitigators: List[HumanReadableDriver] = []
    risk_amplifiers: List[HumanReadableDriver] = []
    recommendations: List[TraceableRecommendation] = []
    quantitative_metrics: QuantitativeMetrics
    ai_decision_timeline: List[DecisionTimelinePoint] = []
    scenario_presets: Dict[str, Dict[str, float]] = {
        "DEFENSIVE_SHIFT": {"equity_pct": 30.0, "etf_pct": 30.0, "debt_pct": 25.0, "gold_pct": 15.0, "crypto_pct": 0.0},
        "MAX_DIVERSIFICATION": {"equity_pct": 40.0, "etf_pct": 30.0, "debt_pct": 15.0, "gold_pct": 15.0, "crypto_pct": 0.0},
        "CONCENTRATION_TAPER": {"equity_pct": 50.0, "etf_pct": 30.0, "debt_pct": 10.0, "gold_pct": 10.0, "crypto_pct": 0.0}
    }


class WhatIfSimulationRequest(BaseModel):
    simulated_allocations: Dict[str, float] = Field(
        ...,
        description="Asset allocations (e.g. {'equity_pct': 50, 'etf_pct': 20, 'debt_pct': 20, 'gold_pct': 10, 'crypto_pct': 0})"
    )


class SimulationMetricDelta(BaseModel):
    current_value: Any
    simulated_value: Any
    delta: Any
    direction: str  # "IMPROVED" | "DEGRADED" | "UNCHANGED"


class WhatIfSimulationResponse(BaseModel):
    portfolio_id: str
    validation_status: str = "VALID"
    allocations_used: Dict[str, float]
    current_risk_category: str
    simulated_risk_category: str
    current_confidence: float
    simulated_confidence: float
    current_health_score: int
    simulated_health_score: int
    score_delta: int
    risk_level_changed: bool
    metrics_comparison: Dict[str, SimulationMetricDelta]
    top_driver_shifts: List[HumanReadableDriver] = []
    simulation_notes: str
