import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Set, Tuple
import httpx

from app.schemas.market import DataBadge
from app.services.market_data.adapters.base import BaseBrokerAdapter
from app.services.market_data.symbol_normalizer import SymbolNormalizer
from app.services.market_data.market_session import is_market_open

logger = logging.getLogger(__name__)

YAHOO_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


class YahooFinanceAdapter(BaseBrokerAdapter):
    """
    Public Zero-Auth Market Data Feed Adapter via Yahoo Finance v8 API.
    Stateless, symbol-agnostic quote fetcher with bounded concurrency,
    dynamic freshness determination (LIVE / DELAYED / FALLBACK_REFERENCE),
    and in-memory quote caching with SSE tick emission.
    """

    def __init__(
        self,
        timeout_seconds: float = 6.0,
        max_concurrent_requests: int = 15,
        cache_ttl_seconds: float = 15.0,
        live_freshness_window_seconds: float = 60.0
    ):
        super().__init__(adapter_name="yahoo_finance", data_badge=DataBadge.LIVE)
        self._timeout = timeout_seconds
        self._semaphore = asyncio.Semaphore(max_concurrent_requests)
        self._cache_ttl = cache_ttl_seconds
        self._freshness_window = live_freshness_window_seconds
        self._quotes_cache: Dict[str, Dict[str, Any]] = {}
        self._subscribed_symbols: Set[str] = set()
        self._client: Optional[httpx.AsyncClient] = None
        self._poll_task: Optional[asyncio.Task] = None
        self._running = False
        self._connection_state = "LIVE"
        self._is_connected = True
        self._last_heartbeat = datetime.now(timezone.utc)

    @property
    def connection_state(self) -> str:
        return self._connection_state

    async def _get_client(self) -> httpx.AsyncClient:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if self._client is None or self._client.is_closed or getattr(self, "_client_loop", None) != loop:
            if self._client and not self._client.is_closed:
                try:
                    await self._client.aclose()
                except Exception:
                    pass
            limits = httpx.Limits(max_keepalive_connections=20, max_connections=30)
            self._client = httpx.AsyncClient(
                timeout=self._timeout,
                limits=limits,
                headers={"User-Agent": YAHOO_USER_AGENT, "Accept": "application/json"}
            )
            self._client_loop = loop
        return self._client

    def _determine_pedigree(self, quote_timestamp: Optional[datetime]) -> Tuple[DataBadge, str]:
        """
        Dynamically derives data badge from quote timestamp and market hours:
        - LIVE: Market is open AND quote timestamp is within live freshness window.
        - LIVE (Official Close): Market is closed; quote represents authentic exchange closing price.
        - DELAYED: Quote age exceeds freshness window during active trading.
        - FALLBACK_REFERENCE: Quote timestamp missing or unparseable.
        """
        if quote_timestamp is None:
            return DataBadge.FALLBACK_REFERENCE, "No valid market timestamp available"

        now = datetime.now(timezone.utc)
        if quote_timestamp.tzinfo is None:
            quote_timestamp = quote_timestamp.replace(tzinfo=timezone.utc)

        age_seconds = (now - quote_timestamp).total_seconds()
        market_open = is_market_open()

        if market_open and age_seconds <= self._freshness_window:
            return DataBadge.LIVE, f"Fresh market quote (Age: {int(age_seconds)}s)"

        if not market_open and age_seconds <= self._freshness_window:
            return DataBadge.LIVE, "NSE trading session closed; displaying official exchange closing price"

        return DataBadge.DELAYED, f"Delayed market quote (Age: {int(age_seconds)}s)"

    async def fetch_single_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Fetches official quote for a single symbol from Yahoo Finance v8 chart API.
        Symbol-agnostic: works with any canonical equity or index ticker.
        """
        canonical = SymbolNormalizer.to_canonical(symbol)
        if not canonical:
            return None

        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{canonical}?interval=1d&range=1d"
        client = await self._get_client()

        async with self._semaphore:
            try:
                res = await client.get(url)
                if res.status_code != 200:
                    logger.warning(f"Yahoo API returned HTTP {res.status_code} for {canonical}")
                    return None

                data = res.json()
                chart_result = data.get("chart", {}).get("result", [])
                if not chart_result:
                    return None

                meta = chart_result[0].get("meta", {})
                price_raw = meta.get("regularMarketPrice")
                if price_raw is None:
                    return None

                prev_raw = meta.get("previousClose") or meta.get("chartPreviousClose") or price_raw
                vol_raw = meta.get("regularMarketVolume", 0)
                market_time_epoch = meta.get("regularMarketTime")

                quote_dt = (
                    datetime.fromtimestamp(market_time_epoch, tz=timezone.utc)
                    if market_time_epoch
                    else datetime.now(timezone.utc)
                )

                price = round(float(price_raw), 2)
                prev_close = round(float(prev_raw), 2)
                day_change = round(price - prev_close, 2)
                day_change_pct = round((day_change / prev_close) * 100.0, 2) if prev_close > 0 else 0.0
                volume = int(vol_raw or 0)

                badge, status_notes = self._determine_pedigree(quote_dt)

                normalized_quote = {
                    "symbol": canonical,
                    "price": price,
                    "previous_close": prev_close,
                    "change": day_change,
                    "change_pct": day_change_pct,
                    "day_change": day_change,
                    "day_change_pct": day_change_pct,
                    "volume": volume,
                    "timestamp": quote_dt.isoformat(),
                    "updated_at": datetime.now(timezone.utc),
                    "data_source": "yahoo_finance",
                    "data_status": badge.value,
                    "data_badge": badge.value,
                    "status_notes": status_notes
                }

                self._quotes_cache[canonical] = normalized_quote
                self._last_heartbeat = datetime.now(timezone.utc)
                self._connection_state = "LIVE"
                return normalized_quote

            except Exception as exc:
                logger.warning(f"Error fetching quote for {canonical} from Yahoo Finance: {exc}")
                return None

    async def fetch_snapshot(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Fetches current quotes for a list of symbols with in-memory caching (TTL-based)
        and bounded async concurrency.
        """
        if not symbols:
            return {}

        now = datetime.now(timezone.utc)
        canonical_symbols = [SymbolNormalizer.to_canonical(s) for s in symbols if s]
        results: Dict[str, Dict[str, Any]] = {}
        missing_or_stale: List[str] = []

        for sym in canonical_symbols:
            cached = self._quotes_cache.get(sym)
            if cached:
                cache_time = cached.get("updated_at")
                if cache_time and (now - cache_time).total_seconds() < self._cache_ttl:
                    results[sym] = cached
                    continue
            missing_or_stale.append(sym)

        if missing_or_stale:
            tasks = [self.fetch_single_quote(sym) for sym in missing_or_stale]
            fetched = await asyncio.gather(*tasks, return_exceptions=True)
            for sym, item in zip(missing_or_stale, fetched):
                if isinstance(item, dict) and item:
                    results[sym] = item
                elif sym in self._quotes_cache:
                    # Use existing cached quote on transient network error
                    results[sym] = self._quotes_cache[sym]

        return results

    async def subscribe(self, symbols: List[str]):
        """Subscribes symbols to the live tick stream and emits current quotes."""
        for s in symbols:
            can = SymbolNormalizer.to_canonical(s)
            if can:
                self._subscribed_symbols.add(can)

        quotes = await self.fetch_snapshot(list(self._subscribed_symbols))
        for sym, q in quotes.items():
            self._emit_tick(
                symbol=sym,
                ltp=q["price"],
                day_change=q["day_change"],
                day_change_pct=q["day_change_pct"],
                volume=q["volume"]
            )

    async def connect(self) -> bool:
        """Connects the adapter and launches background polling task for subscribed symbols."""
        self._is_connected = True
        self._running = True
        self._last_heartbeat = datetime.now(timezone.utc)
        self._connection_state = "LIVE"
        if self._poll_task is None or self._poll_task.done():
            self._poll_task = asyncio.create_task(self._poll_loop())
        logger.info("Yahoo Finance public market adapter connected.")
        return True

    async def disconnect(self):
        """Disconnects the adapter and cleans up tasks and HTTP client."""
        self._running = False
        self._is_connected = False
        self._connection_state = "FALLBACK_REFERENCE"
        if self._poll_task and not self._poll_task.done():
            self._poll_task.cancel()
            try:
                await self._poll_task
            except asyncio.CancelledError:
                pass
            self._poll_task = None

        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None
        logger.info("Yahoo Finance public market adapter disconnected.")

    async def _poll_loop(self):
        """Periodic background refresh for active subscriptions."""
        while self._running:
            try:
                sleep_duration = 15.0 if is_market_open() else 60.0
                await asyncio.sleep(sleep_duration)

                if not self._running or not self._subscribed_symbols:
                    continue

                symbols_list = list(self._subscribed_symbols)
                # Invalidate cache for poll targets to ensure fresh fetch
                for s in symbols_list:
                    if s in self._quotes_cache:
                        self._quotes_cache[s]["updated_at"] = datetime.fromtimestamp(0, tz=timezone.utc)

                quotes = await self.fetch_snapshot(symbols_list)
                for sym, q in quotes.items():
                    self._emit_tick(
                        symbol=sym,
                        ltp=q["price"],
                        day_change=q["day_change"],
                        day_change_pct=q["day_change_pct"],
                        volume=q["volume"]
                    )
            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.warning(f"Error in Yahoo Finance poll loop: {exc}")

    async def health_check(self) -> Dict[str, Any]:
        """Returns adapter connectivity and cache health."""
        return {
            "adapter_name": self.adapter_name,
            "status": "HEALTHY" if self._is_connected else "DISCONNECTED",
            "connection_state": self._connection_state,
            "cached_symbols_count": len(self._quotes_cache),
            "subscribed_symbols_count": len(self._subscribed_symbols),
            "last_heartbeat": self._last_heartbeat.isoformat()
        }
