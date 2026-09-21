from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.user import UserPrincipal
from app.dependencies.auth import get_current_user, get_optional_user
from app.schemas.stress_test import (
    MonteCarloRequest,
    MonteCarloResponse,
    CrisisStressRequest,
    CrisisStressResponse,
    CrisisScenarioInfo
)
from app.repositories.portfolio_repository import get_portfolio_by_id_and_user
from app.repositories.holding_repository import get_holdings_by_portfolio
from app.services.stress_testing_service import (
    run_monte_carlo_simulation,
    run_crisis_stress_test,
    get_all_crisis_scenarios
)

router = APIRouter(tags=["Stress Testing & Monte Carlo"])


@router.get("/stress-test/scenarios", response_model=List[CrisisScenarioInfo])
async def list_crisis_scenarios():
    """
    Returns the catalog of calibrated historical crash scenarios (2008 Lehman GFC,
    2020 COVID Flash Crash, 2022 Inflation/Rate Hike, 2016 Demonetization).
    """
    return get_all_crisis_scenarios()


@router.post("/portfolios/{portfolio_id}/monte-carlo", response_model=MonteCarloResponse)
async def execute_monte_carlo_simulation(
    portfolio_id: str,
    payload: MonteCarloRequest = MonteCarloRequest(),
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Executes an institutional 10,000-run Geometric Brownian Motion (GBM) Monte Carlo simulation,
    computing empirical 95% & 99% Value at Risk (VaR), Conditional VaR (Expected Shortfall),
    and percentile trajectory corridors.
    """
    portfolio = await get_portfolio_by_id_and_user(portfolio_id, current_user.uid)
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Portfolio {portfolio_id} not found or unauthorized"
        )

    holdings = await get_holdings_by_portfolio(portfolio_id, current_user.uid)
    return run_monte_carlo_simulation(portfolio, holdings, payload)


@router.post("/portfolios/{portfolio_id}/crisis-simulation", response_model=CrisisStressResponse)
async def execute_crisis_stress_test(
    portfolio_id: str,
    payload: CrisisStressRequest = CrisisStressRequest(),
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Evaluates the portfolio's simulated drawdown under historical macroeconomic shocks
    or customizable black swan market drawdowns, attributing sector damage and recovery timeline.
    """
    portfolio = await get_portfolio_by_id_and_user(portfolio_id, current_user.uid)
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Portfolio {portfolio_id} not found or unauthorized"
        )

    holdings = await get_holdings_by_portfolio(portfolio_id, current_user.uid)
    return run_crisis_stress_test(portfolio, holdings, payload)
