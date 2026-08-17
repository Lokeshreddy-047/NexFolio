import os
import logging
from typing import Dict, List, Optional
from app.schemas.market import (
    MarketOverviewResponse,
    MarketScreenerResponse,
    StockDetailResponse,
    DataBadge
)
from app.services.market_data.base import MarketDataProvider
from app.services.market_data.reference_provider import ReferenceMarketProvider
from app.services.market_data.live_provider import LiveMarketProvider
from app.services.market_data.cache import MarketDataCache

logger = logging.getLogger(__name__)

VALID_CONFIG_PAIRS = {
    ("reference", "reference"),
    ("simulated", "simulated"),
    ("live", "yahoo"),
    ("live", "upstox"),
    ("live", "angel_one"),
    ("live", "zerodha"),
    ("live", "nse_authorized_feed"),
}


class MarketDataManager:
    """
    Singleton Manager orchestrating the active MarketDataProvider,
    high-speed in-memory cache, and health monitoring.
    Enforces strict configuration pairing (MARKET_DATA_MODE, MARKET_DATA_PROVIDER).
    """

    def __init__(self):
        self._reference_provider = ReferenceMarketProvider()
        self._cache = MarketDataCache(default_ttl_seconds=15.0)

        mode_env = os.getenv("MARKET_DATA_MODE")
        provider_env = os.getenv("MARKET_DATA_PROVIDER")

        # Normalize and validate configuration pairs
        if mode_env is None and provider_env is None:
            mode = "live"
            provider = "yahoo"
        elif mode_env is None and provider_env is not None:
            provider = provider_env.lower().strip()
            if provider in ("simulated", "simulated_live"):
                mode = "simulated"
                provider = "simulated"
            elif provider in ("yahoo", "yfinance", "public"):
                mode = "live"
                provider = "yahoo"
            elif provider in ("upstox", "angel_one", "zerodha", "live", "live_vendor", "nse_authorized_feed"):
                mode = "live"
                provider = "yahoo" if provider in ("live", "live_vendor") else provider
            else:
                mode = "reference"
                provider = "reference"
        elif mode_env is not None and provider_env is None:
            mode = mode_env.lower().strip()
            provider = "yahoo" if mode == "live" else mode
        else:
            mode = mode_env.lower().strip()
            provider = provider_env.lower().strip()
            if provider in ("yfinance", "public"):
                provider = "yahoo"

        if (mode, provider) not in VALID_CONFIG_PAIRS:
            raise ValueError(
                f"Invalid market configuration pair: MARKET_DATA_MODE='{mode}' and MARKET_DATA_PROVIDER='{provider}'. "
                f"Valid pairs are: {sorted(list(VALID_CONFIG_PAIRS))}"
            )

        self._mode = mode
        self._provider_name = provider

        # Instantiate provider
        if mode == "reference":
            self._active_provider = self._reference_provider
        elif mode == "simulated":
            from app.services.market_data.adapters.simulated_adapter import SimulatedLiveFeedAdapter
            sim_adapter = SimulatedLiveFeedAdapter(reference_provider=self._reference_provider)
            self._active_provider = LiveMarketProvider(
                adapter=sim_adapter,
                reference_fallback=self._reference_provider
            )
        elif mode == "live":
            try:
                if provider == "yahoo":
                    from app.services.market_data.adapters.yahoo_adapter import YahooFinanceAdapter
                    adapter = YahooFinanceAdapter()
                elif provider == "upstox":
                    from app.services.market_data.adapters.upstox_adapter import UpstoxBrokerAdapter
                    adapter = UpstoxBrokerAdapter()
                elif provider == "angel_one":
                    from app.services.market_data.adapters.live_broker_adapter import LiveBrokerAdapter
                    adapter = LiveBrokerAdapter(broker_name="angel_one")
                else:
                    from app.services.market_data.adapters.live_broker_adapter import LiveBrokerAdapter
                    adapter = LiveBrokerAdapter(broker_name=provider)

                self._active_provider = LiveMarketProvider(
                    adapter=adapter,
                    reference_fallback=self._reference_provider
                )
            except Exception as exc:
                logger.warning(f"Could not initialize live broker adapter ({provider}): {exc}. Falling back to reference provider.")
                self._active_provider = self._reference_provider

    @property
    def active_provider(self) -> MarketDataProvider:
        return self._active_provider

    @property
    def provider(self) -> MarketDataProvider:
        return self._active_provider

    def set_active_provider(self, provider: MarketDataProvider):
        self._active_provider = provider

    async def get_market_overview(self) -> MarketOverviewResponse:
        cached = await self._cache.get_overview()
        if cached:
            return cached

        try:
            res = await self._active_provider.get_market_overview()
        except Exception as exc:
            # Safe degradation to reference data
            res = await self._reference_provider.get_market_overview()
            res.data_badge = DataBadge.FALLBACK_REFERENCE.value
            res.fallback_reason = f"Active provider failure: {str(exc)}"
            res.is_stale = True

        await self._cache.set_overview(res)
        return res

    async def get_stock_screener(
        self,
        query: Optional[str] = None,
        sector: Optional[str] = None,
        preset: str = "ALL",
        sort_by: str = "day_change_pct",
        sort_order: str = "desc",
        limit: int = 50,
        offset: int = 0
    ) -> MarketScreenerResponse:
        cache_key = f"{query}:{sector}:{preset}:{sort_by}:{sort_order}:{limit}:{offset}"
        cached = await self._cache.get_screener(cache_key)
        if cached:
            return cached

        try:
            res = await self._active_provider.get_stock_screener(
                query, sector, preset, sort_by, sort_order, limit, offset
            )
        except Exception as exc:
            res = await self._reference_provider.get_stock_screener(
                query, sector, preset, sort_by, sort_order, limit, offset
            )
            res.data_badge = DataBadge.FALLBACK_REFERENCE.value
            res.fallback_reason = f"Active provider failure: {str(exc)}"
            res.is_stale = True

        await self._cache.set_screener(cache_key, res)
        return res

    async def get_stock_detail(
        self,
        symbol: str,
        user_portfolio_holdings: Optional[List[dict]] = None,
        is_in_watchlist: bool = False
    ) -> Optional[StockDetailResponse]:
        # Don't cache personalized portfolio holdings lookup, but cache base quote
        try:
            res = await self._active_provider.get_stock_detail(
                symbol, user_portfolio_holdings, is_in_watchlist
            )
        except Exception as exc:
            res = await self._reference_provider.get_stock_detail(
                symbol, user_portfolio_holdings, is_in_watchlist
            )
            if res:
                res.data_badge = DataBadge.FALLBACK_REFERENCE.value
                res.fallback_reason = f"Active provider failure: {str(exc)}"
                res.is_stale = True

        return res

    async def get_batch_quotes(self, symbols: List[str]) -> Dict[str, Dict[str, float]]:
        try:
            return await self._active_provider.get_batch_quotes(symbols)
        except Exception:
            return await self._reference_provider.get_batch_quotes(symbols)

    async def health_check(self) -> dict:
        active_health = await self._active_provider.health_check()
        ref_health = await self._reference_provider.health_check()
        
        # Determine granular readiness state: CONFIGURED | CONNECTING | LIVE | DELAYED | FALLBACK_REFERENCE | UNAVAILABLE
        readiness_state = "LIVE" if active_health.get("status") == "HEALTHY" else "FALLBACK_REFERENCE"
        if hasattr(self._active_provider, "adapter") and hasattr(self._active_provider.adapter, "connection_state"):
            readiness_state = self._active_provider.adapter.connection_state

        return {
            "mode": getattr(self, "_mode", "reference"),
            "provider": getattr(self, "_provider_name", "reference"),
            "readiness_state": readiness_state,
            "active_provider": active_health,
            "reference_fallback": ref_health,
            "status": "HEALTHY" if active_health.get("status") == "HEALTHY" else "DEGRADED"
        }


# Global instance
market_data_manager = MarketDataManager()
