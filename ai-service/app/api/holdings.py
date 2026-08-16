from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.schemas.user import UserPrincipal
from app.dependencies.auth import get_current_user
from app.schemas.holding import HoldingCreate, HoldingUpdate, HoldingResponse
from app.repositories.portfolio_repository import get_portfolio_by_id_and_user
from app.repositories.holding_repository import (
    create_direct_holding,
    get_holdings_by_portfolio,
    get_holding_by_id_and_user,
    update_holding,
    delete_holding
)
from app.services.portfolio_analytics_service import compute_holdings_metrics
from app.services.market_data.manager import market_data_manager

router = APIRouter(prefix="/holdings", tags=["Holdings & Investments"])


@router.post("", response_model=HoldingResponse, status_code=status.HTTP_201_CREATED)
async def add_holding(
    payload: HoldingCreate,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Adds an investment position to a portfolio.
    """
    # Verify portfolio ownership
    portfolio_doc = await get_portfolio_by_id_and_user(payload.portfolio_id, user_id=current_user.uid)
    if not portfolio_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found or access denied."
        )

    holding_doc = await create_direct_holding(
        user_id=current_user.uid,
        data=payload.model_dump()
    )

    raw_holdings = await get_holdings_by_portfolio(payload.portfolio_id, user_id=current_user.uid)
    symbols = [h.get("symbol", "") for h in raw_holdings if h.get("symbol")]
    live_quotes = await market_data_manager.get_batch_quotes(symbols) if symbols else {}
    computed_holdings, _, _, _, _ = compute_holdings_metrics(raw_holdings, quotes=live_quotes)

    for h in computed_holdings:
        if h.id == str(holding_doc["_id"]):
            return h

    return HoldingResponse(
        id=str(holding_doc["_id"]),
        portfolio_id=holding_doc["portfolio_id"],
        user_id=current_user.uid,
        symbol=holding_doc["symbol"],
        company_name=holding_doc["company_name"],
        asset_type=holding_doc["asset_type"],
        sector=holding_doc["sector"],
        quantity=holding_doc["quantity"],
        avg_buy_price=holding_doc["avg_buy_price"],
        current_price=holding_doc["current_price"],
        invested_value=holding_doc["quantity"] * holding_doc["avg_buy_price"],
        current_value=holding_doc["quantity"] * holding_doc["current_price"],
        unrealized_pnl=(holding_doc["quantity"] * holding_doc["current_price"]) - (holding_doc["quantity"] * holding_doc["avg_buy_price"]),
        unrealized_pnl_pct=0.0,
        weight=0.0,
        created_at=holding_doc.get("created_at"),
        updated_at=holding_doc.get("updated_at")
    )


@router.get("", response_model=List[HoldingResponse])
async def list_holdings_for_portfolio(
    portfolio_id: str,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Retrieves all holdings for a specific portfolio with live weight and P&L calculations.
    """
    portfolio_doc = await get_portfolio_by_id_and_user(portfolio_id, user_id=current_user.uid)
    if not portfolio_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found or access denied."
        )

    raw_holdings = await get_holdings_by_portfolio(portfolio_id, user_id=current_user.uid)
    symbols = [h.get("symbol", "") for h in raw_holdings if h.get("symbol")]
    live_quotes = await market_data_manager.get_batch_quotes(symbols) if symbols else {}
    computed_holdings, _, _, _, _ = compute_holdings_metrics(raw_holdings, quotes=live_quotes)
    return computed_holdings


@router.put("/{holding_id}", response_model=HoldingResponse)
async def update_existing_holding(
    holding_id: str,
    payload: HoldingUpdate,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Updates holding quantity, buy price, or sector categorization.
    """
    existing = await get_holding_by_id_and_user(holding_id, user_id=current_user.uid)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holding record not found or access denied."
        )

    updated = await update_holding(holding_id, user_id=current_user.uid, update_data=payload.model_dump())
    raw_holdings = await get_holdings_by_portfolio(existing["portfolio_id"], user_id=current_user.uid)
    computed_holdings, _, _, _, _ = compute_holdings_metrics(raw_holdings)

    for h in computed_holdings:
        if h.id == holding_id:
            return h

    raise HTTPException(status_code=404, detail="Holding could not be refreshed.")


@router.delete("/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_holding(
    holding_id: str,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Removes a holding position from a portfolio.
    """
    success = await delete_holding(holding_id, user_id=current_user.uid)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Holding record not found or access denied."
        )
    return None
