from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response, status
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest

# Prometheus Metrics
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


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown events."""
    # Startup logic
    yield
    # Shutdown logic


app = FastAPI(
    title="CodeLens API",
    description="Production-grade AI-powered code search and intelligence engine",
    version="0.1.0",
    lifespan=lifespan,
)


@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
async def health_check() -> dict[str, str]:
    """Service health check endpoint used by Docker and load balancers."""
    return {"status": "healthy", "service": "codelens-api"}


@app.get("/metrics", tags=["Monitoring"])
async def metrics() -> Response:
    """Prometheus metrics scrape endpoint."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )


@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    """Root entry point."""
    return {
        "name": "CodeLens API",
        "version": "0.1.0",
        "docs_url": "/docs",
    }
