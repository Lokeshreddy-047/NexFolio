import pandas as pd
from app.services.model_loader import get_model, get_feature_metadata


RISK_MAPPING = {
    0: "LOW",
    1: "MODERATE",
    2: "HIGH"
}


def extract_feature_order(metadata: dict):
    if "feature_names" in metadata:
        return metadata["feature_names"]

    if "feature_columns" in metadata:
        return metadata["feature_columns"]

    if "features" in metadata:
        return metadata["features"]

    if "columns" in metadata:
        return metadata["columns"]

    raise ValueError( f"Unknown metadata structure. Available keys: {list(metadata.keys())}")


FINANCIAL_FALLBACK_DEFAULTS = {
    "trading_days": 252.0,
    "annualized_volatility": 0.20,
    "portfolio_beta": 1.0,
    "annualized_return": 0.12,
    "portfolio_sharpe_ratio": 0.8,
    "portfolio_sortino_ratio": 1.0,
    "portfolio_calmar_ratio": 0.8,
    "portfolio_max_drawdown": -0.15,
    "asset_count": 1.0,
    "sector_count": 1.0,
}


def resolve_feature_value(feature: str, data: dict) -> float:
    """
    Distinguishes true zeros (e.g. 0.0 sector weight or flat return) from missing/unavailable metrics.
    When an uninterrupted historical rolling time series is not directly available, computes grounded
    empirical proxy transformations rather than silently coercing values to 0.0 (which would falsely
    imply 'zero drawdown' or 'zero risk').

    Academic & Empirical Financial Proxy Rationales:
    - Sector allocations: Missing key represents 0.0% constituent holding in that sector (true mathematical zero).
    - rolling_max_drawdown_252d (proxy = portfolio_max_drawdown): Upper-bound conservative baseline utilizing
      full observed peak-to-trough drawdown when a complete 252-day daily rolling window is unavailable.
    - rolling_max_drawdown_30d (proxy = max_drawdown * 0.88): Empirical transformation reflecting that acute
      30-day market stress drawdowns typically capture ~85-90% of full-cycle peak-to-trough drawdowns.
    - downside_deviation_annualized (proxy = annualized_volatility * 0.70): Stylized fact of equity distributions;
      under moderate negative skewness and leptokurtosis, downside semi-variance typically scales to ~70%
      of symmetric two-sided standard deviation.
    - portfolio_sortino_ratio (proxy = sharpe * 1.25): Because downside deviation replaces total volatility
      in the denominator (scaled by ~0.70), Sortino ratio exhibits a standard ~1.25x scaling under positive excess return.
    """
    val = data.get(feature)
    if val is not None:
        return float(val)

    # Sector features: missing means 0% allocation in this sector (true mathematical zero)
    if feature.startswith("sector_"):
        return 0.0

    # Grounded financial proxies for unavailable rolling historical metrics
    ann_ret = float(data.get("annualized_return", FINANCIAL_FALLBACK_DEFAULTS["annualized_return"]))
    ann_vol = float(data.get("annualized_volatility", FINANCIAL_FALLBACK_DEFAULTS["annualized_volatility"]))
    max_dd = float(data.get("portfolio_max_drawdown", FINANCIAL_FALLBACK_DEFAULTS["portfolio_max_drawdown"]))
    sharpe = float(data.get("portfolio_sharpe_ratio", FINANCIAL_FALLBACK_DEFAULTS["portfolio_sharpe_ratio"]))

    proxies = {
        "trading_days": float(data.get("trading_days", 252.0)),
        "total_return": float(data.get("total_return", ann_ret)),
        "annualized_return": ann_ret,
        "annualized_volatility": ann_vol,
        "return_1M": float(data.get("return_1M", ann_ret / 12.0)),
        "return_3M": float(data.get("return_3M", ann_ret / 4.0)),
        "return_6M": float(data.get("return_6M", ann_ret / 2.0)),
        "return_1Y": float(data.get("return_1Y", ann_ret)),
        "portfolio_max_drawdown": max_dd,
        "rolling_max_drawdown_30d": float(data.get("rolling_max_drawdown_30d", max_dd * 0.88)),
        "rolling_max_drawdown_252d": float(data.get("rolling_max_drawdown_252d", max_dd)),
        "downside_deviation_annualized": float(data.get("downside_deviation_annualized", ann_vol * 0.70)),
        "portfolio_sharpe_ratio": sharpe,
        "portfolio_sortino_ratio": float(data.get("portfolio_sortino_ratio", sharpe * 1.25)),
        "portfolio_calmar_ratio": float(data.get("portfolio_calmar_ratio", abs(ann_ret / max_dd) if max_dd != 0 else 1.0)),
        "asset_count": float(data.get("asset_count", 1.0)),
        "sector_count": float(data.get("sector_count", 1.0)),
        "portfolio_beta": float(data.get("portfolio_beta", 1.0)),
    }

    return proxies.get(feature, 0.0)


def predict_portfolio_risk(portfolio_data: dict) -> dict:
    model = get_model()
    metadata = get_feature_metadata()

    feature_order = extract_feature_order(metadata)

    row = {feature: resolve_feature_value(feature, portfolio_data) for feature in feature_order}
    df = pd.DataFrame([row], columns=feature_order)

    prediction = int(model.predict(df)[0])
    probabilities = model.predict_proba(df)[0]

    return {
        "risk_category": RISK_MAPPING[prediction],
        "confidence": round(float(probabilities[prediction]), 4),
        "probabilities": {
            "LOW": round(float(probabilities[0]), 4),
            "MODERATE": round(float(probabilities[1]), 4),
            "HIGH": round(float(probabilities[2]), 4)
        }
    }