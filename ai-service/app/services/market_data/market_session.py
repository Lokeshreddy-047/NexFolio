import zoneinfo
from datetime import datetime, time, timezone
from typing import Tuple
from app.schemas.market import MarketSessionState

# Indian Standard Time Zone
IST = zoneinfo.ZoneInfo("Asia/Kolkata")

# Standard NSE Market Hours (IST)
PRE_OPEN_START = time(9, 0)
MARKET_OPEN = time(9, 15)
MARKET_CLOSE = time(15, 30)
POST_CLOSE_END = time(16, 0)

# Major NSE Market Holidays for 2026 (Sample calendar)
NSE_HOLIDAYS_2026 = {
    "2026-01-26",  # Republic Day
    "2026-03-03",  # Holi
    "2026-03-20",  # Id-Ul-Fitr
    "2026-04-03",  # Good Friday
    "2026-04-14",  # Dr. Ambedkar Jayanti
    "2026-05-01",  # Maharashtra Day
    "2026-08-15",  # Independence Day
    "2026-10-02",  # Mahatma Gandhi Jayanti
    "2026-10-20",  # Dussehra
    "2026-11-09",  # Diwali Laxmi Pujan
    "2026-11-10",  # Diwali Balipratipada
    "2026-12-25",  # Christmas
}


def get_current_ist_time() -> datetime:
    """Returns the current datetime in Indian Standard Time (Asia/Kolkata)."""
    return datetime.now(IST)


def get_market_session_state(dt: datetime = None) -> Tuple[MarketSessionState, str]:
    """
    Evaluates current IST time against the NSE trading session calendar.
    Returns (SessionState, HumanReadableDescription).
    """
    if dt is None:
        dt = get_current_ist_time()
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc).astimezone(IST)
    else:
        dt = dt.astimezone(IST)

    # 1. Check Weekend (5 = Saturday, 6 = Sunday)
    if dt.weekday() in (5, 6):
        return MarketSessionState.WEEKEND, "NSE is closed for the weekend (Trading resumes Monday 09:15 IST)"

    # 2. Check NSE Holiday
    date_str = dt.strftime("%Y-%m-%d")
    if date_str in NSE_HOLIDAYS_2026:
        return MarketSessionState.HOLIDAY, "NSE is closed for an official exchange trading holiday"

    # 3. Check Time of Day
    current_time = dt.time()

    if PRE_OPEN_START <= current_time < MARKET_OPEN:
        return MarketSessionState.PRE_OPEN, "NSE Pre-Open Order Matching Session (09:00 - 09:15 IST)"

    if MARKET_OPEN <= current_time <= MARKET_CLOSE:
        return MarketSessionState.OPEN, "NSE Regular Trading Session Active (09:15 - 15:30 IST)"

    if MARKET_CLOSE < current_time <= POST_CLOSE_END:
        return MarketSessionState.POST_CLOSE, "NSE Post-Closing Session (15:30 - 16:00 IST)"

    return MarketSessionState.CLOSED, "NSE Trading Session is Closed (Reopens 09:00 IST next trading day)"


def is_market_open(dt: datetime = None) -> bool:
    """Returns True if the market is currently in active regular trading session."""
    state, _ = get_market_session_state(dt)
    return state == MarketSessionState.OPEN


def check_quote_staleness(
    updated_at: datetime,
    max_live_age_seconds: float = 60.0,
    enforce_market_hours: bool = False
) -> Tuple[bool, str]:
    """
    Checks if a quote's timestamp or provider heartbeat is considered stale.
    If enforce_market_hours is True, outside active hours data is not marked stale.
    Otherwise, if last heartbeat exceeds max_live_age_seconds, it is marked stale.
    """
    now = datetime.now(timezone.utc)
    if updated_at.tzinfo is None:
        updated_at = updated_at.replace(tzinfo=timezone.utc)

    age_seconds = (now - updated_at).total_seconds()
    market_active = is_market_open()

    if enforce_market_hours and not market_active:
        return False, "Market session is currently closed; static closing quote is valid"

    if age_seconds > max_live_age_seconds:
        return True, f"Feed age is {int(age_seconds)}s (Threshold: {int(max_live_age_seconds)}s)"

    return False, "Quote is within freshness tolerance"
