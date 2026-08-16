
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Dict, List, Optional, Callable, Any
from app.schemas.market import DataBadge


class BaseBrokerAdapter(ABC):
    """
    Abstract Interface for Market Data Feed Adapters.
    Decouples live tick streams and snapshot polling from specific broker APIs.
    """

    def __init__(self, adapter_name: str, data_badge: DataBadge):
        self.adapter_name = adapter_name
        self.data_badge = data_badge
        self._is_connected = True
        self._last_heartbeat = datetime.now(timezone.utc)
        # Callback to stream tick updates to consumer: (symbol, ltp, day_change, day_change_pct, volume) -> None
        self._on_tick_callback: Optional[Callable[[str, float, float, float, int], None]] = None

    @property
    def is_connected(self) -> bool:
        return self._is_connected

    @property
    def last_heartbeat(self) -> datetime:
        return self._last_heartbeat

    def set_on_tick_callback(self, callback: Callable[[str, float, float, float, int], None]):
        self._on_tick_callback = callback

    def _emit_tick(self, symbol: str, ltp: float, day_change: float, day_change_pct: float, volume: int):
        self._last_heartbeat = datetime.now(timezone.utc)
        if self._on_tick_callback:
            self._on_tick_callback(symbol, ltp, day_change, day_change_pct, volume)

    @abstractmethod
    async def connect(self) -> bool:
        """Establishes connection or stream session."""
        pass

    @abstractmethod
    async def disconnect(self):
        """Terminates connection cleanly."""
        pass

    @abstractmethod
    async def subscribe(self, symbols: List[str]):
        """Subscribes to incoming ticks for the specified canonical symbols."""
        pass

    @abstractmethod
    async def fetch_snapshot(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """Fetches current snapshot prices for requested symbols."""
        pass
