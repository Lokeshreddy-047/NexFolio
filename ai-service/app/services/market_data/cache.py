import asyncio
import time
from typing import Dict, Optional, Tuple, Any
from app.schemas.market import MarketOverviewResponse, MarketScreenerResponse, StockDetailResponse


class MarketDataCache:
    """
    High-performance in-memory cache for market quotes and aggregations.
    Thread-safe and async-safe with configurable TTLs.
    """

    def __init__(self, default_ttl_seconds: float = 15.0):
        self._default_ttl = default_ttl_seconds
        self._overview_cache: Optional[Tuple[float, MarketOverviewResponse]] = None
        self._screener_cache: Dict[str, Tuple[float, MarketScreenerResponse]] = {}
        self._stock_detail_cache: Dict[str, Tuple[float, StockDetailResponse]] = {}
        self._batch_quotes_cache: Dict[str, Tuple[float, Dict[str, float]]] = {}
        self._lock = asyncio.Lock()

    async def get_overview(self) -> Optional[MarketOverviewResponse]:
        async with self._lock:
            if self._overview_cache is None:
                return None
            ts, val = self._overview_cache
            if time.time() - ts < self._default_ttl:
                return val
            return None

    async def set_overview(self, val: MarketOverviewResponse):
        async with self._lock:
            self._overview_cache = (time.time(), val)

    async def get_screener(self, cache_key: str) -> Optional[MarketScreenerResponse]:
        async with self._lock:
            if cache_key in self._screener_cache:
                ts, val = self._screener_cache[cache_key]
                if time.time() - ts < self._default_ttl:
                    return val
            return None

    async def set_screener(self, cache_key: str, val: MarketScreenerResponse):
        async with self._lock:
            self._screener_cache[cache_key] = (time.time(), val)

    async def get_stock_detail(self, symbol: str) -> Optional[StockDetailResponse]:
        async with self._lock:
            clean = symbol.upper()
            if clean in self._stock_detail_cache:
                ts, val = self._stock_detail_cache[clean]
                if time.time() - ts < self._default_ttl:
                    return val
            return None

    async def set_stock_detail(self, symbol: str, val: StockDetailResponse):
        async with self._lock:
            self._stock_detail_cache[symbol.upper()] = (time.time(), val)

    async def invalidate_all(self):
        async with self._lock:
            self._overview_cache = None
            self._screener_cache.clear()
            self._stock_detail_cache.clear()
            self._batch_quotes_cache.clear()
