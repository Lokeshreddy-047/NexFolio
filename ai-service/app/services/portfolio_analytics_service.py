from typing import Dict, List, Tuple, Optional, Any
from app.schemas.portfolio import (
    PortfolioSummary,
    PortfolioDetail,
    AllocationBreakdown,
    PortfolioAnalyticsResponse,
    QuantitativeRiskMetrics
)
from app.schemas.holding import HoldingResponse
from app.schemas.explanation_response import FeatureImpact
from app.services.prediction_service import predict_portfolio_risk
from app.services.explainability_service import explain_portfolio_risk
from app.api.recommendations import generate_recommendations
from app.services.market_data.symbol_normalizer import SymbolNormalizer


def compute_holdings_metrics(
    holdings: List[dict],
    quotes: Optional[Dict[str, Dict[str, Any]]] = None
) -> Tuple[List[HoldingResponse], float, float, float, float]:
    """
    Computes invested value, current value, P&L, and weights for holdings,
    overlaying live quotes from the market data feed if available.
    """
    quotes = quotes or {}
    total_invested = 0.0
    total_current_value = 0.0

    raw_processed = []
    for h in holdings:
        qty = float(h.get("quantity", 0.0))
        avg_buy = float(h.get("avg_buy_price", 0.0))
        raw_sym = str(h.get("symbol", ""))
        can_sym = SymbolNormalizer.to_canonical(raw_sym)
        
        quote = quotes.get(can_sym) or quotes.get(raw_sym) or {}
        curr_price = float(quote.get("price") if quote.get("price") is not None else (h.get("current_price") or avg_buy))

        invested = qty * avg_buy
        curr_val = qty * curr_price
        pnl = curr_val - invested
        pnl_pct = (pnl / invested * 100.0) if invested > 0 else 0.0

        total_invested += invested
        total_current_value += curr_val

        raw_processed.append({
            "id": str(h.get("_id", "")),
            "portfolio_id": str(h.get("portfolio_id", "")),
            "user_id": str(h.get("user_id", "")),
            "symbol": raw_sym,
            "company_name": str(h.get("company_name", raw_sym)),
            "asset_type": str(h.get("asset_type", "Equity")),
            "sector": str(h.get("sector", "Other")),
            "quantity": qty,
            "avg_buy_price": round(avg_buy, 2),
            "current_price": round(curr_price, 2),
            "invested_value": round(invested, 2),
            "current_value": round(curr_val, 2),
            "unrealized_pnl": round(pnl, 2),
            "unrealized_pnl_pct": round(pnl_pct, 2),
            "created_at": h.get("created_at"),
            "updated_at": h.get("updated_at"),
        })

    holding_responses = []
    for item in raw_processed:
        weight = (item["current_value"] / total_current_value * 100.0) if total_current_value > 0 else 0.0
        item["weight"] = round(weight, 2)
        holding_responses.append(HoldingResponse(**item))

    total_unrealized_pnl = total_current_value - total_invested
    total_unrealized_pnl_pct = (total_unrealized_pnl / total_invested * 100.0) if total_invested > 0 else 0.0

    return (
        holding_responses,
        round(total_invested, 2),
        round(total_current_value, 2),
        round(total_unrealized_pnl, 2),
        round(total_unrealized_pnl_pct, 2),
    )


def compute_allocations(holdings: List[HoldingResponse], total_value: float) -> Tuple[List[AllocationBreakdown], List[AllocationBreakdown]]:
    asset_groups: Dict[str, Dict] = {}
    sector_groups: Dict[str, Dict] = {}

    for h in holdings:
        # Asset type
        a_type = h.asset_type or "Equity"
        if a_type not in asset_groups:
            asset_groups[a_type] = {"value": 0.0, "count": 0}
        asset_groups[a_type]["value"] += h.current_value
        asset_groups[a_type]["count"] += 1

        # Sector
        s_name = h.sector or "Other"
        if s_name not in sector_groups:
            sector_groups[s_name] = {"value": 0.0, "count": 0}
        sector_groups[s_name]["value"] += h.current_value
        sector_groups[s_name]["count"] += 1

    asset_alloc = [
        AllocationBreakdown(
            name=k,
            value=round(v["value"], 2),
            percentage=round((v["value"] / total_value * 100.0) if total_value > 0 else 0.0, 2),
            holdings_count=v["count"]
        )
        for k, v in sorted(asset_groups.items(), key=lambda x: x[1]["value"], reverse=True)
    ]

    sector_alloc = [
        AllocationBreakdown(
            name=k,
            value=round(v["value"], 2),
            percentage=round((v["value"] / total_value * 100.0) if total_value > 0 else 0.0, 2),
            holdings_count=v["count"]
        )
        for k, v in sorted(sector_groups.items(), key=lambda x: x[1]["value"], reverse=True)
    ]

    return asset_alloc, sector_alloc


def derive_institutional_features(holdings: List[HoldingResponse], total_invested: float, total_current_value: float) -> Dict[str, float]:
    """
    Derives quantitative financial risk metrics from holdings for ML risk prediction.
    """
    asset_count = len(holdings)
    sectors = {h.sector for h in holdings if h.sector}
    sector_count = len(sectors) if sectors else 1

    # Herfindahl-Hirschman Index (HHI) for diversification
    if total_current_value > 0 and holdings:
        hhi = sum((h.current_value / total_current_value) ** 2 for h in holdings)
        diversification_score = max(10.0, min(100.0, (1.0 - hhi) * 100.0 + min(asset_count * 2.0, 20.0)))
    else:
        diversification_score = 50.0

    # Asset weights
    equity_weight = sum(h.weight for h in holdings if h.asset_type == "Equity") / 100.0
    crypto_weight = sum(h.weight for h in holdings if h.asset_type == "Crypto") / 100.0
    debt_weight = sum(h.weight for h in holdings if h.asset_type == "Debt") / 100.0

    # Risk approximations grounded in portfolio composition
    annualized_volatility = max(0.08, min(0.65, 0.12 + equity_weight * 0.14 + crypto_weight * 0.40 - debt_weight * 0.06))
    portfolio_beta = max(0.40, min(2.50, 0.70 + equity_weight * 0.45 + crypto_weight * 1.20 - debt_weight * 0.30))

    unrealized_roi = ((total_current_value - total_invested) / total_invested) if total_invested > 0 else 0.12
    annualized_return = max(-0.40, min(1.50, 0.08 + unrealized_roi * 0.5 + equity_weight * 0.06 + crypto_weight * 0.15))

    rf_rate = 0.06
    portfolio_sharpe_ratio = max(-2.0, min(4.0, (annualized_return - rf_rate) / annualized_volatility if annualized_volatility > 0 else 0.5))
    portfolio_sortino_ratio = max(-2.0, min(5.0, portfolio_sharpe_ratio * 1.25))
    portfolio_max_drawdown = max(-0.80, min(-0.02, -(0.05 + annualized_volatility * 0.6)))
    portfolio_calmar_ratio = max(-2.0, min(4.0, annualized_return / abs(portfolio_max_drawdown) if portfolio_max_drawdown != 0 else 1.0))

    return {
        "annualized_return": round(annualized_return, 4),
        "annualized_volatility": round(annualized_volatility, 4),
        "portfolio_beta": round(portfolio_beta, 4),
        "asset_count": max(1, asset_count),
        "sector_count": max(1, sector_count),
        "portfolio_sharpe_ratio": round(portfolio_sharpe_ratio, 4),
        "portfolio_sortino_ratio": round(portfolio_sortino_ratio, 4),
        "portfolio_calmar_ratio": round(portfolio_calmar_ratio, 4),
        "diversification_score": round(diversification_score, 2),
        "portfolio_max_drawdown": round(portfolio_max_drawdown, 4),
        "return_1M": round(annualized_return / 12.0, 4),
        "return_3M": round(annualized_return / 4.0, 4),
        "return_6M": round(annualized_return / 2.0, 4),
        "return_1Y": round(annualized_return, 4),
    }


def calculate_health_score(metrics: Dict[str, float]) -> int:
    """
    Transparent institutional health score calculation (0 to 100):
    - Diversification (25%)
    - Volatility moderation (25%)
    - Sharpe Ratio / Performance (25%)
    - Drawdown resilience (25%)
    """
    div_component = min(100.0, metrics["diversification_score"]) * 0.25

    vol = metrics["annualized_volatility"]
    vol_component = max(0.0, min(100.0, (1.0 - (vol / 0.40)) * 100.0)) * 0.25

    sharpe = metrics["portfolio_sharpe_ratio"]
    sharpe_component = max(0.0, min(100.0, (sharpe + 1.0) / 3.0 * 100.0)) * 0.25

    mdd = abs(metrics["portfolio_max_drawdown"])
    drawdown_component = max(0.0, min(100.0, (1.0 - (mdd / 0.50)) * 100.0)) * 0.25

    total_score = int(round(div_component + vol_component + sharpe_component + drawdown_component))
    return max(15, min(98, total_score))


def generate_portfolio_analytics(portfolio_doc: dict, raw_holdings: List[dict]) -> PortfolioAnalyticsResponse:
    holdings, invested, curr_val, pnl, pnl_pct = compute_holdings_metrics(raw_holdings)
    asset_alloc, sector_alloc = compute_allocations(holdings, curr_val)
    feature_vector = derive_institutional_features(holdings, invested, curr_val)

    prediction = predict_portfolio_risk(feature_vector)
    explanation = explain_portfolio_risk(feature_vector)
    recs = generate_recommendations(feature_vector)
    health_score = calculate_health_score(feature_vector)

    positive_contributors = [
        FeatureImpact(feature=item["feature"], impact=item["impact"])
        for item in explanation.get("top_positive_contributors", [])
    ]
    negative_contributors = [
        FeatureImpact(feature=item["feature"], impact=item["impact"])
        for item in explanation.get("top_negative_contributors", [])
    ]

    return PortfolioAnalyticsResponse(
        portfolio_id=str(portfolio_doc.get("_id", "")),
        portfolio_name=portfolio_doc.get("name", "Portfolio"),
        total_invested=invested,
        current_value=curr_val,
        unrealized_pnl=pnl,
        unrealized_pnl_pct=pnl_pct,
        risk_category=prediction["risk_category"],
        confidence=prediction["confidence"],
        probabilities=prediction["probabilities"],
        top_positive_contributors=positive_contributors,
        top_negative_contributors=negative_contributors,
        recommendations=recs,
        portfolio_health_score=health_score,
        quantitative_metrics=QuantitativeRiskMetrics(
            annualized_return=feature_vector["annualized_return"],
            annualized_volatility=feature_vector["annualized_volatility"],
            portfolio_beta=feature_vector["portfolio_beta"],
            portfolio_sharpe_ratio=feature_vector["portfolio_sharpe_ratio"],
            portfolio_sortino_ratio=feature_vector["portfolio_sortino_ratio"],
            portfolio_calmar_ratio=feature_vector["portfolio_calmar_ratio"],
            diversification_score=feature_vector["diversification_score"],
            portfolio_max_drawdown=feature_vector["portfolio_max_drawdown"],
            asset_count=feature_vector["asset_count"],
            sector_count=feature_vector["sector_count"]
        )
    )
