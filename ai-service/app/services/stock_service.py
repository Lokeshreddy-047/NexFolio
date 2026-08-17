import json
from pathlib import Path
from typing import Dict, List, Optional

BASE_DIR = Path(__file__).resolve().parents[2]
SECTOR_MAPPING_PATH = BASE_DIR / "ml" / "preprocessing" / "sector_mapping.json"
MARKET_PARQUET_PATH = BASE_DIR / "ml" / "datasets" / "features" / "market_features.parquet"

_stocks_cache: Optional[List[Dict]] = None
_symbol_lookup: Optional[Dict[str, Dict]] = None

POPULAR_NAMES: Dict[str, str] = {
    "RELIANCE.NS": "Reliance Industries Ltd",
    "TCS.NS": "Tata Consultancy Services Ltd",
    "HDFCBANK.NS": "HDFC Bank Ltd",
    "INFY.NS": "Infosys Ltd",
    "ICICIBANK.NS": "ICICI Bank Ltd",
    "HINDUNILVR.NS": "Hindustan Unilever Ltd",
    "ITC.NS": "ITC Ltd",
    "SBIN.NS": "State Bank of India",
    "BHARTIARTL.NS": "Bharti Airtel Ltd",
    "KOTAKBANK.NS": "Kotak Mahindra Bank Ltd",
    "LT.NS": "Larsen & Toubro Ltd",
    "BAJFINANCE.NS": "Bajaj Finance Ltd",
    "ASIANPAINT.NS": "Asian Paints Ltd",
    "AXISBANK.NS": "Axis Bank Ltd",
    "MARUTI.NS": "Maruti Suzuki India Ltd",
    "TITAN.NS": "Titan Company Ltd",
    "SUNPHARMA.NS": "Sun Pharmaceutical Industries Ltd",
    "TATAMOTORS.NS": "Tata Motors Ltd",
    "TATASTEEL.NS": "Tata Steel Ltd",
    "NTPC.NS": "NTPC Ltd",
    "POWERGRID.NS": "Power Grid Corporation of India Ltd",
    "M&M.NS": "Mahindra & Mahindra Ltd",
    "WIPRO.NS": "Wipro Ltd",
    "HCLTECH.NS": "HCL Technologies Ltd",
    "ADANIENT.NS": "Adani Enterprises Ltd",
    "ADANIPORTS.NS": "Adani Ports & SEZ Ltd",
    "COALINDIA.NS": "Coal India Ltd",
    "ULTRACEMCO.NS": "UltraTech Cement Ltd",
    "NESTLEIND.NS": "Nestle India Ltd",
    "TECHM.NS": "Tech Mahindra Ltd",
    "GRASIM.NS": "Grasim Industries Ltd",
    "CIPLA.NS": "Cipla Ltd",
    "DRREDDY.NS": "Dr. Reddy's Laboratories Ltd",
    "DIVISLAB.NS": "Divi's Laboratories Ltd",
    "BAJAJFINSV.NS": "Bajaj Finserv Ltd",
    "JSWSTEEL.NS": "JSW Steel Ltd",
    "TRENT.NS": "Trent Ltd",
    "BEL.NS": "Bharat Electronics Ltd",
    "HAL.NS": "Hindustan Aeronautics Ltd",
    "ZOMATO.NS": "Zomato Ltd",
}


def _clean_symbol(sym: str) -> str:
    sym = sym.strip().upper()
    if not sym.endswith(".NS") and not "." in sym:
        sym = f"{sym}.NS"
    return sym


def _load_reference_prices_from_parquet() -> Dict[str, float]:
    """
    Extracts the latest verified reference closing prices from market_features.parquet.
    """
    prices: Dict[str, float] = {}
    if MARKET_PARQUET_PATH.exists():
        try:
            import pandas as pd
            df = pd.read_parquet(MARKET_PARQUET_PATH, columns=["ticker", "close", "date"])
            if not pd.api.types.is_datetime64_any_dtype(df["date"]):
                df["date"] = pd.to_datetime(df["date"])
            latest_idx = df.groupby("ticker")["date"].idxmax()
            latest_df = df.loc[latest_idx]
            for _, row in latest_df.iterrows():
                ticker_sym = str(row["ticker"]).upper()
                close_val = round(float(row["close"]), 2)
                prices[ticker_sym] = close_val
                prices[ticker_sym.replace(".NS", "")] = close_val
        except Exception as exc:
            pass
    return prices


def _load_stocks() -> List[Dict]:
    global _stocks_cache, _symbol_lookup
    if _stocks_cache is not None:
        return _stocks_cache

    ref_prices = _load_reference_prices_from_parquet()
    stocks = []
    lookup = {}

    if SECTOR_MAPPING_PATH.exists():
        with open(SECTOR_MAPPING_PATH, "r", encoding="utf-8") as f:
            mapping: Dict[str, str] = json.load(f)

        for symbol, sector in mapping.items():
            base_symbol = symbol.replace(".NS", "")
            company_name = POPULAR_NAMES.get(symbol, f"{base_symbol} Corporation")
            # Lookup price from parquet, falling back to canonical index
            ref_p = ref_prices.get(symbol.upper(), ref_prices.get(base_symbol.upper(), 0.0))
            if ref_p <= 0.0:
                ref_p = 100.0  # safe baseline if completely absent from dataset

            item = {
                "symbol": symbol,
                "base_symbol": base_symbol,
                "company_name": company_name,
                "sector": sector,
                "asset_type": "Equity",
                "reference_price": ref_p,
            }
            stocks.append(item)
            lookup[symbol.upper()] = item
            lookup[base_symbol.upper()] = item
    else:
        # Fallback stocks if file not found
        for symbol, name, sector in [
            ("TCS.NS", "Tata Consultancy Services Ltd", "Information Technology"),
            ("RELIANCE.NS", "Reliance Industries Ltd", "Energy"),
            ("INFY.NS", "Infosys Ltd", "Information Technology"),
            ("HDFCBANK.NS", "HDFC Bank Ltd", "Financial Services"),
        ]:
            base_symbol = symbol.replace(".NS", "")
            ref_p = ref_prices.get(symbol.upper(), ref_prices.get(base_symbol.upper(), 100.0))
            item = {
                "symbol": symbol,
                "base_symbol": base_symbol,
                "company_name": name,
                "sector": sector,
                "asset_type": "Equity",
                "reference_price": ref_p,
            }
            stocks.append(item)
            lookup[symbol.upper()] = item
            lookup[base_symbol.upper()] = item

    _stocks_cache = stocks
    _symbol_lookup = lookup
    return stocks


def search_stocks(query: str, limit: int = 15) -> List[Dict]:
    stocks = _load_stocks()
    if not query or not query.strip():
        return stocks[:limit]

    q = query.strip().upper()
    results = []

    # 1. Exact symbol prefix matches
    for s in stocks:
        if s["base_symbol"].startswith(q) or s["symbol"].startswith(q):
            results.append(s)

    # 2. Company name or sector contains matches
    for s in stocks:
        if s not in results:
            if q in s["company_name"].upper() or q in s["sector"].upper():
                results.append(s)

    return results[:limit]


def get_stock_info(symbol: str) -> Dict:
    _load_stocks()
    clean = _clean_symbol(symbol)
    base = clean.replace(".NS", "")

    if clean in _symbol_lookup:
        return _symbol_lookup[clean]
    if base in _symbol_lookup:
        return _symbol_lookup[base]

    ref_prices = _load_reference_prices_from_parquet()
    ref_p = ref_prices.get(clean, ref_prices.get(base, 100.0))

    return {
        "symbol": clean,
        "base_symbol": base,
        "company_name": f"{base} Asset",
        "sector": "Other",
        "asset_type": "Equity",
        "reference_price": ref_p,
    }
