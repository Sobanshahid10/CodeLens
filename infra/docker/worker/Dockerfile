# Stage 1: Build dependencies
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
COPY packages/ packages/
RUN pip install --user --no-cache-dir -e packages/core -e packages/ast-parser -e packages/llm-gateway

COPY apps/worker/requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Worker runtime
FROM python:3.12-slim AS production

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /root/.local
COPY packages/ /packages/
COPY apps/ /app/apps/

ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app:/packages/core/src:/packages/ast-parser/src:/packages/llm-gateway/src:$PYTHONPATH
ENV PYTHONUNBUFFERED=1

CMD ["celery", "-A", "apps.worker.celery_app", "worker", "--loglevel=info", "-Q", "high,default,low", "--concurrency=4"]
