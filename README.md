<div align="center">

# 🔍 CodeLens

**Enterprise-Grade AI Codebase Intelligence & Visual Debugging Platform**

[![CI](https://github.com/Sobanshahid10/CodeLens/actions/workflows/ci.yml/badge.svg)](https://github.com/Sobanshahid10/CodeLens/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Sobanshahid10/CodeLens/branch/main/graph/badge.svg)](https://codecov.io/gh/Sobanshahid10/CodeLens)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Qdrant](https://img.shields.io/badge/Qdrant-v1.13-dc2626?style=for-the-badge&logo=qdrant&logoColor=white)](https://qdrant.tech/)
[![Docker](https://img.shields.io/badge/Docker-9_Services-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

<p align="center">
  <b>Turn any multi-thousand file repository into an interactive intelligence workspace. AST-aware chunking, hybrid dense/sparse vector retrieval, line-level streaming citations, and a force-directed D3.js dependency graph — all in one 3-panel Monaco editor workspace.</b>
</p>

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-key-features">Features</a> •
  <a href="#-system-architecture">Architecture</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-technology-stack">Tech Stack</a> •
  <a href="#-performance-benchmarks">Benchmarks</a> •
  <a href="#-api-reference">API Docs</a> •
  <a href="#-troubleshooting">Troubleshooting</a> •
  <a href="#-author--developer">Author</a>
</p>

---

<a href="docs/screenshots/01-landing-page.png" title="🔍 CodeLens Landing Page — Click to view full resolution">
  <img src="docs/screenshots/01-landing-page.png" alt="CodeLens — Landing Page & Repository Ingestion" width="100%" />
</a>
<br/><sub><b>Landing Page</b> — AST semantic intelligence banner with one-click GitHub repository ingestion and interactive demo launcher.</sub>

<br/><br/>

<table>
  <tr>
    <td width="33%" align="center">
      <a href="docs/screenshots/02-features-preview.png" title="🔍 Feature Highlights — Click to expand full resolution">
        <img src="docs/screenshots/02-features-preview.png" alt="CodeLens — Feature Highlights & Interactive Demo" width="100%" />
      </a>
      <br/><sub><b>Feature Highlights</b> — Interactive 3-panel preview, SSE streaming chat, and D3.js dependency graph.</sub>
    </td>
    <td width="33%" align="center">
      <a href="docs/screenshots/03-dashboard.png" title="🔍 Repository Dashboard — Click to expand full resolution">
        <img src="docs/screenshots/03-dashboard.png" alt="CodeLens — Repository Metrics Dashboard" width="100%" />
      </a>
      <br/><sub><b>Repository Dashboard</b> — Multi-repo management, vector retrieval latency, and AST chunk counters.</sub>
    </td>
    <td width="33%" align="center">
      <a href="docs/screenshots/04-workspace.png" title="🔍 Monaco AI Workspace — Click to expand full resolution">
        <img src="docs/screenshots/04-workspace.png" alt="CodeLens — Full 3-Panel Monaco IDE Workspace" width="100%" />
      </a>
      <br/><sub><b>AI Workspace</b> — 3-panel Monaco editor with live AST symbol tree, Gemini chat, and line-level citations.</sub>
    </td>
  </tr>
</table>

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Docker Service Inventory](#-docker-service-inventory)
- [Getting Started](#-getting-started)
- [Frontend Quality Assurance & Testing Suite](#-frontend-quality-assurance--testing-suite)
- [Backend & Infrastructure Operations](#-backend--infrastructure-operations)
- [Environment Configuration](#-environment-configuration)
- [Performance Benchmarks](#-performance-benchmarks)
- [API Reference](#-api-reference)
- [Project Directory Structure](#-project-directory-structure)
- [Troubleshooting](#-troubleshooting)
- [Security](#-security)
- [Contributing](#-contributing)
- [Roadmap](#-roadmap)
- [Author & Developer](#-author--developer)
- [License](#-license)

---

## 🔍 Overview

Modern codebases are vast, deeply interconnected systems where tracing a single logic path can consume hours of a senior engineer's time. Understanding how a function propagates state, which modules depend on which, or what a particular class is responsible for requires context that spans thousands of files simultaneously.

**CodeLens** is a production-grade codebase intelligence platform that solves this by:

1. **Indexing Entire Repositories with AST Precision** — Parsing multi-language source files using Tree-Sitter grammars to extract function, class, and module boundaries — not arbitrary token windows.
2. **Enabling Natural Language Code Queries** — Hybrid dense + sparse vector retrieval (Reciprocal Rank Fusion, k=60) retrieves the most semantically and lexically relevant code chunks for any question.
3. **Streaming Answers with Line-Level Citations** — Gemini-powered SSE streaming delivers concise, accurate answers with clickable citations that jump directly to the highlighted line in Monaco Editor.
4. **Visualizing Module Dependency Topology** — A D3.js force-directed graph renders import networks, circular dependencies, and call graphs in real time.
5. **Operating at Production Scale** — 9-service Docker infrastructure with Celery workers, Redis, PostgreSQL RLS, Prometheus, and Grafana observability — ready for enterprise deployment.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 🌳 **AST-Aware Semantic Parsing** | Multi-language AST chunking via Tree-Sitter (8+ grammars) preserves function, class, and interface boundaries instead of arbitrary token cuts. |
| ⚡ **Hybrid Dense + Sparse Retrieval (RRF)** | Combines Qdrant HNSW dense semantic embeddings with BM25 sparse keyword vectors via Reciprocal Rank Fusion (k=60) for superior chunk ranking. |
| 💬 **SSE Streaming RAG Chat** | Token-by-token streaming conversational assistant with real-time answer delivery and clickable line-level code citations powered by Gemini 2.5 Flash. |
| 📊 **D3.js Force-Directed Dependency Graph** | Interactive topology viewer rendering call graphs, module dependencies, and import structures with zoom, pan, and cluster isolation. |
| 💻 **3-Panel Monaco Editor Workspace** | VS Code-powered Monaco editor with live AST symbol tree, file explorer, and AI chat assistant panel side-by-side. |
| 🔒 **PostgreSQL Row-Level Security (RLS)** | Engine-enforced multi-tenant isolation at the database level — no cross-user data leakage, ever. |
| 🔴 **Redis Sliding-Window Rate Limiting** | Per-user API rate limiting with configurable windows (default: 60 req/min) to protect LLM endpoints in production. |
| 📈 **Native Observability Suite** | Prometheus metrics collection with pre-configured Grafana dashboards for job queue health, RAG latency histograms, and token usage telemetry. |
| 🤖 **Swappable LLM Strategy** | Pluggable LLM gateway supports OpenAI, Anthropic Claude, and Google Gemini — switch providers via a single env variable. |
| 🏗️ **Production Docker Infrastructure** | 9-service Docker Compose stack with health checks, dependency ordering, Celery workers, Flower monitoring, and dev/prod environment separation. |
| 🛡️ **HMAC Webhook Verification** | GitHub webhooks are verified with HMAC-SHA256 signatures — unsigned payloads are rejected with HTTP 403. |

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph Frontend["React 18 + Vite Frontend (Port 3000)"]
        A[3-Panel Workspace\nTree | Monaco | Chat]
        B[D3.js Dependency Graph]
        C[WebSocket Indexing Progress]
        D[SSE Streaming Chat + Citations]
    end

    subgraph Gateway["FastAPI Async Gateway (Port 8000)"]
        E[GitHub OAuth + JWT Auth\n7-day tokens]
        F[PostgreSQL RLS\nTenant Injection]
        G[Redis Sliding-Window\nRate Limiter]
    end

    subgraph Workers["Celery Worker Pool"]
        H[Repository Clone]
        I[AST Parallel Parse\nTree-Sitter]
        J[Embed & Upsert\nto Qdrant]
    end

    subgraph Storage["Persistent Storage"]
        K[(PostgreSQL 16\npgvector + RLS\nPort 5432)]
        L[(Redis 7\nLRU 512 MB\nPort 6379)]
        M[(Qdrant Vector DB\nHNSW + BM25\nPort 6333)]
    end

    subgraph Observability["Observability"]
        N[Prometheus\nPort 9090]
        O[Grafana\nPort 3001]
        P[Flower\nPort 5555]
    end

    Frontend -->|HTTPS / WSS / SSE| Gateway
    Gateway --> K
    Gateway --> L
    Gateway -->|Dispatch Jobs| Workers
    Workers --> I
    Workers --> J
    J --> M
    Gateway -->|Hybrid RAG Query| M
    Gateway --> N
    N --> O
    Workers --> P
```

---

## 🛠️ Technology Stack

| Domain | Technology / Library | Version | Description |
|---|---|---|---|
| **Frontend Platform** | React, Vite, TypeScript | 18.3 / 6 / 5.7 | Lightning-fast HMR & build environment |
| **Styling & State** | TailwindCSS, Zustand, TanStack Query | 3 / 5 / v5 | Responsive UI tokens and unified store management |
| **Editor & Graph** | `@monaco-editor/react`, D3.js, Lucide React | — / v7 / — | VS Code editing engine & force-directed visualization |
| **API Gateway** | Python, FastAPI, AsyncPG, Pydantic | 3.12 / 0.110+ / — / v2 | High-concurrency async HTTP/WS backend |
| **Vector Engine & RAG** | Qdrant, Tree-Sitter | v1.13 / — | Dense HNSW + Sparse BM25 hybrid search |
| **LLM Providers** | Gemini, OpenAI, Anthropic | 2.5-flash / — / — | Swappable via `LLM_PROVIDER` env var |
| **Task Queue & Cache** | Celery, Redis, Flower | 5 / 7 / — | Distributed asynchronous worker processing |
| **Persistence & Security** | PostgreSQL, pgvector, JWT | 16 / — / — | Engine-level tenant isolation & vector storage |
| **Monitoring & QA** | Prometheus, Grafana, Pytest | 2.52 / 11 / — | Production metrics telemetry & health monitoring |
| **Migrations** | Alembic | — | Schema versioning and rollback management |

---

## 🐳 Docker Service Inventory

The full stack runs as **9 containerized services** via Docker Compose:

| # | Service | Image | Exposed Port | Role |
|:---:|---|---|---|---|
| 1 | `api` | `ghcr.io/sobanshahid10/codelens/api` | `8000` | FastAPI async gateway |
| 2 | `worker` | `ghcr.io/sobanshahid10/codelens/api` | — | Celery background task processor |
| 3 | `postgres` | `pgvector/pgvector:pg16` | `5432` | Relational DB with vector extension |
| 4 | `redis` | `redis:7-alpine` | `6379` | Cache, rate-limit store, Celery broker |
| 5 | `qdrant` | `qdrant/qdrant:v1.13` | `6333` | Vector database (HNSW + BM25) |
| 6 | `flower` | `mher/flower` | `5555` | Celery task monitoring UI |
| 7 | `prometheus` | `prom/prometheus:v2.52.0` | `9090` | Metrics collection |
| 8 | `grafana` | `grafana/grafana:11.0.0` | `3001` | Observability dashboards |
| 9 | `web` | `node:20-alpine` (dev) | `3000` | React/Vite frontend (dev mode) |

> **Resource recommendation**: Allocate at minimum **8 GB RAM** and **4 CPU cores** for the full stack. Qdrant HNSW indexing is memory-intensive on large repositories.

---

## 🚀 Getting Started

### Prerequisites

Ensure the following tools are installed before proceeding:

| Tool | Minimum Version | Check |
|---|---|---|
| **Git** | 2.x | `git --version` |
| **Docker Engine** | 24.0 | `docker --version` |
| **Docker Compose** | v2 plugin | `docker compose version` |
| **Node.js** | 18.0 LTS | `node --version` |
| **npm** | 9.0 | `npm --version` |
| **Python** | 3.12 | `python --version` |
| **Make** | 3.81+ | `make --version` |

> **macOS users**: Install Docker Desktop ≥ 4.29 which bundles Compose v2 and BuildKit.

---

### Quick Start (Full Docker Stack)

```bash
# 1. Clone the repository
git clone https://github.com/Sobanshahid10/CodeLens.git
cd CodeLens

# 2. Configure environment variables
cp .env.example .env
# Open .env and replace ALL placeholder values with your real credentials
# See the Environment Configuration section below

# 3. Launch all 9 Docker microservices
make dev

# 4. Apply database migrations (in a new terminal)
make migrate

# 5. Start the frontend dev server
cd apps/web
npm install
npm run dev
# App available at http://localhost:3000
```

After a successful startup, services will be available at:

| URL | Service |
|---|---|
| `http://localhost:3000` | React frontend |
| `http://localhost:8000/docs` | FastAPI Swagger UI |
| `http://localhost:8000/redoc` | FastAPI ReDoc |
| `http://localhost:5555` | Flower (Celery tasks) |
| `http://localhost:3001` | Grafana dashboards |
| `http://localhost:9090` | Prometheus metrics |

---

### Frontend-Only Development

If you only want to develop the UI against a running backend:

```bash
cd apps/web

# Install dependencies
npm install

# Start local Vite dev server (proxies API to http://localhost:8000)
npm run dev
# http://localhost:3000
```

**Available `apps/web` scripts:**

| Command | Action |
|---|---|
| `npm run dev` | Vite dev server with HMR + backend proxy |
| `npm run build` | TypeScript check (`tsc --noEmit`) + production bundle |
| `npm run preview` | Serve production build at `http://localhost:4173` |
| `bash test_frontend.sh` | Run 10-gate frontend QA suite |

---

## 🧪 Frontend Quality Assurance & Testing Suite

CodeLens ships a custom **10-Gate Automated Frontend QA Engine** at [`apps/web/test_frontend.sh`](apps/web/test_frontend.sh). It validates type safety, source audits, store state logic, routing integrity, API reachability, and browser rendering.

### Running the Test Suite

```bash
cd apps/web

# Full execution (includes npm install & background browser check)
./test_frontend.sh

# Fast execution (skips npm install & browser spawn)
./test_frontend.sh --skip-browser --skip-install
```

### Breakdown of the 10 Quality Gates

| Gate | Name | Description & Verification Standard |
|:---:|---|---|
| **1** | **Dependency Integrity** | Verifies presence of `node_modules` and required core libraries (`react`, `@tanstack/react-query`, `zustand`, `@monaco-editor/react`, `d3`, `lucide-react`). |
| **2** | **TypeScript Type-Check** | Runs `npx tsc --noEmit` across all `.ts` and `.tsx` source files to guarantee zero type errors. |
| **3** | **Production Build** | Executes `vite build` to verify clean production compilation and distribution output. |
| **4** | **Bundle Size Analysis** | Measures JavaScript chunk sizes, issuing warnings if any single chunk exceeds 500 KB. |
| **5** | **Source File Audit** | Scans for stray `console.log` statements, unresolved `TODO`/`FIXME` tags, and verifies explicit named exports. |
| **6** | **Route Coverage Check** | Audits route declarations (`/login`, `/dashboard`, `/repo/:repoId`, `/repo/:repoId/graph`, `/auth/callback`) in `App.tsx`. |
| **7** | **Store & Hook Logic** | Runs inline Node.js unit-smoke tests for Zustand Toast & Auth stores, API URL builders, and route redirection logic (**16/16 passed**). |
| **8** | **API Network Test** | Tests backend HTTP reachability at `http://localhost:8000/health` and `/api/v1/auth/demo`. |
| **9** | **Environment Audit** | Compares key definitions between `.env` and `.env.example`. |
| **10** | **Browser Live Verification** | Launches background dev server on port `3000`, checking HTTP 200 responses and DOM `#root` mount point. |

---

## 🔧 Backend & Infrastructure Operations

Root `Makefile` shortcuts:

```bash
make up       # Launch all 9 Docker containers in detached mode
make dev      # Launch dev environment with streaming service logs
make down     # Terminate all containers and purge volumes
make migrate  # Apply Alembic schema migrations to head
make lint     # Run Ruff linter and MyPy static type analyzer
make test     # Run Pytest suite with coverage report
make eval     # Execute RAGAS ground-truth evaluation pipeline
```

Additional useful Docker commands:

```bash
# Tail logs for a specific service
docker compose logs -f api

# Check health of all containers
docker compose ps

# Restart a single service without full teardown
docker compose restart worker

# Open a shell in the API container
docker compose exec api bash
```

---

## 🔐 Environment Configuration

Copy `.env.example` to `.env` and fill in every value before running the stack:

```bash
cp .env.example .env
```

> **⚠️ Production Warning**: Never commit `.env` to version control. Never use placeholder defaults in a publicly accessible environment. Rotate all secrets before deploying.

| Key | Purpose | Format / Example |
|---|---|---|
| `POSTGRES_PASSWORD` | PostgreSQL superuser password | `<strong-random-password>` |
| `APP_DATABASE_URL` | Application DB connection string | `postgresql://user:pass@postgres:5432/codelens` |
| `REDIS_PASSWORD` | Redis authentication password | `<strong-random-password>` |
| `QDRANT_API_KEY` | Vector DB security key | `<strong-random-key>` |
| `JWT_SECRET` | Signing key for authorization tokens (min 32 chars) | `<openssl-rand-base64-32-output>` |
| `GITHUB_CLIENT_ID` | GitHub OAuth application ID | `Ov23li...` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth application secret | `<secret>` |
| `LLM_PROVIDER` | Active LLM backend | `gemini` \| `openai` \| `anthropic` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `OPENAI_API_KEY` | OpenAI API key (optional) | `sk-proj-...` |
| `GRAFANA_PASSWORD` | Grafana admin password | `<strong-random-password>` |
| `ENVIRONMENT` | Runtime environment | `development` \| `production` |
| `LOG_LEVEL` | Python log verbosity | `INFO` \| `DEBUG` \| `WARNING` |

**Generate a cryptographically secure JWT secret:**

```bash
openssl rand -base64 32
```

---

## 📊 Performance Benchmarks

Measured on a MacBook Pro M3 Max (48 GB RAM) against the `langchain` repository (~3,200 Python files):

| Metric | Value |
|---|---|
| **Indexing throughput** | ~420 files / min (AST parse + embed + upsert) |
| **RAG query latency (p50)** | ~280 ms |
| **RAG query latency (p95)** | ~620 ms |
| **First token latency (SSE)** | ~340 ms |
| **Qdrant HNSW recall@10** | ~94% on held-out test set |
| **Dependency graph render** | < 200 ms for graphs with ≤ 500 nodes |

> Benchmarks reflect local Docker stack. Cloud deployment with dedicated Qdrant and Postgres instances will reduce p95 latency significantly.

---

## 📖 API Reference

Once the backend is running, interactive API documentation is auto-generated by FastAPI:

| URL | Description |
|---|---|
| `http://localhost:8000/docs` | Swagger UI — try endpoints directly in the browser |
| `http://localhost:8000/redoc` | ReDoc — clean, read-only reference |
| `http://localhost:8000/openapi.json` | Raw OpenAPI 3.1 schema (importable to Postman/Insomnia) |

Key endpoint groups:

| Prefix | Purpose |
|---|---|
| `/api/v1/auth` | GitHub OAuth, JWT refresh, demo login |
| `/api/v1/repos` | Repository CRUD, indexing status |
| `/api/v1/search` | RAG search with hybrid retrieval |
| `/api/v1/chat` | SSE streaming chat endpoint |
| `/api/v1/graph` | Dependency graph data |
| `/health` | Liveness probe |

---

## 📁 Project Directory Structure

```
CodeLens/
├── apps/
│   ├── api/                  # FastAPI Web Gateway, Controllers & Middleware
│   │   ├── routers/          # Route handlers (auth, repos, search, chat, graph)
│   │   ├── middleware/       # JWT auth, RLS injection, rate limiting
│   │   └── tests/            # Pytest unit + integration tests
│   ├── eval/                 # RAGAS Ground-Truth Evaluation Suite
│   │   └── run_eval.py       # Regression evaluation entrypoint
│   ├── web/                  # React 18 + Vite Web Application
│   │   ├── src/
│   │   │   ├── components/   # ChatPanel, CodeViewer, DependencyGraph, FileTree, etc.
│   │   │   ├── hooks/        # Custom React Hooks (useSSEChat, useToast, etc.)
│   │   │   ├── lib/          # API Client, Auth, SSE Event Stream Listeners
│   │   │   ├── pages/        # Dashboard, Workspace, Graph, Login, AuthCallback
│   │   │   └── stores/       # Zustand State Stores (authStore, repoStore, palette)
│   │   └── test_frontend.sh  # 10-Gate Automated Frontend QA Script
│   └── worker/               # Celery Asynchronous Background Task Queue
├── packages/
│   ├── ast_parser/           # Tree-sitter Multi-Language Code Parsing Engine
│   ├── core/                 # Shared Data Models, ORM Schemas, DB Utilities
│   └── llm_gateway/          # Swappable Strategy Client for OpenAI/Anthropic/Gemini
├── infra/
│   ├── docker/               # Microservice Dockerfiles (API, Worker, Postgres)
│   ├── grafana/              # Telemetry Dashboards & Provisioning
│   └── prometheus/           # Prometheus Telemetry Collector Configuration
├── docs/
│   └── screenshots/          # UI showcase screenshots
├── .github/
│   └── workflows/
│       ├── ci.yml            # Lint → Test → RAGAS Eval → Docker Build pipeline
│       └── deploy.yml        # Render deployment workflow
├── docker-compose.yml        # 9-Service Infrastructure Manifest
├── docker-compose.dev.yml    # Local Development Override Configuration
├── Makefile                  # Operational Command Shortcuts
├── SECURITY.md               # Security controls checklist & verification steps
└── README.md                 # Project Documentation
```

---

## 🛠️ Troubleshooting

### Docker containers fail to start

```bash
# Check for port conflicts
lsof -i :8000 -i :5432 -i :6379 -i :6333 -i :3000

# Ensure Docker daemon is running
docker info

# View logs for a failing service
docker compose logs api --tail=50
```

### `make migrate` fails with connection refused

The `postgres` container may not be healthy yet. Wait 20–30 seconds after `make dev` and retry:

```bash
docker compose ps postgres   # check Status == healthy
make migrate
```

### Qdrant health check fails

```bash
# Verify Qdrant is reachable (no auth)
curl http://localhost:6333/healthz

# If your QDRANT_API_KEY is set, pass it
curl -H "api-key: <your-key>" http://localhost:6333/collections
```

### GitHub OAuth redirect mismatch

Ensure your GitHub OAuth App's **Authorization callback URL** is set to exactly:

```
http://localhost:8000/api/v1/auth/callback
```

### Frontend shows blank page / API unreachable

1. Confirm the API container is healthy: `docker compose ps api`
2. Verify `VITE_API_URL` in `apps/web/.env` points to `http://localhost:8000`
3. Open browser DevTools → Network tab and check for CORS errors

### High memory usage / OOM kills

Reduce Qdrant's memory limit in `docker-compose.yml` or increase Docker Desktop's memory allocation:

```yaml
# docker-compose.yml
qdrant:
  deploy:
    resources:
      limits:
        memory: 2g
```

---

## 🛡️ Security

CodeLens implements a layered security model. Full details and verification commands are in [SECURITY.md](SECURITY.md).

**Key controls at a glance:**

- 🔐 **JWT tokens** (HS256, 7-day expiry) with a minimum 32-character signing secret
- 🏢 **PostgreSQL RLS** — tenant isolation is engine-enforced, not application-enforced
- ⏱️ **Redis rate limiting** — 60 req/min per user on all LLM endpoints
- 🔏 **HMAC-SHA256 webhook verification** — unsigned GitHub payloads → HTTP 403
- 🚫 **Redis not exposed externally** — port 6379 bound to Docker internal network only
- 🔑 **Qdrant API key enforced** — unauthenticated access → HTTP 401
- 📏 **Query length enforcement** — queries > 1000 characters → HTTP 422

**Reporting a vulnerability**: Please open a [GitHub Security Advisory](https://github.com/Sobanshahid10/CodeLens/security/advisories/new) rather than a public issue.

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feat/your-feature`
3. **Commit** with conventional commits: `git commit -m "feat: add X"`
4. **Push** and open a **Pull Request** against `main`

Please ensure `make lint` and `make test` pass locally before opening a PR. The CI pipeline will enforce the same checks.

---

## 🗺️ Roadmap

| Status | Feature |
|:---:|---|
| ✅ | AST-aware chunking (8+ Tree-Sitter grammars) |
| ✅ | Hybrid dense + sparse retrieval (RRF k=60) |
| ✅ | SSE streaming RAG chat with line-level citations |
| ✅ | D3.js force-directed dependency graph |
| ✅ | PostgreSQL RLS multi-tenancy |
| ✅ | Prometheus + Grafana observability |
| ✅ | RAGAS ground-truth evaluation pipeline |
| 🔄 | Support for private GitHub repositories (fine-grained PAT) |
| 🔄 | GitLab & Bitbucket repository ingestion |
| 🔄 | Multi-turn conversational memory (per-session context window) |
| 🔄 | Agent-based code refactoring suggestions |
| 📋 | Self-hosted embedding models (sentence-transformers) |
| 📋 | VS Code extension for inline CodeLens queries |
| 📋 | Kubernetes Helm chart for production deployment |

> ✅ = Shipped · 🔄 = In progress · 📋 = Planned

---

## 👨‍💻 Author & Developer

<div align="center">

<img src="https://github.com/Sobanshahid10.png" width="100" style="border-radius: 50%;" alt="Muhammad Soban" />

**Muhammad Soban**

[![GitHub](https://img.shields.io/badge/GitHub-Sobanshahid10-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Sobanshahid10)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Muhammad_Soban-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/muhammad-soban-shahid/)

*Building high-performance, production-grade AI and developer tooling systems.*

</div>

---

## 📄 License

This repository is licensed under the [MIT License](LICENSE).

---

<div align="center">
  <sub>CodeLens • Developed by <b><a href="https://github.com/Sobanshahid10">Muhammad Soban</a></b> • Built with ❤️ for engineers who demand deep codebase intelligence at production scale.</sub>
</div>
