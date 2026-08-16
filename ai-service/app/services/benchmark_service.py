from datetime import datetime
from pathlib import Path
from typing import List, Dict, Tuple, Optional
import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[2]
MARKET_FEATURES_PATH = BASE_DIR / "ml" / "datasets" / "features" / "market_features.parquet"

_benchmark_cache: Optional[pd.DataFrame] = None


def _load_benchmark_data() -> Optional[pd.DataFrame]:
    global _benchmark_cache
    if _benchmark_cache is not None:
        return _benchmark_cache

    if not MARKET_FEATURES_PATH.exists():
        return None

    try:
        df = pd.read_parquet(
            MARKET_FEATURES_PATH,
            columns=["date", "market_return"]
        ).drop_duplicates(subset=["date"]).sort_values("date").reset_index(drop=True)
        df["date"] = pd.to_datetime(df["date"])
        _benchmark_cache = df
        return df
    except Exception as exc:
        print(f"[benchmark_service] Warning loading market_features.parquet: {exc}")
        return None


def get_nifty_benchmark_points(start_date: datetime, end_date: datetime) -> Tuple[List[Dict], str]:
    """
    Returns authentic NIFTY 50 cumulative return trajectory over the requested date window.
    Honesty rule: If benchmark data does not overlap, returns ([], 'UNAVAILABLE').
    """
    df = _load_benchmark_data()
    if df is None or df.empty:
        return [], "UNAVAILABLE"

    # Filter by date range
    mask = (df["date"] >= pd.to_datetime(start_date.date())) & (df["date"] <= pd.to_datetime(end_date.date()))
    subset = df.loc[mask].copy()

    if len(subset) < 2:
        return [], "UNAVAILABLE"

    # Compute cumulative market return from baseline
    subset["market_return"] = subset["market_return"].fillna(0.0)
    subset["nifty_cum_return"] = (1 + subset["market_return"]).cumprod() - 1

    base_level = 24000.0  # Reference baseline index level
    results = []
    for _, row in subset.iterrows():
        ret = float(row["nifty_cum_return"])
        results.append({
            "date": row["date"].strftime("%Y-%m-%d"),
            "nifty_return_pct": round(ret * 100.0, 2),
            "nifty_level": round(base_level * (1 + ret), 2),
        })

    return results, "AVAILABLE"
