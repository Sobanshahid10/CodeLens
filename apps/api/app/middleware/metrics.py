from __future__ import annotations

import time
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from prometheus_client import Counter, Histogram
from starlette.middleware.base import BaseHTTPMiddleware

# Prometheus Metrics Definitions
REQUEST_COUNT = Counter(
    "codelens_http_requests_total",
    "Total count of HTTP requests",
    ["method", "endpoint", "status_code"],
)
REQUEST_LATENCY = Histogram(
    "codelens_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
)


class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware for Prometheus request metrics recording."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        start_time = time.perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            duration = time.perf_counter() - start_time
            endpoint = request.url.path
            REQUEST_COUNT.labels(
                method=request.method,
                endpoint=endpoint,
                status_code=str(status_code),
            ).inc()
            REQUEST_LATENCY.labels(
                method=request.method,
                endpoint=endpoint,
            ).observe(duration)
