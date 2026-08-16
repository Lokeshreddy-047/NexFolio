from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.user import UserPrincipal
from app.dependencies.auth import get_current_user
from app.schemas.intelligence import (
    PortfolioIntelligenceResponse,
    WhatIfSimulationRequest,
    WhatIfSimulationResponse
)
from app.repositories.portfolio_repository import get_portfolio_by_id_and_user
from app.repositories.holding_repository import get_holdings_by_portfolio
from app.services.intelligence_service import (
    generate_portfolio_intelligence,
    simulate_what_if_risk
)

router = APIRouter(prefix="/portfolios", tags=["Portfolio Intelligence"])


@router.get("/{portfolio_id}/intelligence", response_model=PortfolioIntelligenceResponse)
async def get_portfolio_deep_intelligence(
    portfolio_id: str,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Returns deep AI intelligence, model provenance, human-readable SHAP drivers,
    transparent 4-pillar health scorecard, and traceable recommendations for the active portfolio.
    """
    portfolio_doc = await get_portfolio_by_id_and_user(portfolio_id=portfolio_id, user_id=current_user.uid)
    if not portfolio_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found or access denied."
        )

    raw_holdings = await get_holdings_by_portfolio(portfolio_id=portfolio_id, user_id=current_user.uid)

    return await generate_portfolio_intelligence(
        user_id=current_user.uid,
        portfolio_doc=portfolio_doc,
        raw_holdings=raw_holdings
    )


@router.post("/{portfolio_id}/simulate", response_model=WhatIfSimulationResponse)
async def simulate_portfolio_rebalancing_risk(
    portfolio_id: str,
    payload: WhatIfSimulationRequest,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Pure functional 'What-If' risk simulation sandbox.
    Never modifies real holdings, transactions, or historical snapshots.
    """
    portfolio_doc = await get_portfolio_by_id_and_user(portfolio_id=portfolio_id, user_id=current_user.uid)
    if not portfolio_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found or access denied."
        )

    raw_holdings = await get_holdings_by_portfolio(portfolio_id=portfolio_id, user_id=current_user.uid)

    return simulate_what_if_risk(
        portfolio_doc=portfolio_doc,
        raw_holdings=raw_holdings,
        request=payload
    )
