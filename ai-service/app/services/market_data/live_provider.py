import os
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Tuple

from app.schemas.market import (
    DataBadge,
    MarketOverviewResponse,
    MarketScreenerResponse,
    StockDetailResponse,
    MarketStockItem,
    MarketIndex,
    MarketPulse,
    SectorPerformanceItem,
    StockPricePoint,
    PortfolioStockExposure
)
from app.services.market_data.base import MarketDataProvider
from app.services.market_data.reference_provider import ReferenceMarketProvider
from app.services.market_data.adapters.base import BaseBrokerAdapter
from app.services.market_data.adapters.simulated_adapter import SimulatedLiveFeedAdapter
from app.services.market_data.symbol_normalizer import SymbolNormalizer
from app.services.market_data.market_session import (
    get_market_session_state,
    check_quote_staleness
)


class LiveMarketProvider(MarketDataProvider):
    """
    Production Live Market Data Provider.
    Orchestrates live broker feeds or simulated market adapters with honest pedigree tagging:
    - LIVE: Active stream from authorized broker during market session.
    - SIMULATED: Generated test stream (explicitly marked, never falsified as LIVE).
    - DELAYED: Stream heartbeat exceeds staleness threshold.
    - FALLBACK_REFERENCE: Disconnected feed gracefully degrades to reference parquet.
    - UNAVAILABLE: Disconnected with no reference fallback.
    """

    def __init__(
        self,
        adapter: Optional[BaseBrokerAdapter] = None,
        provider_name: Optional[str] = None,
        reference_fallback: Optional[ReferenceMarketProvider] = None,
        max_staleness_seconds: float = 60.0
    ):
        from app.services.market_data.adapters.live_broker_adapter import LiveBrokerAdapter

        self._fallback = reference_fallback or ReferenceMarketProvider()
        if adapter is not None:
            self._adapter = adapter
        elif provider_name:
            self._adapter = LiveBrokerAdapter(broker_name=provider_name)
        else:
            self._adapter = SimulatedLiveFeedAdapter(reference_provider=self._fallback)

        self._max_staleness_seconds = max_staleness_seconds
        self._live_quotes_override: Dict[str, Dict[str, Any]] = {}

        # Wire adapter tick callback
        self._adapter.set_on_tick_callback(self.update_live_quote)

    def set_connection_status(self, connected: bool):
        self._adapter._is_connected = connected

    @property
    def _last_heartbeat(self) -> datetime:
        return self._adapter._last_heartbeat

    @_last_heartbeat.setter
    def _last_heartbeat(self, dt: datetime):
        self._adapter._last_heartbeat = dt

    @property
    def provider_id(self) -> str:
        return f"live_feed_{self._adapter.adapter_name}"

    @property
    def default_data_badge(self) -> DataBadge:
        return self._adapter.data_badge

    @property
    def adapter(self) -> BaseBrokerAdapter:
        return self._adapter

    def set_adapter(self, adapter: BaseBrokerAdapter):
        self._adapter = adapter
        self._adapter.set_on_tick_callback(self.update_live_quote)

    def update_live_quote(self, symbol: str, ltp: float, day_change: float, day_change_pct: float, volume: int):
        """Callback to ingest incoming normalized ticks."""
        can_sym = SymbolNormalizer.to_canonical(symbol)
        self._live_quotes_override[can_sym] = {
            "price": ltp,
            "day_change": day_change,
            "day_change_pct": day_change_pct,
            "volume": volume,
            "updated_at": datetime.now(timezone.utc)
        }

    async def connect(self) -> bool:
        return await self._adapter.connect()

    async def disconnect(self):
        await self._adapter.disconnect()

    async def subscribe(self, symbols: List[str]):
        await self._adapter.subscribe(symbols)

    def _determine_current_badge(self) -> Tuple[DataBadge, bool, str]:
        """Evaluates state machine: LIVE | SIMULATED | DELAYED | FALLBACK_REFERENCE"""
        if not self._adapter.is_connected:
            return DataBadge.FALLBACK_REFERENCE, True, "Feed disconnected; safely operating on reference data."

        is_stale, reason = check_quote_staleness(
            self._adapter.last_heartbeat,
            self._max_staleness_seconds,
            enforce_market_hours=False
        )

        if is_stale:
            return DataBadge.DELAYED, True, reason

        return self._adapter.data_badge, False, "Feed active and fresh"

    async def get_market_overview(self) -> MarketOverviewResponse:
        session_state, _ = get_market_session_state()
        now_utc = datetime.now(timezone.utc)
        badge, is_stale, reason = self._determine_current_badge()

        # 1. Fallback if disconnected
        if badge == DataBadge.FALLBACK_REFERENCE:
            ref_resp = await self._fallback.get_market_overview()
            ref_resp.data_badge = DataBadge.FALLBACK_REFERENCE.value
            ref_resp.fallback_reason = reason
            ref_resp.is_stale = True
            return ref_resp

        # 2. Get base overview and apply live overrides
        base_resp = await self._fallback.get_market_overview()
        base_resp.data_badge = badge.value
        base_resp.provider = self.provider_id
        base_resp.market_date = now_utc.strftime("%b %d, %Y")
        base_resp.updated_at = now_utc.isoformat()
        base_resp.market_session = session_state.value
        base_resp.is_stale = is_stale
        if is_stale:
            base_resp.fallback_reason = reason

        # Overlay any major index updates from adapter snapshots or live stream
        index_symbols = [idx.symbol for idx in base_resp.indices]
        adapter_quotes = await self._adapter.fetch_snapshot(index_symbols)

        for idx in base_resp.indices:
            can_sym = SymbolNormalizer.to_canonical(idx.symbol)
            ov = self._live_quotes_override.get(can_sym) or adapter_quotes.get(can_sym)
            if ov:
                idx.current_level = ov["price"]
                idx.day_change = ov["day_change"]
                idx.day_change_pct = ov["day_change_pct"]

        # Overlay top gainers, losers, and most active
        all_movers = base_resp.top_gainers + base_resp.top_losers + base_resp.most_active
        mover_symbols = list(set([m.symbol for m in all_movers]))
        mover_quotes = await self._adapter.fetch_snapshot(mover_symbols)
        for m in all_movers:
            can_sym = SymbolNormalizer.to_canonical(m.symbol)
            ov = self._live_quotes_override.get(can_sym) or mover_quotes.get(can_sym)
            if ov:
                m.current_price = ov["price"]
                m.day_change = ov["day_change"]
                m.day_change_pct = ov["day_change_pct"]
                m.volume = ov.get("volume", m.volume)

        # Re-rank top gainers and losers cleanly after quote updates
        unique_movers = list({m.symbol: m for m in all_movers}.values())
        sorted_by_gain = sorted(unique_movers, key=lambda x: x.day_change_pct, reverse=True)
        gainers_pool = [s for s in sorted_by_gain if s.day_change_pct >= 0]
        losers_pool = [s for s in sorted_by_gain if s.day_change_pct <= 0]
        base_resp.top_gainers = gainers_pool[:6] if gainers_pool else sorted_by_gain[:6]
        base_resp.top_losers = losers_pool[-6:][::-1] if losers_pool else sorted_by_gain[-6:][::-1]

        return base_resp

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
        session_state, _ = get_market_session_state()
        now_utc = datetime.now(timezone.utc)
        badge, is_stale, reason = self._determine_current_badge()

        if badge == DataBadge.FALLBACK_REFERENCE:
            ref_resp = await self._fallback.get_stock_screener(
                query, sector, preset, sort_by, sort_order, limit, offset
            )
            ref_resp.data_badge = DataBadge.FALLBACK_REFERENCE.value
            ref_resp.fallback_reason = reason
            ref_resp.is_stale = True
            return ref_resp

        base_resp = await self._fallback.get_stock_screener(
            query, sector, preset, sort_by, sort_order, limit, offset
        )

        # Overlay live quotes from adapter snapshots or live stream overrides
        returned_symbols = [s.symbol for s in base_resp.stocks]
        adapter_quotes = await self._adapter.fetch_snapshot(returned_symbols)

        for stock in base_resp.stocks:
            can_sym = SymbolNormalizer.to_canonical(stock.symbol)
            ov = self._live_quotes_override.get(can_sym) or adapter_quotes.get(can_sym)
            if ov:
                stock.current_price = ov["price"]
                stock.day_change = ov["day_change"]
                stock.day_change_pct = ov["day_change_pct"]
                stock.volume = ov.get("volume", stock.volume)

        # Re-sort if sorted by day_change_pct or current_price
        if sort_by == "day_change_pct":
            base_resp.stocks.sort(key=lambda x: x.day_change_pct, reverse=(sort_order.lower() == "desc"))
        elif sort_by == "current_price":
            base_resp.stocks.sort(key=lambda x: x.current_price, reverse=(sort_order.lower() == "desc"))

        base_resp.data_badge = badge.value
        base_resp.provider = self.provider_id
        base_resp.updated_at = now_utc.isoformat()
        base_resp.market_session = session_state.value
        base_resp.is_stale = is_stale
        if is_stale:
            base_resp.fallback_reason = reason

        return base_resp

    async def get_stock_detail(
        self,
        symbol: str,
        user_portfolio_holdings: Optional[List[dict]] = None,
        is_in_watchlist: bool = False
    ) -> Optional[StockDetailResponse]:
        session_state, _ = get_market_session_state()
        now_utc = datetime.now(timezone.utc)
        badge, is_stale, reason = self._determine_current_badge()

        detail = await self._fallback.get_stock_detail(symbol, user_portfolio_holdings, is_in_watchlist)
        if not detail:
            return None

        if badge == DataBadge.FALLBACK_REFERENCE:
            detail.data_badge = DataBadge.FALLBACK_REFERENCE.value
            detail.fallback_reason = reason
            detail.is_stale = True
            return detail

        # Overlay live quote
        can_sym = SymbolNormalizer.to_canonical(symbol)
        adapter_quotes = await self._adapter.fetch_snapshot([can_sym])
        ov = self._live_quotes_override.get(can_sym) or adapter_quotes.get(can_sym)
        if ov:
            detail.current_price = ov["price"]
            detail.day_change = ov["day_change"]
            detail.day_change_pct = ov["day_change_pct"]
            detail.volume = ov.get("volume", detail.volume)

        detail.data_badge = badge.value
        detail.provider = self.provider_id
        detail.updated_at = now_utc.isoformat()
        detail.market_session = session_state.value
        detail.is_stale = is_stale
        if is_stale:
            detail.fallback_reason = reason

        return detail

    async def get_batch_quotes(self, symbols: List[str]) -> Dict[str, Dict[str, float]]:
        quotes = await self._fallback.get_batch_quotes(symbols)
        adapter_quotes = await self._adapter.fetch_snapshot(symbols)
        for sym in symbols:
            can_sym = SymbolNormalizer.to_canonical(sym)
            ov = self._live_quotes_override.get(can_sym) or adapter_quotes.get(can_sym)
            if ov:
                quotes[can_sym] = {
                    "price": ov["price"],
                    "day_change": ov["day_change"],
                    "day_change_pct": ov["day_change_pct"],
                    "volume": float(ov.get("volume", 0))
                }
        return quotes

    async def health_check(self) -> Dict[str, Any]:
        badge, is_stale, reason = self._determine_current_badge()
        return {
            "provider_id": self.provider_id,
            "data_badge": badge.value,
            "status": "HEALTHY" if self._adapter.is_connected and not is_stale else "DEGRADED" if is_stale else "DISCONNECTED",
            "is_connected": self._adapter.is_connected,
            "is_stale": is_stale,
            "staleness_notes": reason,
            "active_overrides": len(self._live_quotes_override),
            "last_heartbeat": self._adapter.last_heartbeat.isoformat()
        }
