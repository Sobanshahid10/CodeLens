from __future__ import annotations

import time
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from prometheus_client import Counter, Gauge, Histogram
from starlette.middleware.base import BaseHTTPMiddleware

# ── Prometheus Metric Definitions ─────────────────────────────

REQUEST_COUNT = Counter(
    "codelens_http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"],
)

REQUEST_LATENCY = Histogram(
    "codelens_http_request_duration_seconds",
    "HTTP request latency",
    ["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)

RETRIEVAL_LATENCY = Histogram(
    "codelens_retrieval_duration_seconds",
    "Hybrid search duration",
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0],
)

LLM_TOKENS_TOTAL = Counter(
    "codelens_llm_tokens_total",
    "Total LLM tokens consumed",
    ["provider", "model", "token_type"],
)

LLM_REQUEST_LATENCY = Histogram(
    "codelens_llm_request_duration_seconds",
    "LLM API call duration",
    ["provider", "model"],
    buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
)

INDEXING_JOBS_TOTAL = Counter(
    "codelens_indexing_jobs_total",
    "Indexing jobs by status",
    ["status"],
)

INDEXING_DURATION = Histogram(
    "codelens_indexing_duration_seconds",
    "Full repository indexing duration",
    buckets=[10, 30, 60, 120, 300, 600, 1800],
)

ACTIVE_WORKERS = Gauge(
    "codelens_active_celery_workers",
    "Number of active Celery workers",
)


class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware for Prometheus HTTP request metrics recording."""

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
