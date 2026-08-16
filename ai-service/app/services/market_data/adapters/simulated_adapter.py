import asyncio
import random
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from app.schemas.market import DataBadge
from app.services.market_data.adapters.base import BaseBrokerAdapter
from app.services.market_data.symbol_normalizer import SymbolNormalizer
from app.services.market_data.reference_provider import ReferenceMarketProvider


class SimulatedLiveFeedAdapter(BaseBrokerAdapter):
    """
    High-Fidelity Simulated Market Data Feed Adapter.
    Generates realistic Brownian motion micro-ticks around reference closing prices.
    Tagged with explicit DataBadge.SIMULATED pedigree for tests, demos, and off-market dev.
    """

    def __init__(
        self,
        reference_provider: Optional[ReferenceMarketProvider] = None,
        tick_interval_seconds: float = 1.0,
        volatility_factor: float = 0.0015
    ):
        super().__init__(adapter_name="simulated_nse_stream", data_badge=DataBadge.SIMULATED)
        self._reference = reference_provider or ReferenceMarketProvider()
        self._tick_interval = tick_interval_seconds
        self._volatility = volatility_factor
        self._subscribed_symbols: set = set()
        self._current_prices: Dict[str, Dict[str, Any]] = {}
        self._task: Optional[asyncio.Task] = None
        self._running = False

    async def _init_base_prices(self):
        """Prepopulates base prices from reference catalog."""
        if self._reference._latest_stock_cache is None:
            self._reference._init_market_data()

        stock_cache = self._reference._latest_stock_cache or {}

        for sym_raw, row in stock_cache.items():
            sym = SymbolNormalizer.to_canonical(str(sym_raw))
            base_p = float(row.get("price", 1000.0))
            chg = float(row.get("day_change", 0.0))
            chg_pct = float(row.get("day_change_pct", 0.0))
            vol = int(row.get("volume", 500000))
            self._current_prices[sym] = {
                "price": base_p,
                "base_close": base_p - chg if (base_p - chg) > 0 else base_p,
                "day_change": chg,
                "day_change_pct": chg_pct,
                "volume": vol,
                "updated_at": datetime.now(timezone.utc)
            }

        # Initialize Major Indices
        for sym, name in [("^NSEI", "NIFTY 50"), ("^BSESN", "SENSEX"), ("^NSEBANK", "BANK NIFTY")]:
            idx_base = 24500.0 if sym == "^NSEI" else 80500.0 if sym == "^BSESN" else 52000.0
            self._current_prices[sym] = {
                "price": idx_base,
                "base_close": idx_base * 0.995,
                "day_change": idx_base * 0.005,
                "day_change_pct": 0.50,
                "volume": 10000000,
                "updated_at": datetime.now(timezone.utc)
            }

    async def connect(self) -> bool:
        if not self._current_prices:
            await self._init_base_prices()
        self._is_connected = True
        self._running = True
        self._last_heartbeat = datetime.now(timezone.utc)
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._tick_loop())
        return True

    async def disconnect(self):
        self._running = False
        self._is_connected = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

    async def subscribe(self, symbols: List[str]):
        if not self._current_prices:
            await self._init_base_prices()
        for sym in symbols:
            can = SymbolNormalizer.to_canonical(sym)
            self._subscribed_symbols.add(can)
            if can in self._current_prices:
                c = self._current_prices[can]
                self._emit_tick(can, c["price"], c["day_change"], c["day_change_pct"], c["volume"])

    async def fetch_snapshot(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        if not self._current_prices:
            await self._init_base_prices()
        result = {}
        for sym in symbols:
            can = SymbolNormalizer.to_canonical(sym)
            if can in self._current_prices:
                result[can] = self._current_prices[can]
        return result

    async def _tick_loop(self):
        """Continuous micro-tick generator simulating market depth activity."""
        while self._running:
            try:
                await asyncio.sleep(self._tick_interval)
                if not self._is_connected or not self._subscribed_symbols:
                    continue

                # Pick a random subset of subscribed symbols to update
                targets = random.sample(
                    list(self._subscribed_symbols),
                    min(len(self._subscribed_symbols), max(3, len(self._subscribed_symbols) // 2))
                )

                for sym in targets:
                    if sym not in self._current_prices:
                        continue
                    curr = self._current_prices[sym]
                    old_price = curr["price"]
                    base_close = curr["base_close"]

                    # Gaussian random walk: dP ~ N(0, sigma)
                    pct_delta = random.gauss(0.0, self._volatility)
                    new_price = round(max(1.0, old_price * (1.0 + pct_delta)), 2)
                    day_change = round(new_price - base_close, 2)
                    day_change_pct = round((day_change / base_close) * 100, 2) if base_close > 0 else 0.0
                    added_vol = random.randint(100, 5000)

                    curr["price"] = new_price
                    curr["day_change"] = day_change
                    curr["day_change_pct"] = day_change_pct
                    curr["volume"] += added_vol
                    curr["updated_at"] = datetime.now(timezone.utc)

                    self._emit_tick(
                        symbol=sym,
                        ltp=new_price,
                        day_change=day_change,
                        day_change_pct=day_change_pct,
                        volume=curr["volume"]
                    )
            except asyncio.CancelledError:
                break
            except Exception:
                pass
