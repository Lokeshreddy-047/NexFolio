from fastapi import APIRouter

from app.schemas.portfolio_request import PortfolioRequest

router = APIRouter()


def generate_recommendations(portfolio: dict) -> list[str]:
    recs: list[str] = []

    volatility = float(portfolio.get("annualized_volatility", 0.0))
    beta = float(portfolio.get("portfolio_beta", 0.0))
    asset_count = int(portfolio.get("asset_count", 0))
    sector_count = int(portfolio.get("sector_count", 0))
    sharpe = float(portfolio.get("portfolio_sharpe_ratio", 0.0))
    max_drawdown = float(portfolio.get("portfolio_max_drawdown", 0.0))
    diversification = float(portfolio.get("diversification_score", 0.0))

    if volatility > 0.25:
        recs.append("Reduce exposure to highly volatile assets and increase defensive allocations.")
    if beta > 1.0:
        recs.append("Portfolio beta is above 1.0, indicating elevated market sensitivity.")
    if asset_count < 8:
        recs.append("Increase the number of holdings to improve diversification.")
    if sector_count < 5:
        recs.append("Expand exposure across more sectors to reduce concentration risk.")
    if sharpe < 0.5:
        recs.append("Improve risk-adjusted return by favoring stronger return-to-risk assets.")
    if max_drawdown < -0.5:
        recs.append("Historical drawdown is severe; consider capital-preservation constraints.")
    if diversification < 60:
        recs.append("Diversification score is low, so reduce concentration in large positions.")

    if not recs:
        recs.append("Portfolio risk profile appears balanced. Continue periodic monitoring and disciplined rebalancing.")

    return recs


@router.post("/recommendations", tags=["Recommendations"])
async def recommendations(payload: PortfolioRequest):
    portfolio = payload.model_dump()
    recs = generate_recommendations(portfolio)
    return {
        "recommendations": recs,
        "count": len(recs),
    }
