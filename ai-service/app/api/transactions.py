from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas.user import UserPrincipal
from app.dependencies.auth import get_current_user
from app.schemas.transaction import TransactionCreate, TransactionResponse
from app.repositories.portfolio_repository import get_portfolio_by_id_and_user
from app.repositories.transaction_repository import (
    record_transaction,
    get_transactions_by_user,
    delete_transaction
)

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    payload: TransactionCreate,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Records a BUY or SELL transaction and automatically calculates holding balances & weighted average cost.
    """
    portfolio_doc = await get_portfolio_by_id_and_user(payload.portfolio_id, user_id=current_user.uid)
    if not portfolio_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found or access denied."
        )

    tx_doc = await record_transaction(
        user_id=current_user.uid,
        data=payload.model_dump()
    )

    return TransactionResponse(
        id=tx_doc["_id"],
        portfolio_id=tx_doc["portfolio_id"],
        user_id=current_user.uid,
        symbol=tx_doc["symbol"],
        company_name=tx_doc["company_name"],
        transaction_type=tx_doc["transaction_type"],
        quantity=tx_doc["quantity"],
        price=tx_doc["price"],
        total_amount=tx_doc["total_amount"],
        asset_type=tx_doc["asset_type"],
        sector=tx_doc["sector"],
        transaction_date=tx_doc["transaction_date"],
        notes=tx_doc.get("notes"),
        created_at=tx_doc.get("created_at")
    )


@router.get("", response_model=List[TransactionResponse])
async def list_transactions(
    portfolio_id: Optional[str] = Query(None, description="Filter by portfolio ID"),
    symbol: Optional[str] = Query(None, description="Filter by stock symbol"),
    transaction_type: Optional[str] = Query(None, description="Filter by BUY or SELL"),
    limit: int = Query(100, ge=1, le=500),
    skip: int = Query(0, ge=0),
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Retrieves the transaction ledger for the authenticated user with optional filtering.
    """
    txs = await get_transactions_by_user(
        user_id=current_user.uid,
        portfolio_id=portfolio_id,
        symbol=symbol,
        transaction_type=transaction_type,
        limit=limit,
        skip=skip
    )

    return [
        TransactionResponse(
            id=t["_id"],
            portfolio_id=t["portfolio_id"],
            user_id=current_user.uid,
            symbol=t["symbol"],
            company_name=t.get("company_name", t["symbol"]),
            transaction_type=t["transaction_type"],
            quantity=t["quantity"],
            price=t["price"],
            total_amount=t["total_amount"],
            asset_type=t.get("asset_type", "Equity"),
            sector=t.get("sector", "Other"),
            transaction_date=t["transaction_date"],
            notes=t.get("notes"),
            created_at=t.get("created_at")
        )
        for t in txs
    ]


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_transaction(
    transaction_id: str,
    current_user: UserPrincipal = Depends(get_current_user)
):
    """
    Deletes a transaction record.
    """
    success = await delete_transaction(transaction_id, user_id=current_user.uid)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction record not found or access denied."
        )
    return None
