from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    portfolio_id: str
    symbol: str = Field(..., min_length=1, max_length=30)
    company_name: Optional[str] = None
    transaction_type: Literal["BUY", "SELL"]
    quantity: float = Field(..., gt=0)
    price: float = Field(..., gt=0)
    asset_type: str = Field("Equity", pattern="^(Equity|ETF|Debt|Gold|Crypto|Other)$")
    sector: Optional[str] = None
    transaction_date: Optional[datetime] = None
    notes: Optional[str] = None


class TransactionResponse(BaseModel):
    id: str
    portfolio_id: str
    user_id: str
    symbol: str
    company_name: str
    transaction_type: str
    quantity: float
    price: float
    total_amount: float
    asset_type: str
    sector: str
    transaction_date: datetime
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
