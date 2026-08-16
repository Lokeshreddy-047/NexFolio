from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from app.services.market_data.symbol_normalizer import SymbolNormalizer
from app.services.market_data.manager import market_data_manager


class HoldingRealtimeValuation(BaseModel):
    holding_id: str
    symbol: str
    base_symbol: str
    quantity: float
    avg_buy_price: float
    invested_value: float
    current_price: float
    current_value: float
    unrealized_pnl: float
    unrealized_pnl_pct: float
    day_change: float
    day_change_pct: float
    day_pnl: float
    portfolio_weight: float = 0.0


class PortfolioRealtimeValuation(BaseModel):
    portfolio_id: str
    portfolio_name: str
    currency: str = "INR"
    total_invested_value: float
    total_current_value: float
    total_unrealized_pnl: float
    total_unrealized_pnl_pct: float
    total_day_pnl: float
    total_day_pnl_pct: float
    holdings_count: int
    data_badge: str
    updated_at: str
    holdings: List[HoldingRealtimeValuation]
    top_gainers: List[Dict[str, Any]] = []
    top_losers: List[Dict[str, Any]] = []


class RealtimeValuationEngine:
    """
    Fast-Loop Real-Time Portfolio Valuation Engine.
    Executes in < 5ms per valuation pass consuming normalized quotes.
    Strictly isolated from slow-loop ML inference (zero XGBoost/SHAP invocation).
    """

    @classmethod
    async def evaluate_portfolio(
        cls,
        portfolio_doc: Dict[str, Any],
        holdings_docs: List[Dict[str, Any]]
    ) -> PortfolioRealtimeValuation:
        port_id = str(portfolio_doc.get("_id") or portfolio_doc.get("id"))
        port_name = portfolio_doc.get("name", "Untitled Portfolio")
        currency = portfolio_doc.get("currency", "INR")

        if not holdings_docs:
            return PortfolioRealtimeValuation(
                portfolio_id=port_id,
                portfolio_name=port_name,
                currency=currency,
                total_invested_value=0.0,
                total_current_value=0.0,
                total_unrealized_pnl=0.0,
                total_unrealized_pnl_pct=0.0,
                total_day_pnl=0.0,
                total_day_pnl_pct=0.0,
                holdings_count=0,
                data_badge=market_data_manager.provider.default_data_badge.value,
                updated_at=datetime.now(timezone.utc).isoformat(),
                holdings=[]
            )

        # 1. Collect canonical symbols
        canonical_map = {}
        for h in holdings_docs:
            raw_sym = h.get("symbol", "")
            can_sym = SymbolNormalizer.to_canonical(raw_sym)
            canonical_map[raw_sym] = can_sym

        symbols_to_fetch = list(set(canonical_map.values()))
        quotes = await market_data_manager.get_batch_quotes(symbols_to_fetch)

        # 2. Atomic Holdings Valuation
        total_invested = 0.0
        total_current = 0.0
        total_day_pnl = 0.0
        valued_holdings: List[HoldingRealtimeValuation] = []

        for h in holdings_docs:
            h_id = str(h.get("_id") or h.get("id"))
            raw_sym = h.get("symbol", "")
            qty = float(h.get("quantity") if h.get("quantity") is not None else h.get("shares", 0.0))
            avg_price = float(h.get("avg_buy_price") if h.get("avg_buy_price") is not None else (h.get("average_price") or h.get("avg_price", 0.0)))
            invested = qty * avg_price

            quote = quotes.get(can_sym, {})
            current_price = float(quote.get("price", avg_price))
            day_change = float(quote.get("day_change", 0.0))
            day_change_pct = float(quote.get("day_change_pct", 0.0))

            current_val = qty * current_price
            pnl = current_val - invested
            pnl_pct = (pnl / invested * 100.0) if invested > 0 else 0.0
            holding_day_pnl = qty * day_change

            total_invested += invested
            total_current += current_val
            total_day_pnl += holding_day_pnl

            valued_holdings.append(
                HoldingRealtimeValuation(
                    holding_id=h_id,
                    symbol=can_sym,
                    base_symbol=SymbolNormalizer.to_base_symbol(can_sym),
                    quantity=round(qty, 4),
                    avg_buy_price=round(avg_price, 2),
                    invested_value=round(invested, 2),
                    current_price=round(current_price, 2),
                    current_value=round(current_val, 2),
                    unrealized_pnl=round(pnl, 2),
                    unrealized_pnl_pct=round(pnl_pct, 2),
                    day_change=round(day_change, 2),
                    day_change_pct=round(day_change_pct, 2),
                    day_pnl=round(holding_day_pnl, 2),
                    portfolio_weight=0.0  # calculated in next step
                )
            )

        # 3. Calculate Portfolio Weights
        for vh in valued_holdings:
            vh.portfolio_weight = round((vh.current_value / total_current * 100.0), 2) if total_current > 0 else 0.0

        # 4. Aggregate Portfolio Totals
        total_pnl = total_current - total_invested
        total_pnl_pct = (total_pnl / total_invested * 100.0) if total_invested > 0 else 0.0
        prev_day_val = total_current - total_day_pnl
        total_day_pnl_pct = (total_day_pnl / prev_day_val * 100.0) if prev_day_val > 0 else 0.0

        # Sort gainers / losers
        sorted_by_day = sorted(valued_holdings, key=lambda x: x.day_change_pct, reverse=True)
        top_gainers = [
            {"symbol": h.base_symbol, "day_change_pct": h.day_change_pct, "day_pnl": h.day_pnl}
            for h in sorted_by_day if h.day_change_pct > 0
        ][:3]
        top_losers = [
            {"symbol": h.base_symbol, "day_change_pct": h.day_change_pct, "day_pnl": h.day_pnl}
            for h in reversed(sorted_by_day) if h.day_change_pct < 0
        ][:3]

        return PortfolioRealtimeValuation(
            portfolio_id=port_id,
            portfolio_name=port_name,
            currency=currency,
            total_invested_value=round(total_invested, 2),
            total_current_value=round(total_current, 2),
            total_unrealized_pnl=round(total_pnl, 2),
            total_unrealized_pnl_pct=round(total_pnl_pct, 2),
            total_day_pnl=round(total_day_pnl, 2),
            total_day_pnl_pct=round(total_day_pnl_pct, 2),
            holdings_count=len(valued_holdings),
            data_badge=market_data_manager.provider.default_data_badge.value,
            updated_at=datetime.now(timezone.utc).isoformat(),
            holdings=valued_holdings,
            top_gainers=top_gainers,
            top_losers=top_losers
        )
