from typing import List, Dict, Tuple
from app.schemas.intelligence import HumanReadableDriver

FEATURE_METADATA_MAPPING = {
    "diversification_score": {
        "name": "Portfolio Diversification Index",
        "baseline": 0.50,
        "mitigator_headline": "Robust Cross-Asset Diversification",
        "mitigator_narrative": "A high diversification index moderates idiosyncratic stock risk and provides resilience across market regimes.",
        "mitigator_effect": "Lowers portfolio exposure to individual company shocks and single-sector downturns.",
        "amplifier_headline": "Elevated Asset Concentration",
        "amplifier_narrative": "A low diversification index exposes the portfolio to outsized shocks from a small basket of holdings.",
        "amplifier_effect": "Increases overall portfolio fragility if core holdings experience adverse events."
    },
    "annualized_volatility": {
        "name": "Annualized Volatility (Standard Deviation)",
        "baseline": 0.18,
        "mitigator_headline": "Controlled Portfolio Volatility",
        "mitigator_narrative": "Subdued annualized volatility indicates disciplined risk allocation and calm returns dispersion.",
        "mitigator_effect": "Reduces standard dispersion and preserves capital during turbulent market phases.",
        "amplifier_headline": "Heightened Volatility Regime",
        "amplifier_narrative": "Elevated price variance across constituents increases downside risk exposure.",
        "amplifier_effect": "Amplifies potential short-term drawdown severity during market corrections."
    },
    "portfolio_beta": {
        "name": "Market Sensitivity (Beta)",
        "baseline": 1.00,
        "mitigator_headline": "Defensive Market Sensitivity",
        "mitigator_narrative": "Portfolio beta below or near 1.0 reflects defensive resilience against broad benchmark swings.",
        "mitigator_effect": "Buffers total portfolio valuation when the broader market undergoes sharp corrections.",
        "amplifier_headline": "High-Beta Market Exposure",
        "amplifier_narrative": "Portfolio beta significantly above 1.0 magnifies portfolio sensitivity to broad market dips.",
        "amplifier_effect": "Increases susceptibility to systemic market corrections relative to NIFTY 50."
    },
    "portfolio_sharpe_ratio": {
        "name": "Risk-Adjusted Return (Sharpe Ratio)",
        "baseline": 1.00,
        "mitigator_headline": "Strong Risk-Adjusted Efficiency",
        "mitigator_narrative": "A high Sharpe ratio indicates excess returns are generated with proportional risk budgeting.",
        "mitigator_effect": "Maximizes return per unit of total risk undertaken across constituents.",
        "amplifier_headline": "Subdued Risk-Adjusted Efficiency",
        "amplifier_narrative": "A Sharpe ratio below 1.0 indicates that returns may not sufficiently compensate for constituent volatility.",
        "amplifier_effect": "Suggests room to improve asset efficiency by rebalancing into higher Sharpe instruments."
    },
    "portfolio_max_drawdown": {
        "name": "Historical Peak-to-Trough Drawdown",
        "baseline": -0.15,
        "mitigator_headline": "Shallow Historical Drawdowns",
        "mitigator_narrative": "Mild historical peak-to-trough drawdowns indicate effective defensive stop-loss and hedging structure.",
        "mitigator_effect": "Protects accumulated gains and reduces recovery time required post-correction.",
        "amplifier_headline": "Deep Historical Drawdowns",
        "amplifier_narrative": "Steep historical drawdowns reveal vulnerability to extended recovery periods post-correction.",
        "amplifier_effect": "Requires higher future returns to recover capital following market downturns."
    },
    "portfolio_sortino_ratio": {
        "name": "Downside Risk-Adjusted Return (Sortino)",
        "baseline": 1.20,
        "mitigator_headline": "High Downside Efficiency",
        "mitigator_narrative": "Strong Sortino performance demonstrates that downside deviation is strictly curtailed.",
        "mitigator_effect": "Focuses volatility mitigation specifically on harmful downside moves.",
        "amplifier_headline": "Elevated Downside Deviation",
        "amplifier_narrative": "Subdued Sortino ratio indicates harmful downside volatility is impacting net returns.",
        "amplifier_effect": "Increases standard downside volatility exposure."
    },
    "asset_count": {
        "name": "Constituent Breadth (Holdings Count)",
        "baseline": 10,
        "mitigator_headline": "Broad Constituent Breadth",
        "mitigator_narrative": "Sufficient holding count provides natural risk dispersion across securities.",
        "mitigator_effect": "Prevents single-stock news from dominating total portfolio trajectory.",
        "amplifier_headline": "Narrow Constituent Breadth",
        "amplifier_narrative": "Very few holdings (<5) magnifies idiosyncratic single-company risk.",
        "amplifier_effect": "Elevates portfolio vulnerability to earnings misses or regulatory actions in any single stock."
    },
    "sector_count": {
        "name": "Sector Breadth",
        "baseline": 4,
        "mitigator_headline": "Well-Distributed Sector Exposure",
        "mitigator_narrative": "Exposure distributed across multiple uncorrelated sectors prevents sectoral shock contagion.",
        "mitigator_effect": "Insulates portfolio returns when a single industry undergoes cyclical downturns.",
        "amplifier_headline": "Sector Concentration Risk",
        "amplifier_narrative": "Heavy concentration in fewer than 3 sectors creates industry-specific risk exposure.",
        "amplifier_effect": "Makes portfolio returns highly correlated to cyclical sector swings."
    }
}


def translate_shap_drivers(
    shap_explanation: dict,
    features: dict
) -> Tuple[List[HumanReadableDriver], List[HumanReadableDriver]]:
    """
    Translates raw SHAP mathematical impacts into structured HumanReadableDriver objects,
    distinguishing model contribution score, observed metric value, benchmark baseline,
    headline, narrative, and contextual effect.
    """
    mitigators: List[HumanReadableDriver] = []
    amplifiers: List[HumanReadableDriver] = []

    pos_contributors = shap_explanation.get("top_positive_contributors", [])
    neg_contributors = shap_explanation.get("top_negative_contributors", [])

    # Process Risk Mitigators (features that pull predicted risk toward LOW/SAFE)
    for c in pos_contributors:
        feat_key = c.get("feature", "")
        impact = float(c.get("impact", 0.0))
        meta = FEATURE_METADATA_MAPPING.get(feat_key, {
            "name": feat_key.replace("_", " ").title(),
            "baseline": 0.0,
            "mitigator_headline": f"Favorable {feat_key.replace('_', ' ').title()} Metric",
            "mitigator_narrative": "Contributes positively toward moderating total portfolio risk.",
            "mitigator_effect": "Assists in stabilizing portfolio risk classification."
        })

        obs_val = float(features.get(feat_key, meta["baseline"]))

        mitigators.append(HumanReadableDriver(
            feature_key=feat_key,
            feature_name=meta["name"],
            impact_score=round(impact, 4),
            direction="RISK_MITIGATOR",
            observed_value=round(obs_val, 4),
            benchmark_baseline=round(meta["baseline"], 4),
            headline=meta["mitigator_headline"],
            narrative=meta["mitigator_narrative"],
            contextual_effect=meta["mitigator_effect"]
        ))

    # Process Risk Amplifiers (features that push predicted risk toward HIGH)
    for c in neg_contributors:
        feat_key = c.get("feature", "")
        impact = float(c.get("impact", 0.0))
        meta = FEATURE_METADATA_MAPPING.get(feat_key, {
            "name": feat_key.replace("_", " ").title(),
            "baseline": 0.0,
            "amplifier_headline": f"Elevated {feat_key.replace('_', ' ').title()} Risk",
            "amplifier_narrative": "Contributes toward elevating portfolio risk exposure.",
            "amplifier_effect": "Elevates overall risk sensitivity."
        })

        obs_val = float(features.get(feat_key, meta["baseline"]))

        amplifiers.append(HumanReadableDriver(
            feature_key=feat_key,
            feature_name=meta["name"],
            impact_score=round(impact, 4),
            direction="RISK_AMPLIFIER",
            observed_value=round(obs_val, 4),
            benchmark_baseline=round(meta["baseline"], 4),
            headline=meta["amplifier_headline"],
            narrative=meta["amplifier_narrative"],
            contextual_effect=meta["amplifier_effect"]
        ))

    # Sort by impact score magnitude
    mitigators.sort(key=lambda x: abs(x.impact_score), reverse=True)
    amplifiers.sort(key=lambda x: abs(x.impact_score), reverse=True)

    return mitigators, amplifiers
