import os

from celery import Celery

broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
result_backend = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

celery_app = Celery(
    "codelens_worker",
    broker=broker_url,
    backend=result_backend,
    include=[],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    result_expires=3600,
    task_routes={
        "apps.worker.tasks.index.*": {"queue": "high"},
        "apps.worker.tasks.embed.*": {"queue": "default"},
        "apps.worker.tasks.cleanup.*": {"queue": "low"},
    },
    task_track_started=True,
    worker_prefetch_multiplier=1,
)

@celery_app.task(name="health_check")  # type: ignore[untyped-decorator]
def worker_health_check() -> dict[str, str]:
    """Celery task to verify worker responsiveness."""
    return {"status": "ok", "service": "celery_worker"}
