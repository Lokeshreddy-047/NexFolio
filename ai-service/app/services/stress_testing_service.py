from typing import Dict, List, Optional, Tuple, Any
import numpy as np

from app.schemas.stress_test import (
    MonteCarloRequest,
    MonteCarloResponse,
    TrajectoryPoint,
    VaRMetrics,
    CrisisScenarioInfo,
    CrisisStressRequest,
    CrisisStressResponse,
    SectorDamageItem
)
from app.services.portfolio_analytics_service import (
    compute_holdings_metrics,
    derive_institutional_features
)


CRISIS_CATALOG: Dict[str, Dict[str, Any]] = {
    "covid_2020": {
        "id": "covid_2020",
        "name": "2020 COVID-19 Flash Crash",
        "era": "Feb - Mar 2020",
        "duration_days": 35,
        "benchmark_shock_pct": -38.4,
        "recovery_months": 5,
        "narrative": "A pandemic-induced global liquidity squeeze causing rapid across-the-board selloffs across Indian equities, followed by central bank stimulus and swift V-shaped recovery.",
        "vulnerable_sectors": ["Consumer Services", "Metals & Mining", "Realty", "Financial Services"],
        "defensive_sectors": ["Healthcare", "FMCG", "Information Technology"],
        "sector_shocks": {
            "Consumer Services": -52.0,
            "Metals & Mining": -48.0,
            "Realty": -46.0,
            "Financial Services": -45.0,
            "Automobile and Auto Components": -42.0,
            "Capital Goods": -40.0,
            "Construction": -38.0,
            "Oil Gas & Consumable Fuels": -36.0,
            "Power": -28.0,
            "Information Technology": -26.0,
            "Telecommunication": -14.0,
            "FMCG": -12.0,
            "Healthcare": 4.0,
            "Other": -35.0
        }
    },
    "lehman_2008": {
        "id": "lehman_2008",
        "name": "2008 Global Financial Crisis (Lehman Shock)",
        "era": "Sep 2008 - Mar 2009",
        "duration_days": 180,
        "benchmark_shock_pct": -55.0,
        "recovery_months": 26,
        "narrative": "Severe credit contraction triggered by subprime contagion. Excessive leverage and real estate collapse forced deep prolonged deleveraging across emerging markets.",
        "vulnerable_sectors": ["Realty", "Metals & Mining", "Capital Goods", "Financial Services"],
        "defensive_sectors": ["FMCG", "Healthcare"],
        "sector_shocks": {
            "Realty": -78.0,
            "Metals & Mining": -68.0,
            "Capital Goods": -65.0,
            "Financial Services": -62.0,
            "Construction": -60.0,
            "Automobile and Auto Components": -58.0,
            "Oil Gas & Consumable Fuels": -54.0,
            "Power": -52.0,
            "Consumer Services": -50.0,
            "Information Technology": -45.0,
            "Telecommunication": -42.0,
            "Healthcare": -28.0,
            "FMCG": -15.0,
            "Other": -52.0
        }
    },
    "rate_hike_2022": {
        "id": "rate_hike_2022",
        "name": "2022 Global Rate Hike & Inflation Shock",
        "era": "Oct 2021 - Jun 2022",
        "duration_days": 160,
        "benchmark_shock_pct": -18.5,
        "recovery_months": 6,
        "narrative": "Synchronized global central bank tightening to fight 40-year high inflation, hammering long-duration growth tech while old-economy energy and commodities rallied.",
        "vulnerable_sectors": ["Information Technology", "Consumer Services", "Realty"],
        "defensive_sectors": ["Oil Gas & Consumable Fuels", "Metals & Mining", "Power", "FMCG"],
        "sector_shocks": {
            "Information Technology": -32.0,
            "Consumer Services": -28.0,
            "Realty": -22.0,
            "Healthcare": -19.0,
            "Financial Services": -12.0,
            "Automobile and Auto Components": -8.0,
            "FMCG": -4.0,
            "Construction": -12.0,
            "Telecommunication": -10.0,
            "Metals & Mining": 12.0,
            "Power": 14.0,
            "Oil Gas & Consumable Fuels": 18.0,
            "Other": -15.0
        }
    },
    "demonetization_2016": {
        "id": "demonetization_2016",
        "name": "2016 Demonetization Liquidity Shock",
        "era": "Nov - Dec 2016",
        "duration_days": 45,
        "benchmark_shock_pct": -11.5,
        "recovery_months": 3,
        "narrative": "Sudden invalidation of 86% of currency in circulation curbing consumer spending and real estate velocity, before digital payment transformation took root.",
        "vulnerable_sectors": ["Realty", "Consumer Durables", "Automobile and Auto Components"],
        "defensive_sectors": ["Information Technology", "Oil Gas & Consumable Fuels", "Healthcare"],
        "sector_shocks": {
            "Realty": -25.0,
            "Consumer Durables": -18.0,
            "Automobile and Auto Components": -16.0,
            "Financial Services": -14.0,
            "Capital Goods": -12.0,
            "FMCG": -10.0,
            "Consumer Services": -12.0,
            "Healthcare": -5.0,
            "Oil Gas & Consumable Fuels": -4.0,
            "Information Technology": -2.0,
            "Telecommunication": -6.0,
            "Other": -10.0
        }
    }
}


def get_all_crisis_scenarios() -> List[CrisisScenarioInfo]:
    """Returns catalog of historical crisis stress scenarios."""
    scenarios = []
    for s in CRISIS_CATALOG.values():
        scenarios.append(
            CrisisScenarioInfo(
                id=s["id"],
                name=s["name"],
                era=s["era"],
                duration_days=s["duration_days"],
                benchmark_shock_pct=s["benchmark_shock_pct"],
                recovery_months=s["recovery_months"],
                narrative=s["narrative"],
                vulnerable_sectors=s["vulnerable_sectors"],
                defensive_sectors=s["defensive_sectors"]
            )
        )
    return scenarios


def run_monte_carlo_simulation(
    portfolio_doc: dict,
    raw_holdings: List[dict],
    request: MonteCarloRequest
) -> MonteCarloResponse:
    """
    Executes a high-performance, vectorized 10,000-run Geometric Brownian Motion (GBM)
    Monte Carlo simulation across the specified trading horizon.
    """
    holdings, invested, curr_val, pnl, pnl_pct = compute_holdings_metrics(raw_holdings)
    metrics = derive_institutional_features(holdings, invested, curr_val)

    initial_value = max(100.0, curr_val if curr_val > 0 else 100000.0)
    ann_return = float(metrics.get("annualized_return", 0.12))
    ann_vol = float(metrics.get("annualized_volatility", 0.20))
    ann_vol = max(0.05, min(1.20, ann_vol))

    iterations = request.iterations
    horizon_days = request.horizon_days

    # Daily parameters (252 trading days/year)
    dt = 1.0 / 252.0
    drift = (ann_return - 0.5 * (ann_vol ** 2)) * dt
    diffusion = ann_vol * np.sqrt(dt)

    # Vectorized random standard normal generation
    rng = np.random.default_rng(seed=42)
    z = rng.standard_normal((iterations, horizon_days))
    daily_log_returns = drift + diffusion * z
    cumulative_log_returns = np.cumsum(daily_log_returns, axis=1)

    # Value trajectories: shape (iterations, horizon_days + 1)
    paths = initial_value * np.exp(cumulative_log_returns)
    day0 = np.full((iterations, 1), initial_value)
    full_paths = np.hstack([day0, paths])

    # Downsample trajectory points for smooth, lightweight UI rendering (approx 35 points)
    sample_count = min(35, horizon_days + 1)
    sample_indices = np.unique(np.linspace(0, horizon_days, num=sample_count, dtype=int))

    trajectories: List[TrajectoryPoint] = []
    for day_idx in sample_indices:
        vals_at_day = full_paths[:, day_idx]
        p5 = float(np.percentile(vals_at_day, 5))
        p25 = float(np.percentile(vals_at_day, 25))
        p50 = float(np.percentile(vals_at_day, 50))
        p75 = float(np.percentile(vals_at_day, 75))
        p95 = float(np.percentile(vals_at_day, 95))

        trajectories.append(
            TrajectoryPoint(
                day=int(day_idx),
                p5=round(p5, 2),
                p25=round(p25, 2),
                p50=round(p50, 2),
                p75=round(p75, 2),
                p95=round(p95, 2)
            )
        )

    final_values = full_paths[:, -1]
    final_returns_pct = (final_values - initial_value) / initial_value

    # Empirical Value at Risk (VaR)
    p5_final = np.percentile(final_returns_pct, 5)
    p1_final = np.percentile(final_returns_pct, 1)

    var_95_pct = round(max(0.0, -float(p5_final) * 100.0), 2)
    var_95_amount = round(initial_value * (var_95_pct / 100.0), 2)

    var_99_pct = round(max(0.0, -float(p1_final) * 100.0), 2)
    var_99_amount = round(initial_value * (var_99_pct / 100.0), 2)

    # Conditional VaR (Expected Shortfall)
    tail_95 = final_returns_pct[final_returns_pct <= p5_final]
    cvar_95_pct = round(max(var_95_pct, -float(np.mean(tail_95)) * 100.0), 2)
    cvar_95_amount = round(initial_value * (cvar_95_pct / 100.0), 2)

    tail_99 = final_returns_pct[final_returns_pct <= p1_final]
    cvar_99_pct = round(max(var_99_pct, -float(np.mean(tail_99)) * 100.0), 2)
    cvar_99_amount = round(initial_value * (cvar_99_pct / 100.0), 2)

    # 1-Day Parametric VaR
    daily_vol = ann_vol / np.sqrt(252.0)
    daily_var_95_pct = round(1.645 * daily_vol * 100.0, 2)
    daily_var_95_amount = round(initial_value * (daily_var_95_pct / 100.0), 2)

    # Probabilities
    prob_loss = round(float(np.mean(final_values < initial_value) * 100.0), 2)

    # Peak-to-trough max drawdown along each path
    running_max = np.maximum.accumulate(full_paths, axis=1)
    drawdowns = (full_paths - running_max) / running_max
    max_drawdowns = np.min(drawdowns, axis=1)

    prob_dd_10 = round(float(np.mean(max_drawdowns <= -0.10) * 100.0), 2)
    prob_dd_20 = round(float(np.mean(max_drawdowns <= -0.20) * 100.0), 2)
    prob_dd_30 = round(float(np.mean(max_drawdowns <= -0.30) * 100.0), 2)

    expected_final = round(float(np.mean(final_values)), 2)
    median_final = round(float(np.median(final_values)), 2)
    worst_case_5 = round(float(np.percentile(final_values, 5)), 2)
    best_case_95 = round(float(np.percentile(final_values, 95)), 2)

    # Verdict synthesis
    if var_95_pct > 35.0 or prob_dd_20 > 50.0:
        summary_verdict = "AGGRESSIVE_VOLATILITY: High tail-risk dispersion. Structural hedging or defensive reallocation recommended."
    elif var_95_pct > 20.0:
        summary_verdict = "MODERATE_RISK: Balanced distribution with standard equity variance and controlled expected shortfall."
    else:
        summary_verdict = "CONSERVATIVE_CAPITAL_PRESERVATION: Subdued tail risk, high probability of capital retention across 1-year horizon."

    var_metrics = VaRMetrics(
        var_95_pct=var_95_pct,
        var_95_amount=var_95_amount,
        var_99_pct=var_99_pct,
        var_99_amount=var_99_amount,
        cvar_95_pct=cvar_95_pct,
        cvar_95_amount=cvar_95_amount,
        cvar_99_pct=cvar_99_pct,
        cvar_99_amount=cvar_99_amount,
        daily_var_95_pct=daily_var_95_pct,
        daily_var_95_amount=daily_var_95_amount,
        prob_loss_pct=prob_loss,
        prob_drawdown_10_pct=prob_dd_10,
        prob_drawdown_20_pct=prob_dd_20,
        prob_drawdown_30_pct=prob_dd_30
    )

    return MonteCarloResponse(
        portfolio_id=str(portfolio_doc.get("_id", "")),
        portfolio_name=portfolio_doc.get("name", "Portfolio"),
        initial_value=round(initial_value, 2),
        iterations=iterations,
        horizon_days=horizon_days,
        trajectories=trajectories,
        var_metrics=var_metrics,
        expected_final_value=expected_final,
        median_final_value=median_final,
        worst_case_5pct_value=worst_case_5,
        best_case_95pct_value=best_case_95,
        annualized_return=round(ann_return, 4),
        annualized_volatility=round(ann_vol, 4),
        summary_verdict=summary_verdict
    )


def run_crisis_stress_test(
    portfolio_doc: dict,
    raw_holdings: List[dict],
    request: CrisisStressRequest
) -> CrisisStressResponse:
    """
    Evaluates the vulnerability and drawdown response of the portfolio against
    calibrated historical macroeconomic crashes or customizable black swan events.
    """
    holdings, invested, curr_val, pnl, pnl_pct = compute_holdings_metrics(raw_holdings)
    portfolio_val = max(100.0, curr_val if curr_val > 0 else 100000.0)

    scenario_key = request.scenario_id if request.scenario_id in CRISIS_CATALOG else "covid_2020"
    base_scenario = CRISIS_CATALOG[scenario_key]

    benchmark_shock = request.custom_market_shock_pct if request.custom_market_shock_pct is not None else base_scenario["benchmark_shock_pct"]
    vol_mult = request.custom_volatility_multiplier or 1.0

    sector_shocks = dict(base_scenario["sector_shocks"])

    # If custom shock requested, scale sector shocks proportionally
    if request.custom_market_shock_pct is not None:
        orig_bench = base_scenario["benchmark_shock_pct"]
        scale_factor = (benchmark_shock / orig_bench) if orig_bench != 0 else 1.0
        sector_shocks = {k: v * scale_factor * vol_mult for k, v in sector_shocks.items()}

    # Group holdings by sector to compute sector damage
    sector_weights: Dict[str, float] = {}
    holding_losses: Dict[str, float] = {}
    holding_values: Dict[str, float] = {}

    if holdings and curr_val > 0:
        for h in holdings:
            sec = h.sector or "Other"
            sector_weights[sec] = sector_weights.get(sec, 0.0) + (h.current_value / curr_val)
            sym = h.symbol
            holding_values[sym] = h.current_value
            # Sector specific shock applied to holding
            sec_shock = sector_shocks.get(sec, sector_shocks.get("Other", -35.0))
            holding_losses[sym] = sec_shock
    else:
        # Benchmark synthetic baseline if portfolio empty
        sector_weights["Diversified Equities"] = 1.0
        holding_losses["BENCHMARK.EQ"] = benchmark_shock
        holding_values["BENCHMARK.EQ"] = portfolio_val

    # Calculate portfolio weighted loss
    projected_loss_pct = 0.0
    sector_breakdown: List[SectorDamageItem] = []

    for sec, wt in sector_weights.items():
        sec_shock = sector_shocks.get(sec, sector_shocks.get("Other", -35.0))
        contribution = wt * sec_shock
        projected_loss_pct += contribution
        sector_breakdown.append(
            SectorDamageItem(
                sector=sec,
                weight_pct=round(wt * 100.0, 2),
                shock_pct=round(sec_shock, 2),
                contribution_to_loss_pct=round(contribution, 2)
            )
        )

    # Sort damage breakdown by largest negative contribution
    sector_breakdown.sort(key=lambda x: x.contribution_to_loss_pct)

    projected_loss_pct = round(projected_loss_pct, 2)
    loss_amount = round(portfolio_val * abs(projected_loss_pct) / 100.0, 2)
    projected_final = round(max(0.0, portfolio_val * (1.0 + projected_loss_pct / 100.0)), 2)

    relative_alpha = round(projected_loss_pct - benchmark_shock, 2)

    # Identify worst-hit and safest holdings
    worst_holding = None
    worst_loss = 0.0
    safest_holding = None
    safest_loss = -999.0

    if holding_losses:
        sorted_holdings = sorted(holding_losses.items(), key=lambda x: x[1])
        worst_holding = sorted_holdings[0][0]
        worst_loss = sorted_holdings[0][1]

        safest_holding = sorted_holdings[-1][0]
        safest_loss = sorted_holdings[-1][1]

    # Verdict
    abs_loss = abs(projected_loss_pct)
    if abs_loss <= 20.0:
        verdict = "RESILIENT"
    elif abs_loss <= 35.0:
        verdict = "MODERATE_VULNERABILITY"
    elif abs_loss <= 50.0:
        verdict = "HIGH_VULNERABILITY"
    else:
        verdict = "CRITICAL_RISK"

    # Actionable hedging recommendations
    recs: List[str] = []
    if relative_alpha < -5.0:
        recs.append(f"Underperformance vs Benchmark: Portfolio exhibits {abs(relative_alpha)}% deeper drawdown than Nifty 50 due to cyclical sector concentration.")
    if sector_breakdown and sector_breakdown[0].contribution_to_loss_pct < -15.0:
        worst_sec = sector_breakdown[0].sector
        recs.append(f"Primary Crisis Bottleneck: {worst_sec} contributes {abs(sector_breakdown[0].contribution_to_loss_pct)}% of total drawdown. Implement stop-loss corridors or trim above 25%.")
    if abs_loss > 30.0:
        recs.append("Tail-Risk Hedging: Consider deploying Nifty Put options or shifting 15-20% into defensive anchors (FMCG, Sovereign Gold Bonds, Liquid Debt).")
    if not recs:
        recs.append("Capital Preservation Shield: Portfolio asset allocation demonstrated robust defensive resilience relative to broader market turmoil.")

    return CrisisStressResponse(
        scenario_id=scenario_key,
        scenario_name=base_scenario["name"],
        portfolio_initial_value=round(portfolio_val, 2),
        projected_portfolio_loss_pct=projected_loss_pct,
        projected_portfolio_loss_amount=loss_amount,
        projected_final_value=projected_final,
        benchmark_loss_pct=round(benchmark_shock, 2),
        relative_alpha_pct=relative_alpha,
        stress_verdict=verdict,
        worst_hit_holding=worst_holding,
        worst_hit_holding_loss_pct=round(worst_loss, 2) if worst_holding else None,
        safest_holding=safest_holding,
        safest_holding_resilience=f"{safest_loss:+.1f}% drawdown" if safest_holding else None,
        estimated_recovery_months=base_scenario["recovery_months"],
        sector_damage_breakdown=sector_breakdown,
        hedging_recommendations=recs
    )
