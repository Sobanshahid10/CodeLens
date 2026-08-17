# CodeLens — S-Tier 5-Day Production Implementation Plan

> **Mission:** Build a complete, production-deployed, enterprise-grade AI codebase intelligence platform from zero to cloud in 5 days. Every system, component, and decision in this plan is modeled after how senior engineers at Anthropic, Cohere, and Sourcegraph ship real products.

---

## 📋 Project Identity Card

| Property | Value |
|---|---|
| **Project Name** | CodeLens |
| **Category** | AI Developer Tooling / Enterprise Platform |
| **Difficulty Tier** | S-Tier (Senior Full-Stack + ML Engineering) |
| **Timeline** | 5 Days (40–50 hours total) |
| **Tech Domain** | Distributed Systems · RAG · AST Parsing · Graph Viz · MLOps |
| **Deployment Target** | Docker Compose (local) → Railway / Render (cloud) |
| **Primary Language** | Python 3.12 (backend) · TypeScript 5 (frontend) |
| **LLM Support** | OpenAI · Anthropic · Google Gemini (hot-swappable) |

---

## 🧠 What You Will Learn (Master-Level Skills)

### Retrieval-Augmented Generation (RAG)
- Why naive text chunking destroys retrieval quality and how AST solves it
- Dense vector search using HNSW graphs — tuning M, efConstruction, efSearch for recall ≥ 0.985
- Sparse BM25 retrieval for exact symbol-name lookups
- Reciprocal Rank Fusion (RRF): score(d) = Σ 1 / (k + rank(d)) where k=60
- How to stream LLM responses via Server-Sent Events (SSE) with citation tracking

### Abstract Syntax Tree Engineering
- How compilers represent source code as trees — why grep is wrong for code analysis
- tree-sitter architecture: incremental parser, language grammars, traversal APIs
- Extracting functions, classes, signatures, docstrings, and complexity across 8 languages
- Constructing a dependency graph from import and call-site relationships

### Distributed Systems & Async Architecture
- Decoupling slow workloads from HTTP request cycles using Celery + Redis
- Celery task execution model: broker, workers, result backend, beat scheduler
- WebSocket bidirectional progress streaming during long-running background jobs

### Database Design & Multi-Tenancy
- PostgreSQL Row-Level Security (RLS) for hard tenant isolation at the engine level
- pgvector extension, JSONB for flexible metadata, Alembic zero-downtime migrations

### LLM Provider Abstraction
- Strategy Pattern for OpenAI, Anthropic, Gemini — hot-swappable via .env

### Frontend Engineering
- React 18 Concurrent features, SSE consumption, D3.js force-directed graphs
- Monaco Editor integration with dynamic line highlighting

### MLOps & Evaluation
- RAGAS: faithfulness, answer_relevancy, context_recall, MRR@10, NDCG@10
- CI-gated evaluation harness blocking deployment on quality regression

---

## 🏗️ System Architecture

```
                    ┌─────────────────────────────────────┐
                    │           React 18 Frontend          │
                    │  Monaco Editor · D3.js Graph · SSE  │
                    └──────────────┬──────────────────────┘
                                   │ HTTP / WS / SSE
                    ┌──────────────▼──────────────────────┐
                    │         FastAPI (Async Core)         │
                    │  Auth · Search · Chat · Graph · WS  │
                    └──────┬───────────────┬──────────────┘
                           │               │
           ┌───────────────▼──┐   ┌────────▼────────────┐
           │  Celery Workers  │   │    LLM Gateway      │
           │  Clone→Parse     │   │  OpenAI/Anthropic/  │
           │  →Embed→Index    │   │      Gemini         │
           └───────┬──────────┘   └─────────────────────┘
                   │
     ┌─────────────┼───────────────────┐
     │             │                   │
┌────▼────┐  ┌─────▼─────┐  ┌─────────▼──────┐
│  Redis  │  │  Qdrant   │  │  PostgreSQL 16  │
│ (Queue) │  │(Vector DB)│  │  (RLS + JSONB) │
└─────────┘  └───────────┘  └────────────────┘
                                       │
                    ┌──────────────────▼──────────────────┐
                    │         Prometheus + Grafana         │
                    │   Metrics · Dashboards · Alerting   │
                    └─────────────────────────────────────┘
```

---

## 📁 Monorepo Structure

```
CodeLens/
├── apps/
│   ├── api/                        ← FastAPI application
│   │   ├── app/
│   │   │   ├── main.py             ← App factory + lifespan
│   │   │   ├── config.py           ← Pydantic Settings
│   │   │   ├── routes/             ← auth, repos, search, chat, graph, webhooks
│   │   │   ├── services/           ← retrieval.py, indexing.py, graph.py
│   │   │   ├── middleware/         ← auth, logging, metrics, rate_limit
│   │   │   ├── db/                 ← models.py, session.py, migrations
│   │   │   └── workers/            ← celery_app.py, task imports
│   │   ├── alembic/                ← Database migrations
│   │   └── tests/                  ← unit/ + integration/
│   ├── worker/
│   │   └── tasks/
│   │       ├── indexing.py         ← clone → parse → embed → upsert
│   │       ├── embedding.py        ← batched embedding pipeline
│   │       └── graph.py            ← dependency edge extraction
│   ├── web/                        ← React 18 + Vite + TypeScript
│   │   └── src/
│   │       ├── components/         ← ChatPanel, GraphView, FileTree, Monaco
│   │       ├── pages/              ← Login, Dashboard, Workspace, Graph
│   │       ├── hooks/              ← useSSEChat, useWebSocket, useSearch
│   │       ├── lib/                ← api.ts, sse.ts, auth.ts
│   │       └── stores/             ← Zustand state slices
│   └── eval/
│       ├── run_eval.py             ← RAGAS evaluation harness
│       └── datasets/               ← Ground-truth Q&A JSON files
├── packages/
│   ├── core/                       ← Shared Pydantic models + enums
│   ├── ast-parser/                 ← Multi-language tree-sitter engine
│   └── llm-gateway/                ← Provider abstraction
├── infra/
│   ├── docker/                     ← Dockerfiles (api, worker, web)
│   ├── grafana/                    ← Dashboard JSON + provisioning
│   └── prometheus/                 ← prometheus.yml + alert rules
├── .github/
│   └── workflows/
│       ├── ci.yml                  ← lint → test → eval → build
│       └── deploy.yml              ← Push to registry + deploy
├── docker-compose.yml              ← Full 9-service stack
├── docker-compose.dev.yml          ← Dev overrides (hot-reload)
├── Makefile                        ← make up / dev / test / eval / migrate
├── pyproject.toml                  ← Ruff + Mypy + Pytest unified config
├── .env.example                    ← All required env vars documented
├── PLAN.md                         ← This file
└── README.md
```

---

## ⚙️ Full Service Stack

| Service | Image | Port | Purpose |
|---|---|---|---|
| api | Custom (FastAPI) | 8000 | REST API + WebSocket + SSE |
| worker | Custom (Celery) | — | Background indexing pipeline |
| beat | Custom (Celery Beat) | — | Scheduled task triggers |
| flower | mher/flower:2.0 | 5555 | Celery task monitor |
| postgres | pgvector/pgvector:pg16 | 5432 | Relational DB + vector storage |
| redis | redis:7.2-alpine | 6379 | Message broker + rate limit cache |
| qdrant | qdrant/qdrant:v1.9.2 | 6333 | Vector DB + BM25 sparse search |
| prometheus | prom/prometheus:v2.52.0 | 9090 | Metrics collection |
| grafana | grafana/grafana:11.0.0 | 3001 | Dashboards + alerting |

---

## 📅 DAY 1 — Monorepo, Infrastructure & Data Layer

**Daily Goal:** `make up` starts all 9 services. Migrations run. RLS-enforced schema is live.
**Estimated Time:** 8–9 hours

### Session 1 (Hours 1–2): Root Config & Tooling
**Learning Objective:** `pyproject.toml` replaces setup.py, requirements.txt, .flake8, mypy.ini into one file.

**Build:**
- `pyproject.toml` — unified Ruff, Mypy, Pytest config
- `.env.example` — all env vars documented
- `Makefile` — up, dev, down, migrate, lint, test, eval targets

```toml
[tool.ruff]
line-length = 100
target-version = "py312"
select = ["E", "F", "I", "N", "UP", "ANN", "ASYNC", "S", "TCH"]

[tool.mypy]
strict = true
python_version = "3.12"
plugins = ["pydantic.mypy", "sqlalchemy.ext.mypy.plugin"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["apps/api/tests", "apps/worker/tests", "packages"]
```

### Session 2 (Hours 3–4): Docker Compose — 9 Services
**Learning Objective:** Health checks with `condition: service_healthy` guarantee correct startup order.

**Build:**
- `docker-compose.yml` — all 9 services, health checks, named volumes
- `docker-compose.dev.yml` — hot-reload volume mounts
- `infra/docker/api/Dockerfile` — multi-stage: build → production
- `infra/docker/postgres/init.sql` — RLS policies + extensions

### Session 3 (Hours 5–9): PostgreSQL Schema + RLS
**Learning Objective:** RLS enforces multi-tenancy at the DB engine level. SQL injection still can't cross tenant boundaries.

**Tables:**
```
users               → GitHub identity, plan tier
repositories        → URL, indexing status, progress, last_sha
repository_members  → RBAC join (owner/admin/viewer)
ast_chunks          → Parsed code units with tsvector full-text index
dependency_edges    → Import/call graph adjacency
chat_sessions       → Multi-turn conversation containers
chat_messages       → Messages with citations (JSONB) + latency tracking
webhook_events      → GitHub event audit log
```

**RLS Pattern:**
```sql
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
CREATE POLICY repo_isolation ON repositories
  FOR ALL TO codelens_app
  USING (
    id IN (
      SELECT repository_id FROM repository_members
      WHERE user_id = current_setting('app.current_user_id')::uuid
    )
  );
```

**Day 1 Checklist:**
- [ ] `make up` — all 9 services show healthy
- [ ] `make migrate` — all migrations apply cleanly
- [ ] RLS verified: cross-tenant query returns 0 rows
- [ ] Flower at localhost:5555, Grafana at localhost:3001

---

## 📅 DAY 2 — The Intelligence Engine: AST Parser + LLM Gateway + Qdrant

**Daily Goal:** `python scripts/index_repo.py --url <github-url>` fully indexes a repository.
**Estimated Time:** 9–10 hours

### Session 4 (Hours 1–3): Multi-Language AST Parser
**Learning Objective:** AST-boundary chunking vs sliding windows — why it produces dramatically better embeddings.

**Language Support:**

| Language | Grammar | Node Types Extracted |
|---|---|---|
| Python | tree-sitter-python | function_definition, class_definition |
| TypeScript | tree-sitter-typescript | function_declaration, class_declaration, method_definition |
| JavaScript | tree-sitter-javascript | function_declaration, arrow_function |
| Go | tree-sitter-go | function_declaration, method_declaration |
| Java | tree-sitter-java | method_declaration, class_declaration |
| Rust | tree-sitter-rust | function_item, impl_item, struct_item |
| C++ | tree-sitter-cpp | function_definition, class_specifier |
| Ruby | tree-sitter-ruby | method, class, module |

**ASTChunk structure:**
```python
@dataclass
class ASTChunk:
    chunk_id: str          # SHA256(file_path:start:end)
    file_path: str
    language: str
    node_type: str
    function_name: str | None
    docstring: str | None
    source_code: str
    start_line: int        # 1-indexed
    end_line: int
    imports: list[str]     # File-level imports for context
    cyclomatic_complexity: int

    @property
    def embedding_context(self) -> str:
        # File path + language + name + docstring + imports + source
        # This exact string is sent to the embedding model
        ...
```

### Session 5 (Hours 4–5): LLM Provider Gateway
**Learning Objective:** Strategy Pattern — one interface, three backends. Zero code changes to swap providers.

| Provider | Embedding Model | Dimensions | Chat Model |
|---|---|---|---|
| OpenAI | text-embedding-3-large | 3072 | gpt-4o |
| Anthropic | voyage-code-2 | 1536 | claude-3-5-sonnet-20241022 |
| Gemini | text-embedding-004 | 768 | gemini-1.5-pro |

```bash
# Hot-swap: change one env var, restart
LLM_PROVIDER=anthropic   # was: openai
```

### Session 6 (Hours 6–10): Qdrant + Full Indexing Pipeline
**Learning Objective:** HNSW graph tuning — the biggest performance lever in vector search.

**HNSW Config:**
```python
HnswConfigDiff(
    m=24,             # Max edges per node. Higher = better recall, more memory
    ef_construct=128, # Candidates during graph build. Higher = more accurate
)
# Query: ef_search=64 → recall ≥ 0.985 at sub-100ms latency
```

**Pipeline Flow:**
```
[User submits repo URL]
  → clone_repository        (Celery high-priority queue)
  → parse_ast_chunks        (parallel per file, Celery group)
  → embed_and_index_batch   (batched 8/call, Celery chord)
  → upsert_to_qdrant        (dense + sparse vectors + payload)
  → build_dep_graph         (import/call edges → PostgreSQL)
  → [WebSocket: DONE]
```

**Day 2 Checklist:**
- [ ] AST parser extracts all functions from a test Python file correctly
- [ ] `scripts/index_repo.py requests/requests` completes in < 2 minutes
- [ ] Qdrant shows correct vector count with dense + sparse vectors
- [ ] Embedding context includes file path, docstring, imports, source

---

## 📅 DAY 3 — The API: FastAPI, Hybrid Search & Streaming RAG

**Daily Goal:** Complete API with hybrid RRF search and SSE streaming chat with cited answers.
**Estimated Time:** 9–10 hours

### Session 7 (Hours 1–2): FastAPI App Factory & Middleware
**Learning Objective:** Async lifespan context managers. Middleware ordering: last added = first executed.

**Middleware Stack (execution order):**
```
Request → PrometheusMiddleware → StructuredLoggingMiddleware → JWTMiddleware → CORSMiddleware → Handler
```

### Session 8 (Hours 3–5): Hybrid Search Engine (RRF)
**Learning Objective:** Why RRF beats score normalization. Dense vs sparse signal complementarity.

**RRF Algorithm:**
```
score(d) = Σ_lists  1 / (60 + rank_in_list(d))

k=60 is the smoothing constant:
- Scale-invariant (cosine vs BM25 have different ranges — RRF doesn't care)
- Outlier-robust (a single very high-scoring result doesn't dominate)
- Empirically validated across TREC benchmarks
```

**When Each Modality Wins:**
- Dense: "where is retry backoff implemented?" (conceptual)
- BM25: "find validate_jwt_token function" (exact symbol)
- RRF: both — combining complementary signals

### Session 9 (Hours 6–10): SSE Streaming RAG Chat
**Learning Objective:** Production SSE: protocol, multi-turn context, citation extraction, persistence.

**SSE Event Protocol:**
```
event: status
data: {"stage": "searching", "message": "Finding relevant code..."}

event: citations
data: [{"file_path": "auth/jwt.py", "start_line": 42, "end_line": 67}]

event: token
data: {"text": "The JWT validation logic is"}

event: done
data: {"latency_ms": 1240, "chunks_retrieved": 5}
```

**Day 3 Checklist:**
- [ ] Search returns RRF results in < 200ms
- [ ] Chat streams tokens visible in browser DevTools Network tab
- [ ] Every response includes citations with exact file:line references
- [ ] Chat messages persisted with latency tracking
- [ ] User A token cannot access User B's repo (403)

---

## 📅 DAY 4 — Frontend, D3.js Graph & Webhook Re-indexing

**Daily Goal:** Complete React platform with 3-panel workspace and incremental webhook re-indexing.
**Estimated Time:** 9–10 hours

### Session 10 (Hours 1–2): GitHub OAuth + React Scaffold
**Learning Objective:** OAuth 2.0 authorization code flow. JWT storage strategy and security tradeoffs.

**OAuth Flow:**
```
Browser → /auth/github → GitHub → redirect with ?code=xxx
       → /auth/callback → exchange code → issue JWT → return token
       → Store in memory (not localStorage) → attach to all requests
```

### Session 11 (Hours 3–5): 3-Panel Workspace

**Panel Layout:**
```
┌──────────────┬───────────────────────────┬──────────────────┐
│  File Tree   │      Monaco Editor         │   Chat Panel     │
│              │                            │                  │
│  src/        │  function validate_jwt()   │  You: Where is   │
│   auth.py    │  ► line 42 highlighted    │  JWT validated?  │
│   models.py  │                            │                  │
│              │                            │  Bot: auth.py    │
│              │                            │  lines 42-67     │
└──────────────┴───────────────────────────┴──────────────────┘
```

**Build:**
- `useSSEChat.ts` — custom hook: fetch → ReadableStream → SSE event parsing → state updates
- `useIndexingProgress.ts` — WebSocket hook with exponential backoff reconnection
- `DependencyGraph.tsx` — D3.js force simulation with language-colored nodes

### Session 12 (Hours 6–7): D3.js Force-Directed Graph
**Learning Objective:** Barnes-Hut approximation (theta=0.9) for O(n log n) layout. SVG vs Canvas tradeoffs.

**Force Simulation:**
```javascript
d3.forceSimulation(nodes)
  .force('link',      d3.forceLink(edges).distance(80).strength(0.3))
  .force('charge',    d3.forceManyBody().strength(-200).theta(0.9))  // Barnes-Hut
  .force('center',    d3.forceCenter(width/2, height/2))
  .force('collision', d3.forceCollide(25))
```

### Session 13 (Hours 8–10): GitHub Webhook Incremental Re-indexing
**Learning Objective:** HMAC-SHA256 verification + differential re-indexing.

**Cost Impact:**
```
Full re-index:  O(entire repo)   → minutes, $$$ embedding API calls
Incremental:    O(changed files) → seconds, ~98% cost reduction

10 files changed in a 50k LOC repo:
  Full:        ~500 API calls
  Incremental:  ~10 API calls
```

**Day 4 Checklist:**
- [ ] GitHub OAuth works end-to-end in browser
- [ ] SSE chat streams tokens, citations rendered as clickable cards
- [ ] Citation click opens Monaco and highlights the cited line range
- [ ] D3.js graph renders with drag, zoom, pan
- [ ] Push event triggers re-indexing of only changed files

---

## 📅 DAY 5 — Observability, RAGAS Evaluation & Production Deployment

**Daily Goal:** Full observability, quality-gated CI, public cloud deployment.
**Estimated Time:** 8–9 hours

### Session 14 (Hours 1–3): Prometheus + Grafana
**Learning Objective:** RED metrics (Rate, Errors, Duration). Why histograms beat averages for latency.

**Key Metrics:**
```
codelens_http_requests_total{method, endpoint, status_code}
codelens_http_request_duration_seconds{method, endpoint}  ← histogram (not gauge!)
codelens_retrieval_duration_seconds
codelens_llm_tokens_total{provider, model, token_type}
codelens_indexing_duration_seconds
```

**Why Histograms:**
- P95/P99 reveals tail latency averages hide completely
- avg=50ms but P99=5000ms means 1% of users experience broken service
- Histogram buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]

**4 Grafana Dashboards:**
1. `CodeLens Overview` — users, throughput, query volume
2. `RAG Quality` — faithfulness and recall trends over time
3. `LLM Cost Monitor` — token spend by provider and model
4. `Infrastructure Health` — Redis, Qdrant, Postgres vitals

### Session 15 (Hours 4–6): RAGAS Evaluation Harness
**Learning Objective:** Move from subjective to quantitative retrieval quality. CI blocks deployment on regression.

**Quality Thresholds (CI-enforced):**

| Metric | Threshold | What It Measures |
|---|---|---|
| faithfulness | ≥ 0.95 | Answer claims supported by retrieved context |
| answer_relevancy | ≥ 0.90 | Answer addresses the actual question |
| context_recall | ≥ 0.88 | Retrieved chunks contain gold-standard answer |
| context_precision | ≥ 0.85 | Retrieved chunks are relevant (not noisy) |

**CI Integration:**
```bash
python apps/eval/run_eval.py --suite regression --fail-below-threshold
# Exits with code 1 if any metric drops below threshold
# Blocks the build/deploy stages in GitHub Actions
```

### Session 16 (Hours 7–9): CI/CD & Cloud Deployment
**Learning Objective:** Multi-stage Docker for minimal prod images. CI pipeline ordering and quality gates.

**CI Pipeline Order:**
```
1. quality   → ruff check + mypy strict       (blocks on any type/lint error)
2. test      → pytest with service containers
3. eval      → RAGAS on staging               (blocks if metrics drop below threshold)
4. build     → Docker multi-stage build
5. push      → GitHub Container Registry
6. deploy    → Railway / Render via API
```

**Day 5 Checklist:**
- [ ] Prometheus scrapes all endpoints; metrics at localhost:9090
- [ ] All 4 Grafana dashboards populate within 60s of indexing
- [ ] RAGAS suite: all 4 metrics above threshold
- [ ] Full CI pipeline runs on PR, blocks merge on any failure
- [ ] App live at public URL — index a repo, ask a question, get a cited answer

---

## 🎯 Final Verification Matrix

| Component | Test | Pass Criteria |
|---|---|---|
| AST Parser | Index `requests/requests` | All function defs extracted with correct line numbers |
| Hybrid Search | Query "where is retry implemented" | Top result = actual retry logic, not a comment |
| RRF Fusion | Query exact name `validate_token` | BM25 boost places it at rank 1 |
| SSE Streaming | DevTools Network during chat | Tokens stream progressively in real time |
| Webhook Re-index | Push single file to GitHub | Only that file's chunks re-processed |
| RBAC | User A token → User B's repo | 403 Forbidden (app + RLS both block) |
| LLM Swap | `LLM_PROVIDER=anthropic`, restart | All queries work with Anthropic Claude |
| Prometheus | `curl localhost:8000/metrics` | All counters and histograms present |
| Grafana | Open dashboards after indexing | All 4 panels populated with live data |
| RAGAS | Run eval suite | Faithfulness ≥ 0.95, Context Recall ≥ 0.88 |
| CI Pipeline | Open a pull request | Runs lint → test → eval → blocks merge on failure |
| Deployment | Visit cloud URL | Full app functional without local services |

---

## 🚀 Quick Start

```bash
# 1. Clone and configure
git clone https://github.com/your-username/CodeLens.git
cd CodeLens
cp .env.example .env
# Fill in API keys in .env

# 2. Start all 9 services
make up

# 3. Run database migrations
make migrate

# 4. Index a repository
python scripts/index_repo.py --url https://github.com/psf/requests

# 5. Open the app
open http://localhost:5173
```

---

## 🔑 Required Environment Variables

```bash
# Database
POSTGRES_PASSWORD=your_secure_password

# Redis
REDIS_PASSWORD=your_redis_password

# Qdrant
QDRANT_API_KEY=your_qdrant_key

# GitHub OAuth App
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_REDIRECT_URI=http://localhost:8000/auth/github/callback
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# LLM Provider (choose one)
LLM_PROVIDER=openai          # openai | anthropic | gemini
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...

# App
JWT_SECRET=your_jwt_secret_min_32_chars
ENVIRONMENT=development

# Observability
GRAFANA_PASSWORD=admin
```

---

## 📚 Skills Portfolio — What This Project Proves

| Skill Domain | Evidence in This Project |
|---|---|
| AI / ML Engineering | AST-aware RAG, HNSW tuning, RRF fusion, RAGAS evaluation |
| Distributed Systems | Celery chord fan-out, WebSocket telemetry, Redis rate limiting |
| Platform Security | PostgreSQL RLS, HMAC webhook verification, JWT RBAC |
| Database Engineering | SQLAlchemy 2.0, Alembic migrations, JSONB, tsvector |
| Frontend Engineering | SSE streaming React, D3.js graph, Monaco Editor |
| MLOps | Prometheus metrics, Grafana dashboards, CI quality gating |
| DevOps | Multi-stage Docker, GitHub Actions pipeline, cloud deployment |

---

> This is not a tutorial project. This is what S-Tier engineering looks like.
> Every system here exists in production at Anthropic, Cohere, Sourcegraph, and GitHub.
> Build it. Deploy it. Explain every decision in depth.
> **That is what separates a senior engineer from everyone else.**
