from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app

from apps.api.app.config import settings
from apps.api.app.db.session import Base, async_engine
from apps.api.app.middleware.auth import JWTMiddleware
from apps.api.app.middleware.logging import StructuredLoggingMiddleware
from apps.api.app.middleware.metrics import MetricsMiddleware
from apps.api.app.routes.auth import router as auth_router
from apps.api.app.routes.chat import router as chat_router
from apps.api.app.routes.graph import router as graph_router
from apps.api.app.routes.repos import router as repos_router
from apps.api.app.routes.search import router as search_router
from apps.api.app.routes.webhooks import router as webhooks_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager for startup table creation and shutdown cleanup."""
    # Startup: Create tables in development mode
    if settings.ENVIRONMENT == "development":
        try:
            async with async_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        except Exception as exc:
            import structlog

            structlog.get_logger("codelens.api").warning(
                "startup_table_creation_skipped", error=str(exc)
            )

    yield

    # Shutdown: Dispose async engine pool
    await async_engine.dispose()


app = FastAPI(
    title="CodeLens API",
    description="Production-grade AI-powered code search and intelligence engine",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# 1. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Logging & Metrics Middlewares
app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(MetricsMiddleware)
app.add_middleware(JWTMiddleware)

# 3. Mount Prometheus Metrics App
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# 4. Register Routers
# /auth and /api/v1/auth -> Auth router
app.include_router(auth_router)
app.include_router(auth_router, prefix="/api/v1")

# /api/v1/repos -> Repos, Search, Chat, Graph routers
app.include_router(repos_router, prefix="/api/v1")
app.include_router(search_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(graph_router, prefix="/api/v1")

# /api/v1/webhooks and /webhooks -> Webhooks router
app.include_router(webhooks_router, prefix="/api/v1")
app.include_router(webhooks_router)


@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
async def health_check() -> dict[str, str]:
    """Service health check endpoint used by Docker and load balancers."""
    return {"status": "healthy", "service": "codelens-api"}


@app.get("/", tags=["Root"])
async def root() -> dict[str, str]:
    """Root entry point."""
    return {
        "name": "CodeLens API",
        "version": "0.1.0",
        "docs_url": "/docs",
    }
