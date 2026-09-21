from typing import List, Optional
from pydantic import BaseModel, Field


class MonteCarloRequest(BaseModel):
    iterations: int = Field(default=10000, ge=100, le=50000, description="Number of Monte Carlo paths to generate")
    horizon_days: int = Field(default=252, ge=10, le=1000, description="Trading days horizon for the simulation")
    confidence_levels: List[float] = Field(default=[0.95, 0.99], description="Confidence intervals for VaR/CVaR")


class TrajectoryPoint(BaseModel):
    day: int = Field(..., description="Trading day offset from baseline")
    p5: float = Field(..., description="5th percentile value (severe bear floor)")
    p25: float = Field(..., description="25th percentile value (conservative trajectory)")
    p50: float = Field(..., description="50th percentile median expected value")
    p75: float = Field(..., description="75th percentile value (optimistic trajectory)")
    p95: float = Field(..., description="95th percentile value (super bull corridor)")


class VaRMetrics(BaseModel):
    var_95_pct: float = Field(..., description="1-Year 95% Value at Risk as a percentage")
    var_95_amount: float = Field(..., description="1-Year 95% Value at Risk in portfolio currency")
    var_99_pct: float = Field(..., description="1-Year 99% Value at Risk as a percentage")
    var_99_amount: float = Field(..., description="1-Year 99% Value at Risk in portfolio currency")
    cvar_95_pct: float = Field(..., description="95% Conditional VaR / Expected Shortfall percentage")
    cvar_95_amount: float = Field(..., description="95% Conditional VaR / Expected Shortfall currency amount")
    cvar_99_pct: float = Field(..., description="99% Conditional VaR / Expected Shortfall percentage")
    cvar_99_amount: float = Field(..., description="99% Conditional VaR / Expected Shortfall currency amount")
    daily_var_95_pct: float = Field(..., description="1-Day 95% Value at Risk percentage")
    daily_var_95_amount: float = Field(..., description="1-Day 95% Value at Risk currency amount")
    prob_loss_pct: float = Field(..., description="Probability of experiencing a capital loss over the horizon")
    prob_drawdown_10_pct: float = Field(..., description="Probability of experiencing >= 10% drawdown")
    prob_drawdown_20_pct: float = Field(..., description="Probability of experiencing >= 20% drawdown")
    prob_drawdown_30_pct: float = Field(..., description="Probability of experiencing >= 30% drawdown")


class MonteCarloResponse(BaseModel):
    portfolio_id: str
    portfolio_name: str
    initial_value: float
    iterations: int
    horizon_days: int
    trajectories: List[TrajectoryPoint]
    var_metrics: VaRMetrics
    expected_final_value: float
    median_final_value: float
    worst_case_5pct_value: float
    best_case_95pct_value: float
    annualized_return: float
    annualized_volatility: float
    summary_verdict: str


class SectorDamageItem(BaseModel):
    sector: str
    weight_pct: float
    shock_pct: float
    contribution_to_loss_pct: float


class CrisisScenarioInfo(BaseModel):
    id: str
    name: str
    era: str
    duration_days: int
    benchmark_shock_pct: float
    recovery_months: int
    narrative: str
    vulnerable_sectors: List[str]
    defensive_sectors: List[str]


class CrisisStressRequest(BaseModel):
    scenario_id: str = Field(default="covid_2020", description="Crisis scenario identifier")
    custom_market_shock_pct: Optional[float] = Field(default=None, ge=-90.0, le=50.0, description="Custom overall benchmark shock %")
    custom_volatility_multiplier: Optional[float] = Field(default=None, ge=1.0, le=5.0, description="Custom volatility multiplier")


class CrisisStressResponse(BaseModel):
    scenario_id: str
    scenario_name: str
    portfolio_initial_value: float
    projected_portfolio_loss_pct: float
    projected_portfolio_loss_amount: float
    projected_final_value: float
    benchmark_loss_pct: float
    relative_alpha_pct: float
    stress_verdict: str
    worst_hit_holding: Optional[str] = None
    worst_hit_holding_loss_pct: Optional[float] = None
    safest_holding: Optional[str] = None
    safest_holding_resilience: Optional[str] = None
    estimated_recovery_months: int
    sector_damage_breakdown: List[SectorDamageItem]
    hedging_recommendations: List[str]
