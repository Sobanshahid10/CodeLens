from fastapi.testclient import TestClient

from apps.api.app.main import app

client = TestClient(app)


def test_health_check_endpoint() -> None:
    """Verify the /health endpoint returns 200 OK and healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "codelens-api"


def test_metrics_endpoint() -> None:
    """Verify Prometheus /metrics endpoint is responding."""
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "codelens_http_requests_total" in response.text
