# Stage 1: Install dependencies
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
COPY packages/ packages/
RUN pip install --user --no-cache-dir -e packages/core -e packages/ast-parser -e packages/llm-gateway

COPY apps/api/requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Minimal production image
FROM python:3.12-slim AS production

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /root/.local
COPY packages/ /packages/
COPY apps/api/ .

ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app:/packages/core/src:/packages/ast-parser/src:/packages/llm-gateway/src:$PYTHONPATH
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
