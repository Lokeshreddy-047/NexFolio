import time
import asyncio
from collections import defaultdict
from typing import Dict, List, Tuple
from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


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

    def _is_ml_route(self, path: str) -> bool:
        if "/report" in path or "/what-if" in path:
            return True
        return any(path.startswith(prefix) for prefix in self.ml_prefixes)

    def _get_client_key(self, request: Request) -> str:
        # Prefer authenticated user ID from Authorization header or fallback to client IP
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token_part = auth_header.replace("Bearer ", "").strip()
            # Simple hash of token for rate key
            return f"user:{hash(token_part)}"
        
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return f"ip:{forwarded.split(',')[0].strip()}"
        return f"ip:{request.client.host if request.client else 'unknown'}"

    async def dispatch(self, request: Request, call_next) -> Response:
        # Exclude documentation and health check endpoints from rate limiting
        if request.url.path in ("/api/v1/health", "/api/v1/health/ready", "/docs", "/openapi.json", "/redoc", "/"):
            return await call_next(request)

        now = time.time()
        client_key = self._get_client_key(request)
        is_ml = self._is_ml_route(request.url.path)
        limit = self.ml_limit if is_ml else self.default_limit
        window = 60.0  # 1 minute sliding window

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
