from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class HoldingBase(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=30)
    company_name: Optional[str] = None
    asset_type: str = Field("Equity", pattern="^(Equity|ETF|Debt|Gold|Crypto|Other)$")
    sector: Optional[str] = "Other"
    quantity: float = Field(..., gt=0)
    buy_price: float = Field(..., ge=0)
    current_price: Optional[float] = None
    notes: Optional[str] = None


class HoldingCreate(HoldingBase):
    portfolio_id: str


class HoldingUpdate(BaseModel):
    quantity: Optional[float] = Field(None, gt=0)
    buy_price: Optional[float] = Field(None, ge=0)
    current_price: Optional[float] = Field(None, ge=0)
    sector: Optional[str] = None
    asset_type: Optional[str] = None
    notes: Optional[str] = None


class HoldingResponse(BaseModel):
    id: str
    portfolio_id: str
    user_id: str
    symbol: str
    company_name: str
    asset_type: str
    sector: str
    quantity: float
    avg_buy_price: float
    current_price: float
    invested_value: float
    current_value: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    weight: float = 0.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
