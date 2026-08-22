from fastapi.testclient import TestClient

from apps.api.app.main import app
from apps.api.app.middleware.metrics import (
    ACTIVE_WORKERS,
    INDEXING_DURATION,
    INDEXING_JOBS_TOTAL,
    LLM_REQUEST_LATENCY,
    LLM_TOKENS_TOTAL,
    REQUEST_COUNT,
    REQUEST_LATENCY,
    RETRIEVAL_LATENCY,
)

client = TestClient(app)


def test_all_day5_metrics_defined_and_exported() -> None:
    """Verify all 8 Day 5 Prometheus metrics are defined and exposed on /metrics."""
    # Warm up metric observations
    REQUEST_COUNT.labels(method="GET", endpoint="/health", status_code="200").inc()
    REQUEST_LATENCY.labels(method="GET", endpoint="/health").observe(0.05)
    RETRIEVAL_LATENCY.observe(0.12)
    LLM_TOKENS_TOTAL.labels(provider="openai", model="gpt-4o", token_type="prompt").inc(120)
    LLM_TOKENS_TOTAL.labels(provider="openai", model="gpt-4o", token_type="completion").inc(45)
    LLM_REQUEST_LATENCY.labels(provider="openai", model="gpt-4o").observe(1.2)
    INDEXING_JOBS_TOTAL.labels(status="running").inc()
    INDEXING_JOBS_TOTAL.labels(status="success").inc()
    INDEXING_DURATION.observe(45.0)
    ACTIVE_WORKERS.set(2)

    response = client.get("/metrics")
    assert response.status_code == 200
    metrics_text = response.text

    expected_metrics = [
        "codelens_http_requests_total",
        "codelens_http_request_duration_seconds",
        "codelens_retrieval_duration_seconds",
        "codelens_llm_tokens_total",
        "codelens_llm_request_duration_seconds",
        "codelens_indexing_jobs_total",
        "codelens_indexing_duration_seconds",
        "codelens_active_celery_workers",
    ]

    for metric_name in expected_metrics:
        assert metric_name in metrics_text, f"Metric {metric_name} not found in /metrics output"
