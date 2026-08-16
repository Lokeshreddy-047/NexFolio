from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class TaxRuleSet(BaseModel):
    rule_set_id: str = "INDIA_EQUITY_TAX_2026_27"
    law: str = "Income-tax Act, 2025"
    tax_year: str = "Tax Year 2026-27"
    effective_from: str = "2026-04-01"
    effective_to: Optional[str] = "2027-03-31"
    equity_stcg_rate: float = 0.20  # Section 111A
    equity_ltcg_rate: float = 0.125  # Section 112A
    section_112a_exemption: float = 125000.0
    listed_equity_holding_period_months: int = 12
    unlisted_equity_holding_period_months: int = 24
    buyback_promoter_domestic_rate: float = 0.22  # Effective 22% for domestic corporate promoters
    buyback_promoter_other_rate: float = 0.30  # Effective 30% for other promoters
    surcharge_ceiling_special_rates: float = 0.15  # 15% surcharge cap on special rate capital gains
    cess_rate: float = 0.04  # 4% Health & Education Cess
    loss_carryforward_years: int = 8
    statutory_notes: str = (
        "Tax Year 2026-27 under Income-tax Act, 2025. STCG @ 20% (<=12 months), "
        "LTCG @ 12.5% on qualifying listed equity exceeding ₹1,25,000 threshold. "
        "Buybacks taxed under Capital Gains framework with special promoter rates."
    )


class LegacyTaxLoss(BaseModel):
    source_tax_year: str
    source_law: str = "Income-tax Act, 1961"
    loss_type: str = Field(..., description="'STCL' or 'LTCL'")
    original_amount: float
    utilized_amount: float
    remaining_amount: float
    expiry_tax_year: str
    migrated_to_act_2025: bool = True


class TaxLossBankItem(BaseModel):
    loss_type: str = Field(..., description="'STCL' or 'LTCL'")
    available_amount: float
    usable_against: str
    oldest_source_tax_year: str
    expiry_tax_year: str
    days_to_expiry: int


class TaxLossBank(BaseModel):
    total_available_stcl: float
    total_available_ltcl: float
    total_banked_loss: float
    bank_items: List[TaxLossBankItem] = []


class RealizedTradeLot(BaseModel):
    lot_id: str
    transaction_id: str
    buy_tx_id: Optional[str] = None
    sell_tx_id: Optional[str] = None
    symbol: str
    company_name: str
    buy_date: datetime
    sell_date: datetime
    holding_period_months: int
    holding_period_days: int
    quantity: float
    buy_price: float
    sell_price: float
    cost_basis: float
    sale_proceeds: float
    realized_pnl: float
    realized_pnl_pct: float
    is_buyback: bool = False
    promoter_category: str = "NON_PROMOTER"  # NON_PROMOTER, PROMOTER_DOMESTIC_COMPANY, PROMOTER_OTHER
    classification: str = Field(
        ...,
        description="'STCG_111A', 'LTCG_112A', 'LTCG_OTHER', 'STCL', 'LTCL', 'BUYBACK_PROMOTER_DOMESTIC', 'BUYBACK_PROMOTER_OTHER'"
    )
    base_tax_rate: float
    stt_paid: float = 0.0
    rule_set_id: str = "INDIA_EQUITY_TAX_2026_27"


class Section112ATracker(BaseModel):
    annual_threshold: float = 125000.0
    gross_112a_gains: float = 0.0
    ltcl_absorbed: float = 0.0
    stcl_absorbed: float = 0.0
    net_112a_ltcg_before_exemption: float = 0.0
    threshold_consumed: float = 0.0
    threshold_remaining: float = 125000.0
    taxable_112a_ltcg: float = 0.0
    estimated_112a_base_tax: float = 0.0


class CapitalGainsSchedule(BaseModel):
    tax_year: str
    governing_law: str
    # STCG Bucket
    gross_stcg: float = 0.0
    gross_stcl: float = 0.0
    stcl_setoff_against_stcg: float = 0.0
    net_stcg: float = 0.0
    taxable_stcg: float = 0.0
    estimated_stcg_base_tax: float = 0.0

    # 112A LTCG Bucket
    section_112a: Section112ATracker

    # Buyback Bucket
    buyback_proceeds: float = 0.0
    buyback_cost_basis: float = 0.0
    buyback_net_gain: float = 0.0
    buyback_base_tax: float = 0.0

    # Loss Bank Impact
    legacy_losses_absorbed: float = 0.0
    unabsorbed_stcl_to_bank: float = 0.0
    unabsorbed_ltcl_to_bank: float = 0.0

    # Consolidated Tax Calculation Layers
    total_base_tax: float = 0.0
    applicable_surcharge_rate: float = 0.0
    surcharge_amount: float = 0.0
    cess_rate: float = 0.04
    cess_amount: float = 0.0
    total_estimated_tax_liability: float = 0.0


class TaxLossHarvestingCandidate(BaseModel):
    holding_id: Optional[str] = None
    symbol: str
    company_name: str
    sector: str
    quantity: float
    avg_buy_price: float
    current_price: float
    current_value: float
    invested_amount: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    holding_period_months: int
    holding_period_days: int
    loss_classification: str = Field(..., description="'POTENTIAL_STCL' or 'POTENTIAL_LTCL'")
    portfolio_weight_pct: float = 0.0
    harvestable_loss: float
    allowable_setoff_amount: float
    estimated_incremental_tax_saving: float
    recommendation_rationale: str


class TaxLossHarvestingAnalysis(BaseModel):
    total_unrealized_losses: float
    short_term_harvestable_losses: float
    long_term_harvestable_losses: float
    total_estimated_potential_tax_reduction: float
    post_harvest_estimated_tax_liability: float
    candidates_count: int
    candidates: List[TaxLossHarvestingCandidate] = []


class TaxReportResponse(BaseModel):
    portfolio_id: str
    portfolio_name: str
    currency: str = "INR"
    generated_at: datetime
    rule_set: TaxRuleSet
    capital_gains: CapitalGainsSchedule
    tax_loss_bank: TaxLossBank
    loss_harvesting: TaxLossHarvestingAnalysis
    realized_lots: List[RealizedTradeLot]
    disclaimer: str = (
        "NexFolio provides quantitative estimation and loss harvesting optimization based on "
        "your investment ledger and live market quotes. Computation strictly follows the "
        "Income-tax Act, 2025 (Tax Year 2026-27). This report is for portfolio intelligence and "
        "reconciliation purposes and does not constitute statutory tax assessment. Verify with "
        "a certified Chartered Accountant (CA) for official return filing."
    )
