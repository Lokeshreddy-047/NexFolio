import time
from datetime import datetime, timezone
from typing import List, Dict, Tuple, Optional

from app.schemas.intelligence import (
    PortfolioIntelligenceResponse,
    ModelProvenance,
    HealthScorecard,
    HealthScorePillar,
    TraceableRecommendation,
    QuantitativeMetrics,
    DecisionTimelinePoint,
    WhatIfSimulationRequest,
    WhatIfSimulationResponse,
    SimulationMetricDelta
)
from app.services.portfolio_analytics_service import (
    compute_holdings_metrics,
    compute_allocations,
    derive_institutional_features,
    calculate_health_score
)
from app.services.prediction_service import predict_portfolio_risk
from app.services.explainability_service import explain_portfolio_risk
from app.services.shap_translation_service import translate_shap_drivers
from app.repositories.snapshot_repository import get_snapshots_by_portfolio
from app.services.market_data.manager import market_data_manager

# In-memory short-lived cache for fast repeated intelligence queries
_intelligence_cache: Dict[str, Tuple[float, PortfolioIntelligenceResponse]] = {}
CACHE_TTL = 60.0  # 60 seconds


def _compute_health_pillars(features: dict) -> HealthScorecard:
    """
    Computes a transparent 4-pillar scorecard breakdown (0-25 pts each = 0-100 total)
    with explicit scoring logic, formulas, and observed inputs for user drilldown.
    """
    raw_div = float(features.get("diversification_score", 50.0))
    div_norm = (raw_div / 100.0) if raw_div > 1.0 else raw_div
    vol = float(features.get("annualized_volatility", 0.20))
    beta = float(features.get("portfolio_beta", 1.0))
    sharpe = float(features.get("portfolio_sharpe_ratio", 1.0))
    sortino = float(features.get("portfolio_sortino_ratio", 1.2))
    mdd = abs(float(features.get("portfolio_max_drawdown", 0.15)))
    asset_cnt = int(features.get("asset_count", 1))

    # Pillar 1: Diversification & Asset Balance (0-25)
    div_pts = div_norm * 18.0
    breadth_pts = min(7.0, asset_cnt * 0.7)
    p1_score = int(min(25, max(0, div_pts + breadth_pts)))
    p1_rating = "EXCELLENT" if p1_score >= 20 else "GOOD" if p1_score >= 15 else "MODERATE" if p1_score >= 10 else "NEEDS_ATTENTION"

    # Pillar 2: Volatility & Beta Moderation (0-25)
    vol_pts = max(0.0, 15.0 - (vol * 40.0))
    beta_pts = max(0.0, 10.0 - abs(beta - 1.0) * 10.0)
    p2_score = int(min(25, max(0, vol_pts + beta_pts + 5.0)))
    p2_rating = "EXCELLENT" if p2_score >= 20 else "GOOD" if p2_score >= 15 else "MODERATE" if p2_score >= 10 else "NEEDS_ATTENTION"

    # Pillar 3: Risk-Adjusted Return Efficiency (0-25)
    sharpe_pts = sharpe * 15.0
    p3_score = int(min(25, max(0, sharpe_pts + 5.0)))
    p3_rating = "EXCELLENT" if p3_score >= 20 else "GOOD" if p3_score >= 15 else "MODERATE" if p3_score >= 10 else "NEEDS_ATTENTION"

    # Pillar 4: Drawdown Resilience (0-25)
    mdd_deduction = mdd * 65.0
    p4_score = int(min(25, max(0, 25.0 - mdd_deduction)))
    p4_rating = "EXCELLENT" if p4_score >= 20 else "GOOD" if p4_score >= 15 else "MODERATE" if p4_score >= 10 else "NEEDS_ATTENTION"

    total_score = p1_score + p2_score + p3_score + p4_score
    grade = "A+" if total_score >= 85 else "A" if total_score >= 75 else "B" if total_score >= 60 else "C" if total_score >= 45 else "D"

    pillars = [
        HealthScorePillar(
            name="Diversification & Breadth",
            score=p1_score,
            max_score=25,
            rating=p1_rating,
            description="Measures cross-holding diversification and single-stock shock resistance.",
            key_metric_label="Diversification Index",
            key_metric_value=f"{raw_div:.1f}/100 ({asset_cnt} assets)",
            scoring_logic=f"Awarded {div_pts:.1f} pts from (1 - HHI) concentration score + {breadth_pts:.1f} pts from {asset_cnt} constituent holdings count.",
            formula="Score = min(25, (Diversification_Norm × 18) + min(7, Asset_Count × 0.7))",
            inputs_observed={"diversification_index": round(raw_div, 2), "asset_count": asset_cnt, "points_awarded": p1_score}
        ),
        HealthScorePillar(
            name="Volatility & Beta Control",
            score=p2_score,
            max_score=25,
            rating=p2_rating,
            description="Evaluates annual standard deviation dispersion and benchmark market sensitivity.",
            key_metric_label="Annualized Volatility",
            key_metric_value=f"{vol*100:.1f}% (Beta: {beta:.2f})",
            scoring_logic=f"Volatility baseline of {vol*100:.1f}% yielded {vol_pts:.1f} pts, Beta sensitivity of {beta:.2f} contributed {beta_pts:.1f} pts.",
            formula="Score = min(25, max(0, (15 - Volatility × 40) + max(0, 10 - |Beta - 1.0| × 10) + 5))",
            inputs_observed={"annualized_volatility": f"{vol*100:.1f}%", "beta": round(beta, 2), "points_awarded": p2_score}
        ),
        HealthScorePillar(
            name="Risk-Adjusted Efficiency",
            score=p3_score,
            max_score=25,
            rating=p3_rating,
            description="Assesses return generated per unit of total risk undertaken (Sharpe & Sortino ratios).",
            key_metric_label="Sharpe Ratio",
            key_metric_value=f"{sharpe:.2f} (Sortino: {sortino:.2f})",
            scoring_logic=f"Sharpe ratio of {sharpe:.2f} translates to {sharpe_pts:.1f} base efficiency points + 5 baseline allocation.",
            formula="Score = min(25, max(0, Sharpe_Ratio × 15 + 5))",
            inputs_observed={"sharpe_ratio": round(sharpe, 2), "sortino_ratio": round(sortino, 2), "points_awarded": p3_score}
        ),
        HealthScorePillar(
            name="Drawdown Resilience",
            score=p4_score,
            max_score=25,
            rating=p4_rating,
            description="Measures capital preservation capability during peak-to-trough market downturns.",
            key_metric_label="Max Historical Drawdown",
            key_metric_value=f"-{mdd*100:.1f}%",
            scoring_logic=f"Peak-to-trough drawdown of -{mdd*100:.1f}% resulted in a {mdd_deduction:.1f} pt deduction from max 25 pts.",
            formula="Score = min(25, max(0, 25 - (|Max_Drawdown| × 65)))",
            inputs_observed={"max_drawdown": f"-{mdd*100:.1f}%", "points_awarded": p4_score}
        ),
    ]

    summary = f"Portfolio exhibits Grade {grade} institutional resilience ({total_score}/100) with strongest performance in {max(pillars, key=lambda x: x.score).name}."

    return HealthScorecard(
        overall_score=total_score,
        grade=grade,
        pillars=pillars,
        summary=summary
    )


def _generate_traceable_recommendations(
    holdings: list,
    sector_alloc: list,
    features: dict
) -> List[TraceableRecommendation]:
    """
    Generates structured, traceable recommendations linked to actual portfolio triggers.
    """
    recommendations: List[TraceableRecommendation] = []
    rank = 1

    # 1. Sector Concentration Trigger (>35%)
    for s in sector_alloc:
        if s.percentage > 35.0:
            affected = [h.symbol for h in holdings if h.sector == s.name]
            recommendations.append(TraceableRecommendation(
                id=f"rec_sec_{rank}",
                priority_rank=rank,
                category="SECTOR_REBALANCING",
                severity="HIGH",
                title=f"Elevated {s.name} Sector Exposure",
                description=f"NexFolio identifies that {s.name} accounts for {s.percentage:.1f}% of your portfolio, exceeding the 35% concentration threshold.",
                trigger_condition=f"{s.name} allocation is {s.percentage:.1f}% vs. 35.0% threshold",
                metric_name="Sector Concentration",
                metric_observed=f"{s.percentage:.1f}%",
                metric_threshold="35.0%",
                affected_holdings=affected,
                suggested_review_action=f"Consider reviewing re-allocation from {s.name} into defensive or uncorrelated industry sectors."
            ))
            rank += 1

    # 2. Single Stock Weight Trigger (>25%)
    sorted_holdings = sorted(holdings, key=lambda x: x.weight, reverse=True)
    if sorted_holdings and sorted_holdings[0].weight > 25.0:
        top_h = sorted_holdings[0]
        recommendations.append(TraceableRecommendation(
            id=f"rec_asset_{rank}",
            priority_rank=rank,
            category="ASSET_DIVERSIFICATION",
            severity="HIGH" if top_h.weight > 35.0 else "MEDIUM",
            title=f"High Single-Holding Concentration in {top_h.symbol}",
            description=f"NexFolio identifies that {top_h.symbol} represents {top_h.weight:.1f}% of your total portfolio valuation.",
            trigger_condition=f"Single holding weight is {top_h.weight:.1f}% vs. 25.0% threshold",
            metric_name="Single Holding Weight",
            metric_observed=f"{top_h.weight:.1f}%",
            metric_threshold="25.0%",
            affected_holdings=[top_h.symbol],
            suggested_review_action=f"Consider trimming {top_h.symbol} or distributing future capital additions into broader index constituents."
        ))
        rank += 1

    # 3. Volatility Trigger (>22%)
    vol = features.get("annualized_volatility", 0.18)
    if vol > 0.22:
        recommendations.append(TraceableRecommendation(
            id=f"rec_vol_{rank}",
            priority_rank=rank,
            category="VOLATILITY_MITIGATION",
            severity="MEDIUM",
            title="Elevated Portfolio Volatility Dispersion",
            description=f"NexFolio calculates annualized portfolio volatility at {vol*100:.1f}%, reflecting sensitivity to price swings.",
            trigger_condition=f"Annualized volatility is {vol*100:.1f}% vs. 20.0% benchmark",
            metric_name="Annualized Volatility",
            metric_observed=f"{vol*100:.1f}%",
            metric_threshold="20.0%",
            affected_holdings=[h.symbol for h in holdings[:3]],
            suggested_review_action="Consider reviewing higher-beta constituents and introducing lower-volatility ETF instruments."
        ))
        rank += 1

    # 4. Low Asset Count Trigger (<5 holdings)
    if len(holdings) < 5:
        recommendations.append(TraceableRecommendation(
            id=f"rec_breadth_{rank}",
            priority_rank=rank,
            category="DEFENSIVE_ALLOCATION",
            severity="LOW",
            title="Constituent Breadth Expansion",
            description=f"Portfolio currently holds {len(holdings)} positions. Expanding to 8–12 uncorrelated equities provides natural risk dispersion.",
            trigger_condition=f"Asset count is {len(holdings)} vs. recommended 8-12 breadth",
            metric_name="Asset Count",
            metric_observed=str(len(holdings)),
            metric_threshold="8 holdings",
            affected_holdings=[h.symbol for h in holdings],
            suggested_review_action="Consider identifying candidates across complementary sectors to build out constituent breadth."
        ))
        rank += 1

    return recommendations


async def generate_portfolio_intelligence(
    user_id: str,
    portfolio_doc: dict,
    raw_holdings: list
) -> PortfolioIntelligenceResponse:
    port_id = str(portfolio_doc["_id"])
    cache_key = f"{user_id}:{port_id}:{len(raw_holdings)}"

    now_ts = time.time()
    if cache_key in _intelligence_cache:
        cached_time, cached_res = _intelligence_cache[cache_key]
        if now_ts - cached_time < CACHE_TTL:
            return cached_res

    # 1. Data Sufficiency Gate
    if not raw_holdings:
        provenance = ModelProvenance(
            analyzed_at=datetime.now(timezone.utc),
            data_quality_badge="REFERENCE",
            data_sufficiency_status="INSUFFICIENT_HISTORY",
            data_sufficiency_notes="Portfolio contains 0 holdings. Add stock positions to activate machine learning risk analysis."
        )
        empty_response = PortfolioIntelligenceResponse(
            portfolio_id=port_id,
            portfolio_name=portfolio_doc["name"],
            provenance=provenance,
            risk_category="MODERATE",
            confidence=0.5,
            probabilities={"LOW": 0.33, "MODERATE": 0.34, "HIGH": 0.33},
            health_scorecard=HealthScorecard(
                overall_score=50,
                grade="C",
                pillars=[],
                summary="Insufficient holdings to compute health score."
            ),
            risk_mitigators=[],
            risk_amplifiers=[],
            recommendations=[],
            quantitative_metrics=QuantitativeMetrics(
                annualized_return=0.0,
                annualized_volatility=0.0,
                portfolio_beta=1.0,
                portfolio_sharpe_ratio=0.0,
                portfolio_sortino_ratio=0.0,
                portfolio_calmar_ratio=0.0,
                diversification_score=0.0,
                portfolio_max_drawdown=0.0,
                asset_count=0,
                sector_count=0
            ),
            ai_decision_timeline=[]
        )
        return empty_response

    # 2. Holdings & Allocations with Live Upstox/Market Quotes
    symbols = [h.get("symbol", "") for h in raw_holdings if h.get("symbol")]
    live_quotes = await market_data_manager.get_batch_quotes(symbols) if symbols else {}
    holdings, invested, curr_val, _, _ = compute_holdings_metrics(raw_holdings, quotes=live_quotes)
    _, sector_alloc = compute_allocations(holdings, curr_val)
    features = derive_institutional_features(holdings, invested, curr_val)

    # 3. Model Prediction & SHAP Explanations
    prediction = predict_portfolio_risk(features)
    raw_shap = explain_portfolio_risk(features)
    mitigators, amplifiers = translate_shap_drivers(raw_shap, features)

    # 4. Health Scorecard & Traceable Recommendations
    scorecard = _compute_health_pillars(features)
    recommendations = _generate_traceable_recommendations(holdings, sector_alloc, features)

    # Determine live data quality badge
    active_prov = market_data_manager.active_provider
    current_badge = getattr(active_prov, "default_data_badge", None)
    badge_str = current_badge.value if current_badge else "LIVE"

    provenance = ModelProvenance(
        analyzed_at=datetime.now(timezone.utc),
        data_quality_badge=badge_str,
        data_sufficiency_status="READY",
        data_sufficiency_notes=f"Successfully analyzed {len(holdings)} holdings across {len(sector_alloc)} sectors with {badge_str} market pedigree."
    )

    quant_metrics = QuantitativeMetrics(
        annualized_return=features.get("annualized_return", 0.15),
        annualized_volatility=features.get("annualized_volatility", 0.18),
        portfolio_beta=features.get("portfolio_beta", 1.0),
        portfolio_sharpe_ratio=features.get("portfolio_sharpe_ratio", 1.0),
        portfolio_sortino_ratio=features.get("portfolio_sortino_ratio", 1.2),
        portfolio_calmar_ratio=features.get("portfolio_calmar_ratio", 0.9),
        diversification_score=features.get("diversification_score", 50.0),
        portfolio_max_drawdown=features.get("portfolio_max_drawdown", -0.15),
        asset_count=int(features.get("asset_count", len(holdings))),
        sector_count=int(features.get("sector_count", len(sector_alloc)))
    )

    # 5. AI Decision Timeline from Historical Snapshots
    decision_timeline: List[DecisionTimelinePoint] = []
    snapshots = await get_snapshots_by_portfolio(user_id=user_id, portfolio_id=port_id, limit=10)
    primary_driver_text = mitigators[0].headline if mitigators else (amplifiers[0].headline if amplifiers else "Cross-Holding Variance")

    if snapshots:
        for s in snapshots:
            dt_str = s["timestamp"].strftime("%b %d, %H:%M") if isinstance(s["timestamp"], datetime) else str(s["timestamp"])[:10]
            decision_timeline.append(DecisionTimelinePoint(
                checkpoint_date=dt_str,
                health_score=scorecard.overall_score,
                risk_category=prediction["risk_category"],
                primary_driver=primary_driver_text,
                portfolio_value=float(s.get("total_value", curr_val))
            ))
    else:
        # Initial point
        decision_timeline.append(DecisionTimelinePoint(
            checkpoint_date="Today",
            health_score=scorecard.overall_score,
            risk_category=prediction["risk_category"],
            primary_driver=primary_driver_text,
            portfolio_value=round(curr_val, 2)
        ))

    response = PortfolioIntelligenceResponse(
        portfolio_id=port_id,
        portfolio_name=portfolio_doc["name"],
        provenance=provenance,
        risk_category=prediction["risk_category"],
        confidence=prediction["confidence"],
        probabilities=prediction.get("probabilities", {}),
        health_scorecard=scorecard,
        risk_mitigators=mitigators,
        risk_amplifiers=amplifiers,
        recommendations=recommendations,
        quantitative_metrics=quant_metrics,
        ai_decision_timeline=decision_timeline
    )

    _intelligence_cache[cache_key] = (now_ts, response)
    return response


def simulate_what_if_risk(
    portfolio_doc: dict,
    raw_holdings: list,
    request: WhatIfSimulationRequest
) -> WhatIfSimulationResponse:
    """
    Pure functional What-If simulation engine.
    Never modifies database state.
    """
    port_id = str(portfolio_doc["_id"])
    allocs = request.simulated_allocations

    # 1. Validation: No negative allocations, total sum ~ 100%
    for k, v in allocs.items():
        if v < 0:
            allocs[k] = 0.0

    total_pct = sum(allocs.values())
    if total_pct == 0:
        allocs = {"equity_pct": 100.0}
        total_pct = 100.0

    # Normalize to 100%
    normalized = {k: round(v / total_pct * 100.0, 2) for k, v in allocs.items()}

    # 2. Current Baseline
    holdings, invested, curr_val, _, _ = compute_holdings_metrics(raw_holdings)
    current_features = derive_institutional_features(holdings, invested, curr_val)
    current_pred = predict_portfolio_risk(current_features)
    current_health = calculate_health_score(current_features)

    # 3. Derive Simulated Feature Vector
    eq = normalized.get("equity_pct", 60.0)
    etf = normalized.get("etf_pct", 20.0)
    debt = normalized.get("debt_pct", 10.0)
    gold = normalized.get("gold_pct", 10.0)
    crypto = normalized.get("crypto_pct", 0.0)

    sim_vol = round((eq * 0.22 + etf * 0.16 + debt * 0.06 + gold * 0.12 + crypto * 0.65) / 100.0, 4)
    sim_beta = round((eq * 1.15 + etf * 0.95 + debt * 0.10 + gold * 0.20 + crypto * 1.80) / 100.0, 3)
    sim_ret = round((eq * 0.16 + etf * 0.13 + debt * 0.07 + gold * 0.10 + crypto * 0.35) / 100.0, 4)
    sim_sharpe = round(max(0.2, (sim_ret - 0.065) / max(0.05, sim_vol)), 3)
    sim_sortino = round(sim_sharpe * 1.35, 3)
    sim_mdd = round(-max(0.05, sim_vol * 0.75), 4)

    active_classes = sum(1 for v in normalized.values() if v >= 5.0)
    sim_div = round(min(100.0, max(15.0, (1.0 - sum((v/100.0)**2 for v in normalized.values())) * 100.0 + min(active_classes * 4.0, 20.0))), 2)

    sim_features = {
        "annualized_return": sim_ret,
        "annualized_volatility": sim_vol,
        "portfolio_beta": sim_beta,
        "asset_count": max(len(holdings), active_classes * 2),
        "sector_count": max(3, active_classes),
        "portfolio_sharpe_ratio": sim_sharpe,
        "portfolio_sortino_ratio": sim_sortino,
        "portfolio_calmar_ratio": round(sim_ret / abs(sim_mdd), 3),
        "diversification_score": sim_div,
        "portfolio_max_drawdown": sim_mdd,
        "return_1M": round(sim_ret / 12.0, 4),
        "return_3M": round(sim_ret / 4.0, 4),
        "return_6M": round(sim_ret / 2.0, 4),
        "return_1Y": sim_ret
    }

    sim_pred = predict_portfolio_risk(sim_features)
    sim_shap = explain_portfolio_risk(sim_features)
    sim_mitigators, sim_amplifiers = translate_shap_drivers(sim_shap, sim_features)
    sim_health = calculate_health_score(sim_features)

    # Comparison metrics
    metrics_comp = {
        "annualized_volatility": SimulationMetricDelta(
            current_value=f"{current_features['annualized_volatility']*100:.1f}%",
            simulated_value=f"{sim_vol*100:.1f}%",
            delta=f"{(sim_vol - current_features['annualized_volatility'])*100:+.1f}%",
            direction="IMPROVED" if sim_vol < current_features['annualized_volatility'] else "DEGRADED" if sim_vol > current_features['annualized_volatility'] else "UNCHANGED"
        ),
        "portfolio_beta": SimulationMetricDelta(
            current_value=f"{current_features['portfolio_beta']:.2f}",
            simulated_value=f"{sim_beta:.2f}",
            delta=f"{sim_beta - current_features['portfolio_beta']:+.2f}",
            direction="IMPROVED" if abs(sim_beta - 1.0) < abs(current_features['portfolio_beta'] - 1.0) else "DEGRADED"
        ),
        "sharpe_ratio": SimulationMetricDelta(
            current_value=f"{current_features['portfolio_sharpe_ratio']:.2f}",
            simulated_value=f"{sim_sharpe:.2f}",
            delta=f"{sim_sharpe - current_features['portfolio_sharpe_ratio']:+.2f}",
            direction="IMPROVED" if sim_sharpe > current_features['portfolio_sharpe_ratio'] else "DEGRADED"
        ),
        "diversification_score": SimulationMetricDelta(
            current_value=f"{current_features['diversification_score']:.2f}",
            simulated_value=f"{sim_div:.2f}",
            delta=f"{sim_div - current_features['diversification_score']:+.2f}",
            direction="IMPROVED" if sim_div > current_features['diversification_score'] else "DEGRADED"
        ),
    }

    return WhatIfSimulationResponse(
        portfolio_id=port_id,
        validation_status="VALID",
        allocations_used=normalized,
        current_risk_category=current_pred["risk_category"],
        simulated_risk_category=sim_pred["risk_category"],
        current_confidence=current_pred["confidence"],
        simulated_confidence=sim_pred["confidence"],
        current_health_score=current_health,
        simulated_health_score=sim_health,
        score_delta=sim_health - current_health,
        risk_level_changed=(current_pred["risk_category"] != sim_pred["risk_category"]),
        metrics_comparison=metrics_comp,
        top_driver_shifts=(sim_mitigators[:2] + sim_amplifiers[:2]),
        simulation_notes="Pure hypothetical sandbox calculation. No database mutation performed."
    )
