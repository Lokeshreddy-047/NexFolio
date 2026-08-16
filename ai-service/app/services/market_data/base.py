from abc import ABC, abstractmethod
from typing import Dict, List, Optional
from app.schemas.market import (
    MarketOverviewResponse,
    MarketScreenerResponse,
    StockDetailResponse,
    MarketStockItem,
    DataBadge
)


class MarketDataProvider(ABC):
    """
    Abstract base interface for all market data ingestion providers.
    Decouples market presentation and portfolio valuation from specific vendor APIs.
    """

    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Unique identifier for this provider (e.g. 'parquet_reference', 'nse_vendor_stream')."""
        pass

    @property
    @abstractmethod
    def default_data_badge(self) -> DataBadge:
        """Default pedigree badge (e.g. REFERENCE, LIVE, DELAYED)."""
        pass

    @abstractmethod
    async def get_market_overview(self) -> MarketOverviewResponse:
        """Fetches market pulse, benchmark indices, and top movers."""
        pass

    @abstractmethod
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
        """Runs multi-factor screener against available universe."""
        pass

    @abstractmethod
    async def get_stock_detail(
        self,
        symbol: str,
        user_portfolio_holdings: Optional[List[dict]] = None,
        is_in_watchlist: bool = False
    ) -> Optional[StockDetailResponse]:
        """Fetches institutional quote, 52W range, historical OHLC and technical overlays."""
        pass

    @abstractmethod
    async def get_batch_quotes(self, symbols: List[str]) -> Dict[str, Dict[str, float]]:
        """
        Fast-path quote lookup returning {symbol: {"price": float, "day_change": float, "day_change_pct": float}}.
        Used by the portfolio fast-loop for sub-millisecond valuation.
        """
        pass

    @abstractmethod
    async def health_check(self) -> Dict[str, any]:
        """Returns provider connectivity status and heartbeat latency."""
        pass
