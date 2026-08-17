import re
from typing import Dict, Optional


class SymbolNormalizer:
    """
    Bidirectional Symbol Normalizer for Indian Equities and Indices.
    Translates broker-specific symbols and instrument tokens to/from
    NexFolio's universal canonical '*.NS' format.
    """

    INDEX_MAP_TO_CANONICAL: Dict[str, str] = {
        "NIFTY": "^NSEI",
        "NIFTY50": "^NSEI",
        "NIFTY 50": "^NSEI",
        "NSE:NIFTY": "^NSEI",
        "NSE:NIFTY 50": "^NSEI",
        "SENSEX": "^BSESN",
        "BSE:SENSEX": "^BSESN",
        "BANKNIFTY": "^NSEBANK",
        "NIFTYBANK": "^NSEBANK",
        "NIFTY BANK": "^NSEBANK",
        "BANK NIFTY": "^NSEBANK",
        "NSE:BANKNIFTY": "^NSEBANK",
        "NSE:NIFTYBANK": "^NSEBANK",
        "NSE:BANK NIFTY": "^NSEBANK",
        "NIFTY IT": "^CNXIT",
        "CNXIT": "^CNXIT"
    }

    INDEX_MAP_FROM_CANONICAL: Dict[str, str] = {
        "^NSEI": "NIFTY 50",
        "^BSESN": "SENSEX",
        "^NSEBANK": "BANK NIFTY",
        "^CNXIT": "NIFTY IT"
    }

    @classmethod
    def to_canonical(cls, symbol: str) -> str:
        """
        Normalizes any input symbol string to NexFolio standard (e.g. 'RELIANCE.NS', '^NSEI').
        Examples:
          - 'RELIANCE' -> 'RELIANCE.NS'
          - 'reliance' -> 'RELIANCE.NS'
          - 'NSE:RELIANCE' -> 'RELIANCE.NS'
          - 'RELIANCE-EQ' -> 'RELIANCE.NS'
          - 'NIFTY 50' -> '^NSEI'
          - '^NSEI' -> '^NSEI'
        """
        if not symbol:
            return ""

        sym = symbol.strip().upper()

        # 1. Check index aliases
        if sym in cls.INDEX_MAP_TO_CANONICAL:
            return cls.INDEX_MAP_TO_CANONICAL[sym]

        if sym.startswith("^"):
            return sym

        # 2. Strip broker prefixes like "NSE:", "BSE:", "EQUITY:"
        if ":" in sym:
            sym = sym.split(":")[-1].strip()

        # 3. Strip series suffix like "-EQ", "-BE"
        if sym.endswith("-EQ") or sym.endswith("-BE"):
            sym = sym[:-3]

        # 4. Strip existing '.NS' or '.BO' if present
        if sym.endswith(".NS"):
            return sym
        if sym.endswith(".BO"):
            sym = sym[:-3]

        # 5. Default append .NS for Indian NSE equities
        return f"{sym}.NS"

    @classmethod
    def to_base_symbol(cls, symbol: str) -> str:
        """
        Extracts clean trading ticker without exchange suffix (e.g. 'RELIANCE.NS' -> 'RELIANCE').
        """
        if not symbol:
            return ""
        sym = symbol.strip().upper()
        if sym in cls.INDEX_MAP_FROM_CANONICAL:
            return cls.INDEX_MAP_FROM_CANONICAL[sym]
        if sym.endswith(".NS"):
            return sym[:-3]
        if sym.endswith(".BO"):
            return sym[:-3]
        return sym

    @classmethod
    def to_broker_format(cls, canonical_symbol: str, exchange: str = "NSE") -> str:
        """
        Converts canonical symbol to broker format (e.g., 'RELIANCE.NS' -> 'RELIANCE').
        """
        base = cls.to_base_symbol(canonical_symbol)
        if canonical_symbol.startswith("^"):
            return base
        return base
