import io
import csv
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Dict, Any
from collections import deque

from app.schemas.tax import (
    TaxRuleSet,
    LegacyTaxLoss,
    TaxLossBankItem,
    TaxLossBank,
    RealizedTradeLot,
    Section112ATracker,
    CapitalGainsSchedule,
    TaxLossHarvestingCandidate,
    TaxLossHarvestingAnalysis,
    TaxReportResponse
)
from app.repositories.portfolio_repository import get_portfolio_by_id_and_user
from app.repositories.holding_repository import get_holdings_by_portfolio
from app.repositories.transaction_repository import get_transactions_by_user
from app.services.market_data.manager import market_data_manager
from app.services.market_data.symbol_normalizer import SymbolNormalizer


# ---------------------------------------------------------------------------
# Versioned Indian Tax Rule Registry (Income-tax Act, 2025 & Act, 1961)
# ---------------------------------------------------------------------------

TAX_RULE_REGISTRY: Dict[str, TaxRuleSet] = {
    "Tax Year 2026-27": TaxRuleSet(
        rule_set_id="INDIA_EQUITY_TAX_2026_27",
        law="Income-tax Act, 2025",
        tax_year="Tax Year 2026-27",
        effective_from="2026-04-01",
        effective_to="2027-03-31",
        equity_stcg_rate=0.20,
        equity_ltcg_rate=0.125,
        section_112a_exemption=125000.0,
        listed_equity_holding_period_months=12,
        unlisted_equity_holding_period_months=24,
        buyback_promoter_domestic_rate=0.22,
        buyback_promoter_other_rate=0.30,
        surcharge_ceiling_special_rates=0.15,
        cess_rate=0.04,
        loss_carryforward_years=8,
        statutory_notes=(
            "Tax Year 2026-27 under Income-tax Act, 2025 (effective 1 April 2026). "
            "STCG @ 20% (<=12 months), LTCG @ 12.5% on qualifying Section 112A equity exceeding ₹1.25L threshold. "
            "Buybacks moved to Capital Gains framework (22% domestic corporate promoter / 30% other promoter). "
            "Includes 4% Health & Education Cess."
        )
    ),
    "FY 2025-26": TaxRuleSet(
        rule_set_id="INDIA_EQUITY_TAX_2025_26",
        law="Income-tax Act, 1961",
        tax_year="FY 2025-26",
        effective_from="2025-04-01",
        effective_to="2026-03-31",
        equity_stcg_rate=0.20,
        equity_ltcg_rate=0.125,
        section_112a_exemption=125000.0,
        listed_equity_holding_period_months=12,
        unlisted_equity_holding_period_months=24,
        buyback_promoter_domestic_rate=0.22,
        buyback_promoter_other_rate=0.30,
        surcharge_ceiling_special_rates=0.15,
        cess_rate=0.04,
        loss_carryforward_years=8,
        statutory_notes="FY 2025-26 under Income-tax Act, 1961 (post-Budget 2024 amendment)."
    ),
    "FY 2024-25": TaxRuleSet(
        rule_set_id="INDIA_EQUITY_TAX_2024_25",
        law="Income-tax Act, 1961",
        tax_year="FY 2024-25",
        effective_from="2024-04-01",
        effective_to="2025-03-31",
        equity_stcg_rate=0.20,
        equity_ltcg_rate=0.125,
        section_112a_exemption=125000.0,
        listed_equity_holding_period_months=12,
        unlisted_equity_holding_period_months=24,
        buyback_promoter_domestic_rate=0.22,
        buyback_promoter_other_rate=0.30,
        surcharge_ceiling_special_rates=0.15,
        cess_rate=0.04,
        loss_carryforward_years=8,
        statutory_notes="FY 2024-25 under Income-tax Act, 1961."
    )
}


def get_tax_rule_set(tax_year_label: Optional[str] = None) -> TaxRuleSet:
    """Resolves versioned TaxRuleSet by tax year label, defaulting to Tax Year 2026-27."""
    if not tax_year_label or tax_year_label == "ALL":
        return TAX_RULE_REGISTRY["Tax Year 2026-27"]
    return TAX_RULE_REGISTRY.get(tax_year_label, TAX_RULE_REGISTRY["Tax Year 2026-27"])


def resolve_tax_year_from_date(dt: datetime) -> str:
    """
    Resolves official Tax Year and governing law terminology from transaction timestamp.
    - >= 1 April 2026 -> 'Tax Year 2026-27' (Income-tax Act, 2025)
    - April 2025 - March 2026 -> 'FY 2025-26' (Income-tax Act, 1961)
    - Prior -> 'FY YYYY-YY'
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    year = dt.year
    month = dt.month

    # April 1st cutoff
    if month >= 4:
        start_year = year
        end_year = year + 1
    else:
        start_year = year - 1
        end_year = year

    if start_year >= 2026:
        return f"Tax Year {start_year}-{str(end_year)[-2:]}"
    else:
        return f"FY {start_year}-{str(end_year)[-2:]}"


def calculate_calendar_holding_period(
    buy_date: datetime,
    sell_date: datetime,
    asset_class: str = "Equity"
) -> Tuple[int, int, bool]:
    """
    Computes holding duration using exact calendar-month comparison.
    Returns:
      (holding_period_months, holding_period_days, is_long_term)
    - Listed Equity: Long-Term if held strictly more than 12 calendar months.
    """
    if buy_date.tzinfo is None:
        buy_date = buy_date.replace(tzinfo=timezone.utc)
    if sell_date.tzinfo is None:
        sell_date = sell_date.replace(tzinfo=timezone.utc)

    days = max(0, (sell_date - buy_date).days)
    
    # Calculate exact calendar months
    months = (sell_date.year - buy_date.year) * 12 + (sell_date.month - buy_date.month)
    if sell_date.day < buy_date.day:
        months = max(0, months - 1)

    # 12-month calendar boundary threshold calculation (with leap year protection)
    try:
        threshold_date = buy_date.replace(year=buy_date.year + 1)
    except ValueError:
        # Handle Feb 29 leap year date
        threshold_date = buy_date.replace(year=buy_date.year + 1, day=28)

    is_long_term = sell_date > threshold_date
    return months, days, is_long_term


# ---------------------------------------------------------------------------
# Deterministic FIFO Lot Matcher with Buyback & Promoter Support
# ---------------------------------------------------------------------------

def match_transactions_fifo(
    raw_txs: List[dict],
    rule_set: Optional[TaxRuleSet] = None
) -> Tuple[List[RealizedTradeLot], Dict[str, deque]]:
    """
    Performs deterministic FIFO lot matching across BUY, SELL, and BUYBACK transactions.
    Zero ML invocations. Lot-level auditable.
    """
    active_rule = rule_set or get_tax_rule_set("Tax Year 2026-27")
    sorted_txs = sorted(raw_txs, key=lambda x: x.get("transaction_date", datetime.min))

    open_lots: Dict[str, deque] = {}
    realized_lots: List[RealizedTradeLot] = []
    lot_counter = 1

    for tx in sorted_txs:
        can_sym = SymbolNormalizer.to_canonical(tx.get("symbol", ""))
        company = tx.get("company_name", can_sym)
        tx_type = tx.get("transaction_type", "BUY").upper()
        qty = float(tx.get("quantity", 0))
        price = float(tx.get("price", 0))
        tx_date = tx.get("transaction_date")
        tx_id = str(tx.get("_id", tx.get("id", "")))
        stt_paid = float(tx.get("stt_paid", 0.0))
        promoter_cat = tx.get("promoter_category", "NON_PROMOTER")

        if isinstance(tx_date, str):
            try:
                tx_date = datetime.fromisoformat(tx_date.replace("Z", "+00:00"))
            except Exception:
                tx_date = datetime.now(timezone.utc)
        elif not isinstance(tx_date, datetime):
            tx_date = datetime.now(timezone.utc)

        if can_sym not in open_lots:
            open_lots[can_sym] = deque()

        if tx_type == "BUY":
            open_lots[can_sym].append({
                "tx_id": tx_id,
                "buy_date": tx_date,
                "quantity": qty,
                "price": price,
                "company_name": company
            })
        elif tx_type in ("SELL", "BUYBACK"):
            remaining_sell_qty = qty
            is_buyback = (tx_type == "BUYBACK")

            while remaining_sell_qty > 0 and open_lots[can_sym]:
                earliest_lot = open_lots[can_sym][0]
                matched_qty = min(remaining_sell_qty, earliest_lot["quantity"])
                buy_price = earliest_lot["price"]
                buy_date = earliest_lot["buy_date"]
                buy_tx_id = earliest_lot["tx_id"]

                months, days, is_long_term = calculate_calendar_holding_period(buy_date, tx_date)
                cost_basis = round(matched_qty * buy_price, 2)
                sale_proceeds = round(matched_qty * price, 2)
                realized_pnl = round(sale_proceeds - cost_basis, 2)
                realized_pnl_pct = round((realized_pnl / cost_basis) * 100, 2) if cost_basis > 0 else 0.0

                # Classification and Base Tax Rate Resolution
                if is_buyback:
                    if promoter_cat == "PROMOTER_DOMESTIC_COMPANY":
                        classification = "BUYBACK_PROMOTER_DOMESTIC"
                        base_tax_rate = active_rule.buyback_promoter_domestic_rate  # 22%
                    elif promoter_cat == "PROMOTER_OTHER":
                        classification = "BUYBACK_PROMOTER_OTHER"
                        base_tax_rate = active_rule.buyback_promoter_other_rate  # 30%
                    else:
                        # Non-promoter retail buyback follows capital gains framework
                        classification = "LTCG_112A" if is_long_term else "STCG_111A"
                        base_tax_rate = active_rule.equity_ltcg_rate if is_long_term else active_rule.equity_stcg_rate
                else:
                    if realized_pnl >= 0:
                        classification = "LTCG_112A" if is_long_term else "STCG_111A"
                        base_tax_rate = active_rule.equity_ltcg_rate if is_long_term else active_rule.equity_stcg_rate
                    else:
                        classification = "LTCL" if is_long_term else "STCL"
                        base_tax_rate = 0.0

                realized_lots.append(RealizedTradeLot(
                    lot_id=f"LOT_{lot_counter:04d}",
                    transaction_id=tx_id,
                    buy_tx_id=buy_tx_id,
                    sell_tx_id=tx_id,
                    symbol=can_sym,
                    company_name=company,
                    buy_date=buy_date,
                    sell_date=tx_date,
                    holding_period_months=months,
                    holding_period_days=days,
                    quantity=matched_qty,
                    buy_price=buy_price,
                    sell_price=price,
                    cost_basis=cost_basis,
                    sale_proceeds=sale_proceeds,
                    realized_pnl=realized_pnl,
                    realized_pnl_pct=realized_pnl_pct,
                    is_buyback=is_buyback,
                    promoter_category=promoter_cat,
                    classification=classification,
                    base_tax_rate=base_tax_rate,
                    stt_paid=stt_paid,
                    rule_set_id=active_rule.rule_set_id
                ))
                lot_counter += 1

                earliest_lot["quantity"] -= matched_qty
                remaining_sell_qty -= matched_qty

                if earliest_lot["quantity"] <= 1e-6:
                    open_lots[can_sym].popleft()

    return realized_lots, open_lots


# ---------------------------------------------------------------------------
# Multi-Stage Set-Off Engine & Section 112A Threshold Calculator
# ---------------------------------------------------------------------------

def compute_capital_gains_schedule(
    realized_lots: List[RealizedTradeLot],
    target_tax_year: str = "Tax Year 2026-27",
    legacy_losses: Optional[List[LegacyTaxLoss]] = None
) -> CapitalGainsSchedule:
    """
    Executes the statutory multi-stage loss set-off hierarchy, Section 112A threshold
    utilization, and separate Surcharge & 4% Cess modeling.
    """
    rule_set = get_tax_rule_set(target_tax_year)

    # 1. Filter lots for target tax year
    filtered_lots = []
    for lot in realized_lots:
        lot_ty = resolve_tax_year_from_date(lot.sell_date)
        if target_tax_year == "ALL" or lot_ty == target_tax_year or target_tax_year in lot_ty:
            filtered_lots.append(lot)

    # 2. Bucketing Gains & Losses
    gross_stcg = 0.0
    gross_stcl = 0.0
    gross_112a_ltcg = 0.0
    gross_ltcl = 0.0

    buyback_proceeds = 0.0
    buyback_cost_basis = 0.0
    buyback_net_gain = 0.0
    buyback_base_tax = 0.0

    for lot in filtered_lots:
        if lot.is_buyback and lot.promoter_category != "NON_PROMOTER":
            buyback_proceeds += lot.sale_proceeds
            buyback_cost_basis += lot.cost_basis
            gain = max(0.0, lot.realized_pnl)
            buyback_net_gain += gain
            buyback_base_tax += round(gain * lot.base_tax_rate, 2)
        else:
            if lot.classification == "STCG_111A":
                gross_stcg += lot.realized_pnl
            elif lot.classification == "STCL":
                gross_stcl += abs(lot.realized_pnl)
            elif lot.classification == "LTCG_112A":
                gross_112a_ltcg += lot.realized_pnl
            elif lot.classification == "LTCL":
                gross_ltcl += abs(lot.realized_pnl)

    # 3. Statutory Loss Set-Off Hierarchy
    # Step 3A: STCL offsets STCG
    stcl_setoff_stcg = min(gross_stcl, gross_stcg)
    net_stcg = gross_stcg - stcl_setoff_stcg
    unabsorbed_stcl = gross_stcl - stcl_setoff_stcg

    # Step 3B: LTCL offsets 112A LTCG
    ltcl_absorbed_112a = min(gross_ltcl, gross_112a_ltcg)
    net_112a_1 = gross_112a_ltcg - ltcl_absorbed_112a
    unabsorbed_ltcl = gross_ltcl - ltcl_absorbed_112a

    # Step 3C: Unabsorbed STCL offsets remaining 112A LTCG
    stcl_absorbed_112a = min(unabsorbed_stcl, net_112a_1)
    net_112a_2 = net_112a_1 - stcl_absorbed_112a
    final_unabsorbed_stcl = unabsorbed_stcl - stcl_absorbed_112a

    # Step 3D: Pre-2026 Legacy Loss Absorption
    legacy_absorbed_total = 0.0
    if legacy_losses:
        for leg in legacy_losses:
            if leg.loss_type == "STCL" and net_stcg > 0:
                avail = leg.remaining_amount
                use = min(avail, net_stcg)
                net_stcg -= use
                leg.utilized_amount += use
                leg.remaining_amount -= use
                legacy_absorbed_total += use
            elif leg.loss_type == "LTCL" and net_112a_2 > 0:
                avail = leg.remaining_amount
                use = min(avail, net_112a_2)
                net_112a_2 -= use
                leg.utilized_amount += use
                leg.remaining_amount -= use
                legacy_absorbed_total += use

    # 4. Section 112A Annual Threshold Calculation (₹1,25,000)
    threshold_limit = rule_set.section_112a_exemption
    threshold_consumed = min(threshold_limit, net_112a_2)
    threshold_remaining = max(0.0, threshold_limit - threshold_consumed)
    taxable_112a_ltcg = max(0.0, net_112a_2 - threshold_limit)
    taxable_stcg = net_stcg

    # 5. Base Tax Computation
    stcg_base_tax = round(taxable_stcg * rule_set.equity_stcg_rate, 2)
    ltcg_112a_base_tax = round(taxable_112a_ltcg * rule_set.equity_ltcg_rate, 2)
    total_base_tax = round(stcg_base_tax + ltcg_112a_base_tax + buyback_base_tax, 2)

    # 6. Surcharge (15% ceiling for special rate gains) & 4% Health & Education Cess
    # Surcharge modeled separately
    surcharge_rate = 0.0  # Default base baseline; subject to threshold limits
    surcharge_amount = 0.0
    cess_amount = round((total_base_tax + surcharge_amount) * rule_set.cess_rate, 2)
    total_estimated_tax = round(total_base_tax + surcharge_amount + cess_amount, 2)

    section_112a_tracker = Section112ATracker(
        annual_threshold=threshold_limit,
        gross_112a_gains=round(gross_112a_ltcg, 2),
        ltcl_absorbed=round(ltcl_absorbed_112a, 2),
        stcl_absorbed=round(stcl_absorbed_112a, 2),
        net_112a_ltcg_before_exemption=round(net_112a_2, 2),
        threshold_consumed=round(threshold_consumed, 2),
        threshold_remaining=round(threshold_remaining, 2),
        taxable_112a_ltcg=round(taxable_112a_ltcg, 2),
        estimated_112a_base_tax=ltcg_112a_base_tax
    )

    return CapitalGainsSchedule(
        tax_year=rule_set.tax_year,
        governing_law=rule_set.law,
        gross_stcg=round(gross_stcg, 2),
        gross_stcl=round(gross_stcl, 2),
        stcl_setoff_against_stcg=round(stcl_setoff_stcg, 2),
        net_stcg=round(net_stcg, 2),
        taxable_stcg=round(taxable_stcg, 2),
        estimated_stcg_base_tax=stcg_base_tax,
        section_112a=section_112a_tracker,
        buyback_proceeds=round(buyback_proceeds, 2),
        buyback_cost_basis=round(buyback_cost_basis, 2),
        buyback_net_gain=round(buyback_net_gain, 2),
        buyback_base_tax=round(buyback_base_tax, 2),
        legacy_losses_absorbed=round(legacy_absorbed_total, 2),
        unabsorbed_stcl_to_bank=round(final_unabsorbed_stcl, 2),
        unabsorbed_ltcl_to_bank=round(unabsorbed_ltcl, 2),
        total_base_tax=total_base_tax,
        applicable_surcharge_rate=surcharge_rate,
        surcharge_amount=surcharge_amount,
        cess_rate=rule_set.cess_rate,
        cess_amount=cess_amount,
        total_estimated_tax_liability=total_estimated_tax
    )


# ---------------------------------------------------------------------------
# Tax Loss Harvesting Optimizer & Incremental Benefit Calculator
# ---------------------------------------------------------------------------

def analyze_harvesting_opportunities(
    raw_holdings: List[dict],
    live_quotes: Dict[str, dict],
    open_lots: Dict[str, deque],
    schedule: CapitalGainsSchedule,
    rule_set: TaxRuleSet,
    total_portfolio_value: float
) -> TaxLossHarvestingAnalysis:
    """
    Scans active portfolio holdings for unrealized losses and calculates true incremental
    tax savings based on available gains and permissible set-off rules.
    """
    candidates: List[TaxLossHarvestingCandidate] = []
    total_unrealized_losses = 0.0
    st_harvestable = 0.0
    lt_harvestable = 0.0
    total_tax_reduction = 0.0

    now_utc = datetime.now(timezone.utc)

    for h in raw_holdings:
        can_sym = SymbolNormalizer.to_canonical(h.get("symbol", ""))
        qty = float(h.get("quantity", 0))
        avg_buy = float(h.get("avg_buy_price", 0))
        if qty <= 0 or avg_buy <= 0:
            continue

        quote = live_quotes.get(can_sym, {})
        ltp = float(quote.get("price", h.get("current_price", avg_buy)))
        curr_val = round(qty * ltp, 2)
        invested = round(qty * avg_buy, 2)
        unrealized_pnl = round(curr_val - invested, 2)
        unrealized_pnl_pct = round((unrealized_pnl / invested) * 100, 2) if invested > 0 else 0.0

        if unrealized_pnl < 0:
            loss_amount = abs(unrealized_pnl)
            total_unrealized_losses += loss_amount

            # Check holding duration of earliest open lot
            lots = open_lots.get(can_sym, deque())
            earliest_date = lots[0]["buy_date"] if lots else now_utc
            months, days, is_long_term = calculate_calendar_holding_period(earliest_date, now_utc)

            loss_class = "POTENTIAL_LTCL" if is_long_term else "POTENTIAL_STCL"
            if is_long_term:
                lt_harvestable += loss_amount
            else:
                st_harvestable += loss_amount

            # True Incremental Tax Saving Calculation (respecting set-off hierarchy)
            incremental_saving = 0.0
            if loss_class == "POTENTIAL_STCL":
                # Can offset taxable STCG (@ 20% + 4% cess = 20.8%)
                offset_against_stcg = min(loss_amount, schedule.taxable_stcg)
                rem_loss = loss_amount - offset_against_stcg
                # Can offset taxable 112A LTCG (@ 12.5% + 4% cess = 13.0%)
                offset_against_ltcg = min(rem_loss, schedule.section_112a.taxable_112a_ltcg)

                saving_stcg = offset_against_stcg * rule_set.equity_stcg_rate * (1 + rule_set.cess_rate)
                saving_ltcg = offset_against_ltcg * rule_set.equity_ltcg_rate * (1 + rule_set.cess_rate)
                incremental_saving = round(saving_stcg + saving_ltcg, 2)
                rationale = (
                    f"Harvesting {can_sym} creates STCL offsetting up to ₹{offset_against_stcg:,.0f} STCG "
                    f"(@20.8% eff.) and ₹{offset_against_ltcg:,.0f} 112A LTCG (@13% eff.)."
                )
            else:
                # LTCL can only offset taxable 112A LTCG above threshold
                offset_against_ltcg = min(loss_amount, schedule.section_112a.taxable_112a_ltcg)
                incremental_saving = round(offset_against_ltcg * rule_set.equity_ltcg_rate * (1 + rule_set.cess_rate), 2)
                rationale = (
                    f"Harvesting {can_sym} creates LTCL offsetting up to ₹{offset_against_ltcg:,.0f} "
                    f"taxable Section 112A gains above ₹1.25L threshold (@13% eff.)."
                )

            # If no immediate gains exist, value potential future carry-forward offset
            if incremental_saving == 0.0:
                potential_rate = rule_set.equity_ltcg_rate if is_long_term else rule_set.equity_stcg_rate
                rationale += " No current taxable gains to offset; loss will bank for 8 succeeding Tax Years."

            total_tax_reduction += incremental_saving
            weight_pct = round((curr_val / total_portfolio_value) * 100, 2) if total_portfolio_value > 0 else 0.0

            candidates.append(TaxLossHarvestingCandidate(
                holding_id=str(h.get("_id", h.get("id", ""))),
                symbol=can_sym,
                company_name=h.get("company_name", can_sym),
                sector=h.get("sector", "General"),
                quantity=qty,
                avg_buy_price=avg_buy,
                current_price=ltp,
                current_value=curr_val,
                invested_amount=invested,
                unrealized_pnl=unrealized_pnl,
                unrealized_pnl_pct=unrealized_pnl_pct,
                holding_period_months=months,
                holding_period_days=days,
                loss_classification=loss_class,
                portfolio_weight_pct=weight_pct,
                harvestable_loss=round(loss_amount, 2),
                allowable_setoff_amount=round(loss_amount, 2),
                estimated_incremental_tax_saving=incremental_saving,
                recommendation_rationale=rationale
            ))

    # Sort candidates by largest harvestable loss
    candidates.sort(key=lambda x: x.harvestable_loss, reverse=True)
    post_harvest_tax = max(0.0, schedule.total_estimated_tax_liability - total_tax_reduction)

    return TaxLossHarvestingAnalysis(
        total_unrealized_losses=round(total_unrealized_losses, 2),
        short_term_harvestable_losses=round(st_harvestable, 2),
        long_term_harvestable_losses=round(lt_harvestable, 2),
        total_estimated_potential_tax_reduction=round(total_tax_reduction, 2),
        post_harvest_estimated_tax_liability=round(post_harvest_tax, 2),
        candidates_count=len(candidates),
        candidates=candidates
    )


# ---------------------------------------------------------------------------
# Master Report Orchestration & CSV Export
# ---------------------------------------------------------------------------

async def compute_portfolio_tax_report(
    user_id: str,
    portfolio_id: str,
    tax_year_label: Optional[str] = None
) -> TaxReportResponse:
    """
    Computes institutional Budget 2026-27 / Income-tax Act, 2025 Capital Gains &
    Tax Loss Harvesting Report with deterministic Zero-ML execution.
    """
    port = await get_portfolio_by_id_and_user(portfolio_id=portfolio_id, user_id=user_id)
    if not port:
        raise ValueError(f"Portfolio '{portfolio_id}' not found.")

    now_utc = datetime.now(timezone.utc)
    target_tax_year = tax_year_label or resolve_tax_year_from_date(now_utc)
    rule_set = get_tax_rule_set(target_tax_year)

    # 1. Fetch Transactions and perform FIFO matching
    raw_txs = await get_transactions_by_user(user_id=user_id, portfolio_id=portfolio_id, limit=500)
    realized_lots, open_lots = match_transactions_fifo(raw_txs, rule_set=rule_set)

    # 2. Compute Capital Gains Schedule
    cap_gains = compute_capital_gains_schedule(
        realized_lots=realized_lots,
        target_tax_year=target_tax_year
    )

    # 3. Analyze Active Holdings for Tax Loss Harvesting
    raw_holdings = await get_holdings_by_portfolio(portfolio_id=portfolio_id, user_id=user_id)
    symbols = [h.get("symbol", "") for h in raw_holdings if h.get("symbol")]
    live_quotes = await market_data_manager.get_batch_quotes(symbols) if symbols else {}

    total_port_val = sum(
        float(h.get("quantity", 0)) * float(live_quotes.get(SymbolNormalizer.to_canonical(h.get("symbol", "")), {}).get("price", h.get("current_price", 0)))
        for h in raw_holdings
    )

    loss_analysis = analyze_harvesting_opportunities(
        raw_holdings=raw_holdings,
        live_quotes=live_quotes,
        open_lots=open_lots,
        schedule=cap_gains,
        rule_set=rule_set,
        total_portfolio_value=total_port_val
    )

    # 4. Construct Available Tax Loss Bank (including unabsorbed current & legacy losses)
    bank_items: List[TaxLossBankItem] = []
    if cap_gains.unabsorbed_stcl_to_bank > 0:
        bank_items.append(TaxLossBankItem(
            loss_type="STCL",
            available_amount=cap_gains.unabsorbed_stcl_to_bank,
            usable_against="STCG / Section 112A LTCG",
            oldest_source_tax_year=target_tax_year,
            expiry_tax_year="Tax Year 2034-35",
            days_to_expiry=365 * 8
        ))
    if cap_gains.unabsorbed_ltcl_to_bank > 0:
        bank_items.append(TaxLossBankItem(
            loss_type="LTCL",
            available_amount=cap_gains.unabsorbed_ltcl_to_bank,
            usable_against="Section 112A LTCG",
            oldest_source_tax_year=target_tax_year,
            expiry_tax_year="Tax Year 2034-35",
            days_to_expiry=365 * 8
        ))

    tax_loss_bank = TaxLossBank(
        total_available_stcl=cap_gains.unabsorbed_stcl_to_bank,
        total_available_ltcl=cap_gains.unabsorbed_ltcl_to_bank,
        total_banked_loss=round(cap_gains.unabsorbed_stcl_to_bank + cap_gains.unabsorbed_ltcl_to_bank, 2),
        bank_items=bank_items
    )

    return TaxReportResponse(
        portfolio_id=portfolio_id,
        portfolio_name=port.get("name", "Investment Portfolio"),
        currency=port.get("currency", "INR"),
        generated_at=now_utc,
        rule_set=rule_set,
        capital_gains=cap_gains,
        tax_loss_bank=tax_loss_bank,
        loss_harvesting=loss_analysis,
        realized_lots=realized_lots
    )


def generate_itr_schedule_csv(tax_report: TaxReportResponse) -> str:
    """Generates standard ITR-2 / ITR-3 Schedule-Compatible CSV content."""
    output = io.StringIO()
    writer = csv.writer(output)

    # 1. Primary Capital Gains Lot Schedule (ITR Schedule CG)
    writer.writerow([
        "Lot ID",
        "Tax Year",
        "Governing Law",
        "Symbol",
        "Company Name",
        "Transaction Type",
        "Promoter Status",
        "Buy Date",
        "Sell Date",
        "Holding Months",
        "Holding Days",
        "Quantity",
        "Buy Price (INR)",
        "Sell Price (INR)",
        "Cost of Acquisition (INR)",
        "Sale Consideration (INR)",
        "Realized Gain/Loss (INR)",
        "Classification",
        "Base Tax Rate",
        "STT Paid (INR)",
        "Rule Set ID"
    ])

    for lot in tax_report.realized_lots:
        writer.writerow([
            lot.lot_id,
            tax_report.rule_set.tax_year,
            tax_report.rule_set.law,
            lot.symbol,
            lot.company_name,
            "BUYBACK" if lot.is_buyback else "SELL",
            lot.promoter_category,
            lot.buy_date.strftime("%Y-%m-%d"),
            lot.sell_date.strftime("%Y-%m-%d"),
            lot.holding_period_months,
            lot.holding_period_days,
            lot.quantity,
            f"{lot.buy_price:.2f}",
            f"{lot.sell_price:.2f}",
            f"{lot.cost_basis:.2f}",
            f"{lot.sale_proceeds:.2f}",
            f"{lot.realized_pnl:.2f}",
            lot.classification,
            f"{lot.base_tax_rate * 100:.1f}%",
            f"{lot.stt_paid:.2f}",
            lot.rule_set_id
        ])

    # 2. Append Actionable Tax Loss Harvesting Candidates (if any)
    if tax_report.loss_harvesting and tax_report.loss_harvesting.candidates:
        writer.writerow([])
        writer.writerow(["# --- SCHEDULE TLH: ACTIONABLE TAX LOSS HARVESTING OPPORTUNITIES ---"])
        writer.writerow([
            "Symbol",
            "Company Name",
            "Sector",
            "Quantity",
            "Avg Buy Price (INR)",
            "Current Price (INR)",
            "Harvestable Loss (INR)",
            "Loss Classification",
            "Holding Months",
            "Estimated Tax Saving (INR)",
            "Rebalancing Action"
        ])
        for c in tax_report.loss_harvesting.candidates:
            writer.writerow([
                c.symbol,
                c.company_name,
                c.sector,
                c.quantity,
                f"{c.avg_buy_price:.2f}",
                f"{c.current_price:.2f}",
                f"{c.harvestable_loss:.2f}",
                c.loss_classification,
                c.holding_period_months,
                f"{c.estimated_incremental_tax_saving:.2f}",
                c.recommendation_rationale
            ])

    return output.getvalue()
