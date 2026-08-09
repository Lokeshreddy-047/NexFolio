from pydantic import BaseModel, Field


class PortfolioRequest(BaseModel):
    annualized_return: float = Field(..., ge=-1.0, le=5.0)
    annualized_volatility: float = Field(..., ge=0.0, le=5.0)
    portfolio_beta: float = Field(..., ge=0.0, le=5.0)
    asset_count: int = Field(..., ge=1, le=100)
    sector_count: int = Field(..., ge=1, le=50)
    portfolio_sharpe_ratio: float = Field(..., ge=-10.0, le=10.0)
    portfolio_sortino_ratio: float = Field(..., ge=-10.0, le=20.0)
    portfolio_calmar_ratio: float = Field(..., ge=-10.0, le=20.0)
    diversification_score: float = Field(..., ge=0.0, le=100.0)
    portfolio_max_drawdown: float = Field(..., ge=-1.0, le=0.0)
    return_1M: float = Field(..., ge=-1.0, le=5.0)
    return_3M: float = Field(..., ge=-1.0, le=5.0)
    return_6M: float = Field(..., ge=-1.0, le=5.0)
    return_1Y: float = Field(..., ge=-1.0, le=5.0)