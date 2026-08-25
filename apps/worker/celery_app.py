from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

# Ensure .env is loaded
load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")
load_dotenv()

from celery import Celery
from celery.signals import worker_ready, worker_shutdown

from apps.api.app.middleware.metrics import ACTIVE_WORKERS

redis_default = "redis://:redis_password_change_me@localhost:6379/0"
broker_url = os.environ.get("CELERY_BROKER_URL", os.environ.get("REDIS_URL", redis_default))
result_backend = os.environ.get("CELERY_RESULT_BACKEND", os.environ.get("REDIS_URL", redis_default))


celery_app = Celery(
    "codelens_worker",
    broker=broker_url,
    backend=result_backend,
    include=["apps.worker.tasks.indexing"],
)

celery_app.conf.task_routes = {
    "apps.worker.tasks.indexing.clone_repository": {"queue": "high"},
    "apps.worker.tasks.indexing.embed_and_index_batch": {"queue": "default"},
    "apps.worker.tasks.indexing.build_dependency_graph": {"queue": "low"},
    "apps.worker.tasks.indexing.finalize_indexing": {"queue": "default"},
    "apps.worker.tasks.indexing.start_indexing_pipeline": {"queue": "high"},
}

celery_app.conf.task_serializer = "json"
celery_app.conf.result_serializer = "json"
celery_app.conf.accept_content = ["json"]
celery_app.conf.result_expires = 3600


@worker_ready.connect  # type: ignore[untyped-decorator]
def on_worker_ready(**kwargs: object) -> None:
    """Increment active worker metric and start Prometheus metrics exporter if configured."""
    ACTIVE_WORKERS.inc()
    try:
        from prometheus_client import start_http_server

        start_http_server(9090)
    except Exception as exc:
        import structlog

        structlog.get_logger("codelens.worker").debug(
            "metrics_server_start_skipped", error=str(exc)
        )


@worker_shutdown.connect  # type: ignore[untyped-decorator]
def on_worker_shutdown(**kwargs: object) -> None:
    """Decrement active worker metric on worker shutdown."""
    ACTIVE_WORKERS.dec()


@celery_app.task(name="health_check")  # type: ignore[untyped-decorator]
def worker_health_check() -> dict[str, str]:
    """Celery task to verify worker responsiveness."""
    return {"status": "ok", "service": "celery_worker"}
