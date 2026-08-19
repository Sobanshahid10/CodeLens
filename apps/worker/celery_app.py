from __future__ import annotations

import os

from celery import Celery

broker_url = os.environ.get(
    "CELERY_BROKER_URL", os.environ.get("REDIS_URL", "redis://localhost:6379/0")
)
result_backend = os.environ.get(
    "CELERY_RESULT_BACKEND", os.environ.get("REDIS_URL", "redis://localhost:6379/0")
)

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


@celery_app.task(name="health_check")  # type: ignore[untyped-decorator]
def worker_health_check() -> dict[str, str]:
    """Celery task to verify worker responsiveness."""
    return {"status": "ok", "service": "celery_worker"}
