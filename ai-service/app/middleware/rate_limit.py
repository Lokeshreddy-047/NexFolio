import time
import asyncio
from collections import defaultdict
from typing import Dict, List, Tuple, Optional
from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.config.settings import settings

try:
    import redis.asyncio as aioredis
except ImportError:
    aioredis = None


class SlidingWindowRateLimiter(BaseHTTPMiddleware):
    """
    Production In-Memory Sliding Window Rate Limiter.
    Protects heavy ML inference and standard endpoints from abuse.
    """

    def __init__(
        self,
        app,
        default_limit_per_minute: int = 300,
        ml_limit_per_minute: int = 60,
        cleanup_interval_seconds: int = 300
    ):
        super().__init__(app)
        self.default_limit = default_limit_per_minute
        self.ml_limit = ml_limit_per_minute
        self.cleanup_interval = cleanup_interval_seconds
        # client_key -> list of timestamp floats
        self._clients: Dict[str, List[float]] = defaultdict(list)
        self._lock = asyncio.Lock()
        self._last_cleanup = time.time()

        # Specific endpoints considered heavy ML tasks
        self.ml_prefixes = (
            "/api/v1/intelligence",
            "/api/v1/explain",
            "/api/v1/risk/predict",
        )
        self._redis = None
        if settings.redis_url and aioredis is not None:
            try:
                self._redis = aioredis.from_url(
                    settings.redis_url,
                    encoding="utf-8",
                    decode_responses=True
                )
            except Exception as e:
                print(f"[SlidingWindowRateLimiter] Redis initialization warning: {e}")
                self._redis = None

    def _is_ml_route(self, path: str) -> bool:
        if "/report" in path or "/what-if" in path:
            return True
        return any(path.startswith(prefix) for prefix in self.ml_prefixes)

    def _get_client_key(self, request: Request) -> str:
        # Prefer authenticated user ID from Authorization header
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token_part = auth_header.replace("Bearer ", "").strip()
            return f"user:{hash(token_part)}"

        client_host = request.client.host if request.client else "unknown"

        # Safe reverse proxy extraction: only trust X-Forwarded-For from authorized reverse proxies
        if client_host.lower() in settings.trusted_proxies:
            forwarded = request.headers.get("X-Forwarded-For")
            if forwarded:
                real_ip = forwarded.split(",")[0].strip()
                if real_ip:
                    return f"ip:{real_ip}"

        return f"ip:{client_host}"

    async def _check_rate_limit_redis(
        self,
        client_key: str,
        limit: int,
        window: float,
        now: float
    ) -> Tuple[bool, int, int]:
        redis_key = f"rate_limit:{client_key}"
        window_start = now - window
        pipe = self._redis.pipeline()
        pipe.zremrangebyscore(redis_key, 0, window_start)
        pipe.zcard(redis_key)
        pipe.zrange(redis_key, 0, 0, withscores=True)
        results = await pipe.execute()

        current_count = results[1]
        oldest_records = results[2]

        if current_count >= limit:
            oldest_ts = float(oldest_records[0][1]) if oldest_records else window_start
            retry_after = max(1, int(window - (now - oldest_ts)))
            return False, 0, retry_after

        pipe = self._redis.pipeline()
        pipe.zadd(redis_key, {str(now): now})
        pipe.expire(redis_key, int(window) + 10)
        await pipe.execute()

        remaining = max(0, limit - (current_count + 1))
        return True, remaining, 0

    async def dispatch(self, request: Request, call_next) -> Response:
        # Exclude documentation and health check endpoints from rate limiting
        if request.url.path in ("/api/v1/health", "/api/v1/health/ready", "/docs", "/openapi.json", "/redoc", "/"):
            return await call_next(request)

        now = time.time()
        client_key = self._get_client_key(request)
        is_ml = self._is_ml_route(request.url.path)
        limit = self.ml_limit if is_ml else self.default_limit
        window = 60.0  # 1 minute sliding window

        if self._redis is not None:
            try:
                allowed, remaining, retry_after = await self._check_rate_limit_redis(
                    client_key, limit, window, now
                )
                if not allowed:
                    req_id = getattr(request.state, "request_id", "req-live")
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content={
                            "error": {
                                "code": "RATE_LIMIT_EXCEEDED",
                                "message": f"Rate limit exceeded. Maximum {limit} requests per minute permitted for this route.",
                                "request_id": req_id,
                                "retry_after_seconds": retry_after
                            }
                        },
                        headers={
                            "Retry-After": str(retry_after),
                            "X-RateLimit-Limit": str(limit),
                            "X-RateLimit-Remaining": "0",
                            "X-RateLimit-Reset": str(int(now + retry_after))
                        }
                    )
                response = await call_next(request)
                response.headers["X-RateLimit-Limit"] = str(limit)
                response.headers["X-RateLimit-Remaining"] = str(remaining)
                return response
            except Exception as e:
                # Fall back to in-memory sliding window if Redis call fails
                pass

        async with self._lock:
            # Periodic cleanup of stale client keys
            if now - self._last_cleanup > self.cleanup_interval:
                for k in list(self._clients.keys()):
                    self._clients[k] = [ts for ts in self._clients[k] if now - ts < window]
                    if not self._clients[k]:
                        del self._clients[k]
                self._last_cleanup = now

            timestamps = self._clients[client_key]
            # Filter timestamps within current 60s sliding window
            timestamps = [ts for ts in timestamps if now - ts < window]
            self._clients[client_key] = timestamps

            req_id = getattr(request.state, "request_id", "req-live")

            if len(timestamps) >= limit:
                oldest_ts = timestamps[0]
                retry_after = max(1, int(window - (now - oldest_ts)))
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "message": f"Rate limit exceeded. Maximum {limit} requests per minute permitted for this route.",
                            "request_id": req_id,
                            "retry_after_seconds": retry_after
                        }
                    },
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(int(oldest_ts + window))
                    }
                )

            # Record this request
            timestamps.append(now)
            remaining = max(0, limit - len(timestamps))

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
