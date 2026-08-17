# CodeLens — S-Tier 5-Day Production Implementation Plan

> **Mission:** Build a production-deployed, enterprise-grade AI codebase intelligence platform in 5 days. Every component in this plan mirrors how senior engineers at Anthropic, Cohere, and Sourcegraph ship real products — precise file names, exact function signatures, and verifiable acceptance gates for every day.

---

## Project Identity Card

| Property | Value |
|---|---|
| **Project Name** | CodeLens |
| **Category** | AI Developer Tooling / Enterprise Platform |
| **Difficulty Tier** | S-Tier (Senior Full-Stack + ML Engineering) |
| **Timeline** | 5 Days (40–50 hours) |
| **Tech Domain** | Distributed Systems · RAG · AST Parsing · Graph Viz · MLOps |
| **Deployment Target** | Docker Compose (local) → Railway / Render (cloud) |
| **Primary Language** | Python 3.12 (backend) · TypeScript 5 (frontend) |
| **LLM Support** | OpenAI · Anthropic · Google Gemini (hot-swappable via env var) |

---

## Final Architecture

```
[ React 18 + Vite Frontend ]
  ├─ 3-Panel Workspace (FileTree | Monaco Editor | Chat)
  ├─ D3.js Force-Directed Dependency Graph
  ├─ WebSocket Indexing Progress (live %)
  └─ SSE Streaming Chat with Citation Cards
        │
        │ HTTPS / WS / SSE
        ▼
[ FastAPI Async Gateway ]
  ├─ GitHub OAuth + JWT Auth (7-day tokens)
  ├─ PostgreSQL RLS Tenant Injection (per-request session var)
  ├─ Redis Sliding-Window Rate Limiter (60 req/min/user)
  └─ Prometheus /metrics endpoint
        │
        ├─────────────────────────── [Celery Worker Pool]
        │                               ├─ clone_repository
        │                               ├─ parse_ast_chunks (parallel, per file)
        │                               ├─ embed_and_index_batch (8 chunks/call)
        │                               └─ build_dependency_graph
        ▼
[ Hybrid Retrieval — asyncio.gather() ]
  ├─ Dense ANN Search     (Qdrant HNSW, M=24, ef=64)
  └─ Sparse BM25 Search   (Qdrant sparse vectors)
        │
        ▼
[ Reciprocal Rank Fusion (RRF, k=60) ]
        │
        ▼
[ LLM Gateway — Strategy Pattern ]
  ├─ OpenAI (gpt-4o + text-embedding-3-large)
  ├─ Anthropic (claude-3-5-sonnet + voyage-code-2)
  └─ Gemini (gemini-1.5-pro + text-embedding-004)
        │
        ├──► SSE Token Stream → Frontend ChatPanel
        ├──► Citation Events {file_path, start_line, end_line} → Monaco
        └──► Chat Message → PostgreSQL (with latency_ms)
                                │
                                ▼
                    [ Prometheus + Grafana ]
                    [ RAGAS Nightly Eval CI ]
                    [ GitHub Webhook → Incremental Re-index ]
```

---

## Technology Stack

| Component | Technology | Version |
|:---|:---|:---:|
| API Framework | FastAPI + asyncpg | ≥0.110 |
| Data Validation | Pydantic v2 | ≥2.6 |
| Code Parsing | tree-sitter (8 language grammars) | latest |
| Task Queue | Celery 5 + Redis | ≥5.3 |
| Vector Store | Qdrant (HNSW dense + sparse BM25) | v1.9.2 |
| Relational DB | PostgreSQL 16 + pgvector + RLS | pg16 |
| ORM / Migrations | SQLAlchemy 2.0 + Alembic | ≥2.0 |
| LLM (OpenAI) | gpt-4o + text-embedding-3-large | - |
| LLM (Anthropic) | claude-3-5-sonnet + voyage-code-2 | - |
| LLM (Gemini) | gemini-1.5-pro + text-embedding-004 | - |
| Frontend | React 18 + Vite + TypeScript | 18 / 5 |
| Graph Viz | D3.js v7 (force-directed) | ≥7.9 |
| Code Editor | Monaco Editor (VS Code engine) | latest |
| State | Zustand + TanStack Query v5 | - |
| Observability | Prometheus + Grafana | v2.52 / 11.0 |
| Evaluation | RAGAS + ground-truth JSON dataset | latest |
| CI/CD | GitHub Actions (multi-stage pipeline) | - |
| Infrastructure | Docker Compose (9 services) | - |

---

## Day 1 — Monorepo, Infrastructure & PostgreSQL Schema

**Goal:** Running `make up` starts all 9 Docker services with health checks passing. Running `make migrate` applies the full schema. Manually verifying Row-Level Security confirms cross-tenant isolation works at the database engine level.

**Deliverables:**
- `docker-compose.yml` — all 9 services with health checks and named volumes
- `docker-compose.dev.yml` — hot-reload volume mounts overlay
- `infra/docker/api/Dockerfile` — multi-stage: builder → production
- `infra/docker/worker/Dockerfile` — Celery worker image
- `infra/docker/postgres/init.sql` — RLS policies + pgvector extension
- `apps/api/app/db/models.py` — full SQLAlchemy 2.0 declarative models
- `apps/api/alembic/versions/001_initial_schema.py` — first migration
- `pyproject.toml` — unified Ruff, Mypy, Pytest config
- `Makefile` — `up`, `dev`, `down`, `migrate`, `lint`, `test`, `eval` targets
- `.env.example` — all required env vars documented

**Tasks:**

1. **Create `pyproject.toml`** at repo root:
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

2. **Create `docker-compose.yml`** with the following 9 services. Every service that another depends on must use `condition: service_healthy`:
   ```yaml
   services:
     postgres:
       image: pgvector/pgvector:pg16
       environment:
         POSTGRES_DB: codelens
         POSTGRES_USER: codelens
         POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
       volumes:
         - postgres_data:/var/lib/postgresql/data
         - ./infra/docker/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U codelens"]
         interval: 5s
         retries: 10
       ports: ["5432:5432"]

     redis:
       image: redis:7.2-alpine
       command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 512mb --maxmemory-policy allkeys-lru
       healthcheck:
         test: ["CMD", "redis-cli", "ping"]
         interval: 5s
       ports: ["6379:6379"]

     qdrant:
       image: qdrant/qdrant:v1.9.2
       environment:
         QDRANT__SERVICE__API_KEY: ${QDRANT_API_KEY}
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:6333/health"]
         interval: 10s
       ports: ["6333:6333", "6334:6334"]

     api:
       build:
         context: .
         dockerfile: infra/docker/api/Dockerfile
         target: production
       env_file: .env
       depends_on:
         postgres: { condition: service_healthy }
         redis:    { condition: service_healthy }
         qdrant:   { condition: service_healthy }
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
         interval: 10s
       ports: ["8000:8000"]

     worker:
       build:
         context: .
         dockerfile: infra/docker/worker/Dockerfile
       env_file: .env
       depends_on:
         api: { condition: service_healthy }
       command: celery -A apps.worker.celery_app worker --loglevel=info -Q high,default,low --concurrency=4

     beat:
       build: { context: ., dockerfile: infra/docker/worker/Dockerfile }
       env_file: .env
       command: celery -A apps.worker.celery_app beat --loglevel=info
       depends_on: [worker]

     flower:
       image: mher/flower:2.0
       environment:
         CELERY_BROKER_URL: redis://:${REDIS_PASSWORD}@redis:6379/0
       ports: ["5555:5555"]
       depends_on: [redis]

     prometheus:
       image: prom/prometheus:v2.52.0
       volumes:
         - ./infra/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
         - prometheus_data:/prometheus
       ports: ["9090:9090"]

     grafana:
       image: grafana/grafana:11.0.0
       environment:
         GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
       volumes:
         - grafana_data:/var/lib/grafana
         - ./infra/grafana/provisioning:/etc/grafana/provisioning
       ports: ["3001:3000"]
       depends_on: [prometheus]
   ```

3. **Create `infra/docker/postgres/init.sql`**. This file runs once on container first boot:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pgvector";
   CREATE EXTENSION IF NOT EXISTS "pg_trgm";

   CREATE ROLE codelens_app LOGIN PASSWORD 'changeme_in_env';

   -- RLS policies are defined after Alembic creates the tables.
   -- This file creates the role used by the application at query time.
   ```

4. **Create `apps/api/app/db/models.py`** with the following SQLAlchemy 2.0 mapped models. Use `Mapped[]` and `mapped_column()` throughout — no legacy `Column()` syntax:
   - `User`: `id` (UUID PK), `github_id` (int, unique), `github_login` (str), `email` (str, nullable), `avatar_url` (str, nullable), `plan` (str, default="free"), `created_at`, `updated_at`
   - `Repository`: `id` (UUID PK), `owner_id` (FK → users), `github_url`, `github_full_name`, `default_branch` (default="main"), `last_indexed_sha` (nullable), `indexing_status` (str, default="pending"), `indexing_progress` (int, default=0), `total_chunks` (int), `error_message` (nullable Text), `metadata_` (JSONB), `created_at`, `updated_at`
   - `RepositoryMember`: `id` (UUID PK), `repository_id` (FK), `user_id` (FK), `role` (str, default="viewer"). Add `UniqueConstraint("repository_id", "user_id")`
   - `ASTChunk`: `id` (UUID PK), `repository_id` (FK), `file_path`, `language`, `node_type`, `function_name` (nullable), `docstring` (nullable Text), `source_code` (Text), `start_line` (int), `end_line` (int), `cyclomatic_complexity` (int, default=1), `token_count` (int), `extra_metadata` (JSONB), `qdrant_point_id` (nullable str). Add `Index("ix_ast_chunks_repo_file", "repository_id", "file_path")`. Add a `search_vector` TSVECTOR generated column with a GIN index
   - `DependencyEdge`: `id` (UUID PK), `repository_id` (FK), `source_file`, `target_file`, `edge_type` (str: import/call/inherit), `weight` (int, default=1)
   - `ChatSession`: `id` (UUID PK), `repository_id` (FK), `user_id` (FK), `title` (nullable), `created_at`
   - `ChatMessage`: `id` (UUID PK), `session_id` (FK), `role` (str: user/assistant/system), `content` (Text), `citations` (JSONB, default=list), `token_count` (int), `latency_ms` (nullable int), `provider` (nullable str), `model` (nullable str), `created_at`
   - `WebhookEvent`: `id` (UUID PK), `repository_id` (nullable FK with `ondelete="SET NULL"`), `event_type`, `delivery_id` (unique), `payload` (JSONB), `processed` (bool, default=False), `processing_error` (nullable Text), `received_at`

5. **Create `alembic/versions/001_initial_schema.py`**. After `upgrade()` creates all tables, run the following RLS setup as raw SQL via `op.execute()`:
   ```sql
   ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
   ALTER TABLE ast_chunks ENABLE ROW LEVEL SECURITY;
   ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
   ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
   ALTER TABLE dependency_edges ENABLE ROW LEVEL SECURITY;

   CREATE POLICY repo_isolation ON repositories
     FOR ALL TO codelens_app
     USING (
       id IN (
         SELECT repository_id FROM repository_members
         WHERE user_id = current_setting('app.current_user_id', true)::uuid
       )
     );

   CREATE POLICY chunk_isolation ON ast_chunks
     FOR ALL TO codelens_app
     USING (
       repository_id IN (
         SELECT repository_id FROM repository_members
         WHERE user_id = current_setting('app.current_user_id', true)::uuid
       )
     );
   ```
   Apply the same policy pattern for `chat_sessions`, `chat_messages`, and `dependency_edges`.

6. **Create `Makefile`**:
   ```makefile
   .PHONY: up dev down migrate lint test eval

   up:
   	docker-compose up -d

   dev:
   	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

   down:
   	docker-compose down -v

   migrate:
   	docker-compose exec api alembic upgrade head

   lint:
   	ruff check . && mypy apps/ packages/ --ignore-missing-imports

   test:
   	pytest apps/api/tests apps/worker/tests packages/ -v --cov

   eval:
   	python apps/eval/run_eval.py --suite regression --fail-below-threshold
   ```

**Acceptance Gate for Day 1:**
- [ ] `make up` — all 9 services show `healthy` status in `docker-compose ps`
- [ ] `make migrate` — completes with `Running upgrade -> 001` and no errors
- [ ] `docker-compose exec postgres psql -U codelens -c "\dt"` — lists all 8 tables
- [ ] Verify RLS: connect as `codelens_app`, insert 2 users + repos, confirm `SET app.current_user_id = '<user_1_uuid>'` + `SELECT * FROM repositories` returns only user 1's repo
- [ ] Flower accessible at `http://localhost:5555`
- [ ] Grafana accessible at `http://localhost:3001`

---

## Day 2 — Intelligence Engine: Multi-Language AST Parser + LLM Gateway + Qdrant Indexing

**Goal:** Run `python scripts/index_repo.py --url https://github.com/psf/requests` and confirm all code chunks are parsed with correct AST boundaries, embedded, and upserted to Qdrant with both dense and sparse vectors visible in the Qdrant dashboard.

**Deliverables:**
- `packages/ast-parser/src/engine.py` — `ASTParser` class supporting 8 languages
- `packages/ast-parser/src/models.py` — `ASTChunk` dataclass
- `packages/llm-gateway/src/providers/base.py` — `BaseLLMProvider` ABC
- `packages/llm-gateway/src/providers/openai_provider.py`
- `packages/llm-gateway/src/providers/anthropic_provider.py`
- `packages/llm-gateway/src/providers/gemini_provider.py`
- `packages/llm-gateway/src/router.py` — provider factory
- `apps/worker/celery_app.py` — Celery app instance
- `apps/worker/tasks/indexing.py` — full pipeline Celery tasks
- `scripts/index_repo.py` — CLI entrypoint
- `apps/api/tests/test_ast_parser.py` — 6 unit tests

**Tasks:**

1. **Add to `requirements.txt`** (backend):
   ```
   tree-sitter>=0.22.0
   tree-sitter-python
   tree-sitter-javascript
   tree-sitter-typescript
   tree-sitter-go
   tree-sitter-java
   tree-sitter-rust
   tree-sitter-cpp
   tree-sitter-ruby
   qdrant-client[async]>=1.9.0
   celery[redis]>=5.3.0
   openai>=1.30.0
   anthropic>=0.25.0
   google-generativeai>=0.7.0
   gitpython>=3.1.0
   ```

2. **Create `packages/ast-parser/src/models.py`**:
   ```python
   from __future__ import annotations
   import hashlib
   from dataclasses import dataclass, field

   @dataclass
   class ASTChunk:
       chunk_id: str        # SHA256(file_path:start_line:end_line)[:36]
       file_path: str
       language: str
       node_type: str       # e.g. "function_definition", "class_declaration"
       function_name: str | None
       docstring: str | None
       source_code: str
       start_line: int      # 1-indexed
       end_line: int        # 1-indexed
       imports: list[str] = field(default_factory=list)
       cyclomatic_complexity: int = 1

       @property
       def embedding_context(self) -> str:
           """Structured context string sent to the embedding model.
           Order: File → Language → Type → Name → Docstring → Imports → Code.
           This order maximises semantic signal in the first 512 tokens."""
           parts = [
               f"File: {self.file_path}",
               f"Language: {self.language}",
               f"Type: {self.node_type}",
           ]
           if self.function_name:
               parts.append(f"Name: {self.function_name}")
           if self.docstring:
               parts.append(f"Docstring: {self.docstring[:300]}")
           if self.imports:
               parts.append(f"Imports: {chr(10).join(self.imports[:10])}")
           parts.append(self.source_code)
           return "\n".join(parts)

       @property
       def token_estimate(self) -> int:
           return len(self.embedding_context) // 4
   ```

3. **Create `packages/ast-parser/src/engine.py`**. Define `LANGUAGE_MAP: dict[str, tuple[object, list[str]]]` mapping language name → `(grammar_object, list_of_target_node_types)`:

   | Language | Grammar import | Target node types |
   |---|---|---|
   | python | `tree_sitter_python` | `function_definition`, `class_definition`, `decorated_definition` |
   | javascript | `tree_sitter_javascript` | `function_declaration`, `function_expression`, `arrow_function`, `class_declaration` |
   | typescript | `tree_sitter_typescript` | `function_declaration`, `function_signature`, `class_declaration`, `method_definition` |
   | go | `tree_sitter_go` | `function_declaration`, `method_declaration`, `type_declaration` |
   | java | `tree_sitter_java` | `method_declaration`, `class_declaration`, `interface_declaration` |
   | rust | `tree_sitter_rust` | `function_item`, `impl_item`, `struct_item`, `trait_item` |
   | cpp | `tree_sitter_cpp` | `function_definition`, `class_specifier`, `namespace_definition` |
   | ruby | `tree_sitter_ruby` | `method`, `singleton_method`, `class`, `module` |

   Define `FILE_EXTENSION_MAP: dict[str, str]` mapping file extensions to language names (e.g. `.py` → `python`, `.ts` → `typescript`, `.tsx` → `typescript`, `.rs` → `rust`).

   Implement `class ASTParser` with the following methods:
   - `__init__(self) -> None` — instantiate one `Parser` per language, calling `parser.set_language(Language(grammar))` for each
   - `parse_file(self, file_path: Path) -> list[ASTChunk]` — reads file bytes, parses with tree-sitter, extracts imports, walks target nodes, returns list of `ASTChunk`. Skip files > 500KB. Skip nodes where `token_estimate > 8192`
   - `parse_directory(self, directory: Path, max_files: int = 5000) -> Iterator[ASTChunk]` — `rglob("*")`, call `parse_file` for each file with matching extension, yield chunks. Skip paths containing: `node_modules`, `.git`, `__pycache__`, `.venv`, `dist`, `build`, `vendor`
   - `_walk_target_nodes(self, node: Node, target_types: frozenset[str]) -> Iterator[Node]` — DFS. If `node.type in target_types`, yield and **do not recurse** (prevents extracting nested functions twice). Otherwise recurse into children
   - `_extract_name(self, node: Node, language: str) -> str | None` — use `node.child_by_field_name("name")` and return `.text.decode("utf-8")`
   - `_extract_docstring(self, node: Node, source: str, language: str) -> str | None` — for Python: check if body's first statement is an `expression_statement` containing a `string` node. Strip triple-quotes and return. Return `None` for other languages
   - `_extract_imports(self, root: Node, source: str, language: str) -> list[str]` — walk `root.children`, collect nodes of type `import_statement` or `import_from_statement` or `import_declaration`, return up to 20 as strings
   - `_compute_cyclomatic_complexity(self, node: Node) -> int` — start at 1, add 1 for each node of type: `if_statement`, `elif_clause`, `for_statement`, `while_statement`, `except_clause`, `boolean_operator`, `conditional_expression`, `case_clause`, `catch_clause`

4. **Create `packages/llm-gateway/src/providers/base.py`**:
   ```python
   from abc import ABC, abstractmethod
   from dataclasses import dataclass
   from typing import AsyncIterator

   @dataclass
   class EmbeddingResult:
       vectors: list[list[float]]
       model: str
       total_tokens: int

   @dataclass
   class ChatChunk:
       delta: str
       finish_reason: str | None

   class BaseLLMProvider(ABC):
       @abstractmethod
       async def embed(self, texts: list[str]) -> EmbeddingResult: ...

       @abstractmethod
       async def chat_stream(
           self,
           messages: list[dict],
           system_prompt: str,
           max_tokens: int = 2048,
       ) -> AsyncIterator[ChatChunk]: ...

       @property
       @abstractmethod
       def embedding_dimensions(self) -> int: ...

       @property
       @abstractmethod
       def embedding_model_name(self) -> str: ...

       @property
       @abstractmethod
       def chat_model_name(self) -> str: ...
   ```

5. **Create `packages/llm-gateway/src/providers/openai_provider.py`**. Implement `OpenAIProvider(BaseLLMProvider)`:
   - `embedding_dimensions` → `3072`
   - `embedding_model_name` → `"text-embedding-3-large"`
   - `chat_model_name` → `"gpt-4o"`
   - `embed(texts)` → call `self._client.embeddings.create(model=..., input=texts, encoding_format="float")`, return `EmbeddingResult`
   - `chat_stream(messages, system_prompt, max_tokens)` → prepend system message, call `self._client.chat.completions.stream(...)`, yield `ChatChunk` for each delta event

   Implement `AnthropicProvider(BaseLLMProvider)` and `GeminiProvider(BaseLLMProvider)` following the same interface. Anthropic embedding model: `voyage-code-2` (dimensions: 1536). Gemini embedding model: `text-embedding-004` (dimensions: 768).

6. **Create `packages/llm-gateway/src/router.py`**:
   ```python
   import os
   from .providers.base import BaseLLMProvider
   from .providers.openai_provider import OpenAIProvider
   from .providers.anthropic_provider import AnthropicProvider
   from .providers.gemini_provider import GeminiProvider

   def get_provider() -> BaseLLMProvider:
       provider = os.environ.get("LLM_PROVIDER", "openai").lower()
       match provider:
           case "openai":
               return OpenAIProvider(api_key=os.environ["OPENAI_API_KEY"])
           case "anthropic":
               return AnthropicProvider(api_key=os.environ["ANTHROPIC_API_KEY"])
           case "gemini":
               return GeminiProvider(api_key=os.environ["GOOGLE_API_KEY"])
           case _:
               raise ValueError(f"Unknown provider: {provider}. Choose: openai | anthropic | gemini")
   ```

7. **Create `apps/worker/celery_app.py`**:
   ```python
   from celery import Celery
   import os

   celery_app = Celery(
       "codelens_worker",
       broker=os.environ["REDIS_URL"],
       backend=os.environ["REDIS_URL"],
       include=["apps.worker.tasks.indexing"],
   )
   celery_app.conf.task_routes = {
       "apps.worker.tasks.indexing.clone_repository":    {"queue": "high"},
       "apps.worker.tasks.indexing.embed_and_index_batch": {"queue": "default"},
       "apps.worker.tasks.indexing.build_dependency_graph": {"queue": "low"},
   }
   celery_app.conf.task_serializer = "json"
   celery_app.conf.result_expires = 3600
   ```

8. **Create `apps/worker/tasks/indexing.py`**. Implement the following Celery tasks:

   - `start_indexing_pipeline(repo_id: str, clone_url: str) -> None` — orchestrator task. Calls `clone_repository`, then fans out `embed_and_index_batch` as a Celery `group` with a `chord` callback to `finalize_indexing`. Sends WebSocket status updates at each stage via Redis pub/sub on channel `repo:{repo_id}:progress`

   - `clone_repository(repo_id: str, clone_url: str) -> str` — clones the repo to `/tmp/codelens/{repo_id}/` using `git.Repo.clone_from(clone_url, target_path, depth=1)`. Returns the local path string. Raises and retries (max 3, delay 5s) on `GitCommandError`

   - `embed_and_index_batch(repo_id: str, chunk_dicts: list[dict]) -> int` — calls `asyncio.run(_embed_and_index_async(repo_id, chunk_dicts))`. Returns count of upserted points

   - `async _embed_and_index_async(repo_id: str, chunk_dicts: list[dict]) -> int` — creates `AsyncQdrantClient`, calls `_ensure_collection()`, calls `provider.embed([c["embedding_context"] for c in chunk_dicts])`, builds `PointStruct` list with:
     - `vector={"dense": embedding_vector, "sparse": NamedSparseVector(...)}`
     - `payload={"repo_id", "file_path", "language", "function_name", "docstring", "source_code", "start_line", "end_line", "node_type"}`
     - Calls `client.upsert(collection_name="code_chunks", points=points, wait=True)`

   - `_ensure_collection(client: AsyncQdrantClient, dimensions: int) -> None` — creates `code_chunks` collection only if it does not already exist:
     ```python
     await client.create_collection(
         collection_name="code_chunks",
         vectors_config={
             "dense": VectorParams(
                 size=dimensions,
                 distance=Distance.COSINE,
                 hnsw_config=HnswConfigDiff(m=24, ef_construct=128),
             )
         },
         sparse_vectors_config={
             "sparse": SparseVectorParams(
                 index=SparseIndexParams(on_disk=False)
             )
         },
     )
     await client.create_payload_index(
         collection_name="code_chunks",
         field_name="repo_id",
         field_schema="keyword",
     )
     ```

   - `build_dependency_graph(repo_id: str, clone_path: str) -> int` — walks all files in `clone_path`, extracts import lines, parses `from X import Y` and `import X` patterns, inserts rows into `dependency_edges` table. Returns edge count

   - `finalize_indexing(results: list[int], repo_id: str, commit_sha: str, total_chunks: int) -> None` — updates `repositories.indexing_status = "complete"`, `last_indexed_sha = commit_sha`, `total_chunks = sum(results)`. Publishes completion event to Redis pub/sub

9. **Create `scripts/index_repo.py`**:
   ```python
   import argparse
   import asyncio
   from pathlib import Path
   import git

   def main() -> None:
       parser = argparse.ArgumentParser()
       parser.add_argument("--url", required=True, help="GitHub repo URL to index")
       parser.add_argument("--repo-id", default="test-repo-001")
       args = parser.parse_args()

       from apps.worker.tasks.indexing import start_indexing_pipeline
       result = start_indexing_pipeline.delay(args.repo_id, args.url)
       print(f"Indexing task queued: {result.id}")
       print("Monitor progress at http://localhost:5555")

   if __name__ == "__main__":
       main()
   ```

**Acceptance Gate for Day 2:**
- [ ] `python scripts/index_repo.py --url https://github.com/psf/requests` queues successfully and completes within 3 minutes
- [ ] Qdrant dashboard at `http://localhost:6333/dashboard` shows `code_chunks` collection with correct vector count (requests library ≈ 800–1200 chunks)
- [ ] Each Qdrant point has both `dense` vector and `sparse` vector present
- [ ] Each payload has non-null `file_path`, `start_line`, `end_line`, `source_code`
- [ ] Change `LLM_PROVIDER=anthropic` in `.env`, restart `worker` service, re-run — chunks index successfully with Anthropic embeddings
- [ ] All 6 unit tests in `apps/api/tests/test_ast_parser.py` pass: test Python function extraction, test Go method extraction, test docstring extraction, test import extraction, test `_should_skip` paths, test `cyclomatic_complexity` counting

---

## Day 3 — FastAPI Backend: Auth, Hybrid Search & SSE Streaming RAG Chat

**Goal:** The complete API is functional. Hybrid search returns RRF-fused results in under 200ms. The chat endpoint streams tokens via SSE with exact file-path and line-range citations in every response.

**Deliverables:**
- `apps/api/app/main.py` — app factory with lifespan context manager
- `apps/api/app/config.py` — Pydantic Settings from env
- `apps/api/app/middleware/auth.py` — JWT extraction + RLS session variable injection
- `apps/api/app/middleware/logging.py` — structured JSON logging via structlog
- `apps/api/app/middleware/metrics.py` — Prometheus counter/histogram recording
- `apps/api/app/routes/auth.py` — GitHub OAuth + JWT issuance
- `apps/api/app/routes/repos.py` — repository CRUD + WebSocket progress
- `apps/api/app/routes/search.py` — hybrid search endpoint
- `apps/api/app/routes/chat.py` — SSE streaming RAG endpoint
- `apps/api/app/routes/graph.py` — dependency graph JSON endpoint
- `apps/api/app/routes/webhooks.py` — HMAC-verified GitHub push handler
- `apps/api/app/services/retrieval.py` — `HybridSearchEngine` with RRF
- `apps/api/tests/test_retrieval.py` — 5 unit tests

**Tasks:**

1. **Create `apps/api/app/config.py`** using Pydantic `BaseSettings`. Read all values from environment:
   ```python
   from pydantic_settings import BaseSettings

   class Settings(BaseSettings):
       ENVIRONMENT: str = "development"
       DATABASE_URL: str
       REDIS_URL: str
       QDRANT_URL: str
       QDRANT_API_KEY: str | None = None
       GITHUB_CLIENT_ID: str
       GITHUB_CLIENT_SECRET: str
       GITHUB_REDIRECT_URI: str
       GITHUB_WEBHOOK_SECRET: str
       JWT_SECRET: str
       JWT_ALGORITHM: str = "HS256"
       JWT_EXPIRE_DAYS: int = 7
       LLM_PROVIDER: str = "openai"
       ALLOWED_ORIGINS: list[str] = ["http://localhost:5173"]

       class Config:
           env_file = ".env"

   settings = Settings()
   ```

2. **Create `apps/api/app/main.py`**. Use the `@asynccontextmanager` lifespan pattern (not deprecated `@app.on_event`). The lifespan must: create DB tables in development mode, dispose the engine on shutdown. Mount `make_asgi_app()` from `prometheus_client` at `/metrics`. Register all routers with correct prefixes:
   - `/auth` → auth router
   - `/api/v1/repos` → repos, search, chat, graph routers
   - `/api/v1/webhooks` → webhooks router

3. **Create `apps/api/app/middleware/auth.py`**. Implement two things:
   - `JWTMiddleware(BaseHTTPMiddleware)` — for every request, extract `Authorization: Bearer <token>`, decode JWT with `PyJWT`, set `request.state.user_id = payload["sub"]`. Skip for paths: `/health`, `/metrics`, `/auth/`, `/api/docs`
   - `get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User` — FastAPI dependency that reads `request.state.user_id`, sets PostgreSQL session variable `SET LOCAL app.current_user_id = '<uuid>'` via `await db.execute(text(...))`, fetches and returns the `User` row. Raises `HTTP 401` if no user found

4. **Create `apps/api/app/services/retrieval.py`**. Implement `class HybridSearchEngine`:

   - `__init__(self, client: AsyncQdrantClient) -> None`

   - `async search(self, query: str, repo_id: str, top_k: int = 5, language_filter: str | None = None) -> list[SearchHit]`:
     1. Embed query: `embed_result = await self._provider.embed([query])`
     2. Build sparse query vector by tokenizing query string, computing term frequency per token using `abs(hash(token)) % 65536` as index
     3. Build `Filter(must=[FieldCondition(key="repo_id", match=MatchValue(value=repo_id))])`. If `language_filter` provided, add second `FieldCondition` for `"language"`
     4. Call `dense_results, sparse_results = await asyncio.gather(self._dense_search(...), self._sparse_search(...))` in parallel
     5. Call `self._reciprocal_rank_fusion(dense_results, sparse_results, top_k)` and return

   - `async _dense_search(self, vector: list[float], filter_: Filter) -> list[ScoredPoint]` — call `client.search` with `NamedVector(name="dense", vector=vector)`, `limit=20`, `search_params={"hnsw_ef": 64}`, `with_payload=True`

   - `async _sparse_search(self, sparse: dict, filter_: Filter) -> list[ScoredPoint]` — call `client.search` with `NamedSparseVector(name="sparse", vector=SparseVector(indices=..., values=...))`, `limit=20`, `with_payload=True`

   - `_reciprocal_rank_fusion(self, dense: list, sparse: list, top_k: int) -> list[SearchHit]`:
     ```
     RRF formula: score(d) = Σ  1 / (k + rank(d))   where k = 60

     Implementation:
     1. For rank, point in enumerate(dense, start=1):
            rrf_scores[point.id] += 1.0 / (60 + rank)
     2. For rank, point in enumerate(sparse, start=1):
            rrf_scores[point.id] += 1.0 / (60 + rank)
     3. Sort by rrf_score descending, return top_k as SearchHit dataclass
     ```

   - Define `@dataclass SearchHit` with fields: `chunk_id`, `file_path`, `function_name`, `source_code`, `start_line`, `end_line`, `language`, `docstring`, `rrf_score`, `dense_rank`, `sparse_rank`

5. **Create `apps/api/app/routes/chat.py`**. Implement `POST /{repo_id}/chat` returning `StreamingResponse(media_type="text/event-stream")`. The inner `async def event_stream() -> AsyncIterator[str]` must emit events in this exact order:
   ```
   event: status
   data: {"stage": "searching", "message": "Finding relevant code..."}

   event: citations
   data: [{"file_path": "...", "start_line": 42, "end_line": 67, "function_name": "...", "snippet": "..."}]

   event: token
   data: {"text": "<streamed token>"}
   ... (one event per token)

   event: done
   data: {"latency_ms": 1240, "chunks_retrieved": 5, "provider": "OpenAIProvider"}
   ```
   Helper: `def _sse_event(event_type: str, data: object) -> str: return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"`

   Set response headers: `Cache-Control: no-cache`, `X-Accel-Buffering: no`, `Connection: keep-alive`.

   After streaming completes, persist `ChatMessage` rows (user message + assistant message with citations JSONB) to the database.

6. **Create `apps/api/app/routes/webhooks.py`**. Implement `POST /github`. Steps:
   - Read raw body with `await request.body()`
   - Verify HMAC-SHA256: `expected = "sha256=" + hmac.new(settings.GITHUB_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()`. Use `hmac.compare_digest(expected, x_hub_signature_256)`. Return `HTTP 403` on mismatch
   - If `x_github_event != "push"`, return `{"status": "ignored"}`
   - Parse payload JSON. Collect `changed_files` (added + modified) and `removed_files` from all commits
   - Look up repository by `payload["repository"]["full_name"]`
   - Insert `WebhookEvent` record
   - Dispatch `incremental_reindex.delay(repo_id, changed_files, removed_files, after_sha)`
   - Return `{"status": "queued", "changed_files": len(changed_files)}`

7. **Create `apps/api/app/routes/auth.py`** with two endpoints:
   - `GET /github` — redirects to `https://github.com/login/oauth/authorize?client_id=...&redirect_uri=...&scope=repo,user:email`
   - `GET /github/callback?code=<code>` — exchanges code for GitHub access token via `POST https://github.com/login/oauth/access_token`, fetches user profile from `GET https://api.github.com/user`, upserts `User` row, issues HS256 JWT with `{"sub": str(user.id), "exp": utcnow + 7 days}`, returns `{"access_token": token, "token_type": "bearer"}`

**Acceptance Gate for Day 3:**
- [ ] `curl -X POST http://localhost:8000/api/v1/repos/{id}/search -H "Authorization: Bearer <token>" -d '{"query":"where is retry logic"}' | jq` — returns array of results in < 200ms
- [ ] Open browser DevTools → Network tab → POST to `/api/v1/repos/{id}/chat` — confirm `status`, `citations`, multiple `token`, and `done` events all appear as separate SSE events
- [ ] `curl -X POST http://localhost:8000/api/v1/webhooks/github` without a valid HMAC signature → returns `HTTP 403`
- [ ] Query `SELECT role, content, citations FROM chat_messages ORDER BY created_at DESC LIMIT 2` — confirms both user and assistant messages persisted with non-empty citations JSON
- [ ] `curl http://localhost:8000/metrics` — returns Prometheus text format with `codelens_http_requests_total` counter present
- [ ] All 5 unit tests in `test_retrieval.py` pass: RRF score calculation, dense-only result handling, sparse-only result handling, filter construction, parallel gather mock

---

## Day 4 — React Frontend: 3-Panel Workspace, SSE Chat, D3.js Graph & Webhook Re-indexing

**Goal:** The complete web application is functional in the browser. A developer can log in via GitHub, submit a repository URL, watch live indexing progress via WebSocket, ask questions in the SSE chat panel, click citations to open the cited file with highlighted lines in Monaco Editor, and view the interactive D3.js dependency graph.

**Deliverables:**
- `apps/web/` — full React 18 + Vite + TypeScript scaffold
- `apps/web/src/lib/auth.ts` — GitHub OAuth redirect + JWT storage
- `apps/web/src/lib/api.ts` — typed fetch wrapper with auth header
- `apps/web/src/lib/sse.ts` — SSE client with event type parsing
- `apps/web/src/stores/authStore.ts` — Zustand auth state
- `apps/web/src/stores/repoStore.ts` — repository + indexing state
- `apps/web/src/pages/LoginPage.tsx`
- `apps/web/src/pages/DashboardPage.tsx`
- `apps/web/src/pages/WorkspacePage.tsx` — 3-panel layout
- `apps/web/src/pages/GraphPage.tsx` — full-screen D3.js view
- `apps/web/src/components/ChatPanel.tsx` — SSE streaming chat
- `apps/web/src/components/CodeViewer.tsx` — Monaco with line highlighting
- `apps/web/src/components/FileTree.tsx` — repository file navigator
- `apps/web/src/components/IndexingProgress.tsx` — WebSocket progress bar
- `apps/web/src/components/DependencyGraph.tsx` — D3.js force-directed graph
- `apps/web/src/hooks/useSSEChat.ts`
- `apps/web/src/hooks/useIndexingProgress.ts`

**Tasks:**

1. **Scaffold the web app** in `apps/web/`:
   ```bash
   npm create vite@latest apps/web -- --template react-ts
   cd apps/web
   npm install @monaco-editor/react d3 zustand @tanstack/react-query \
     react-router-dom@6 react-markdown lucide-react
   ```

2. **Create `apps/web/src/lib/auth.ts`**:
   ```typescript
   const TOKEN_KEY = "codelens_token";  // Memory storage — never localStorage

   let _token: string | null = null;

   export const setToken = (t: string) => { _token = t; };
   export const getToken = () => _token;
   export const clearToken = () => { _token = null; };

   export const redirectToGitHubOAuth = () => {
     window.location.href = "/auth/github";
   };
   ```

3. **Create `apps/web/src/lib/api.ts`**. Export a typed `apiClient` object with methods `get<T>`, `post<T>`, `delete<T>`. Every method attaches `Authorization: Bearer ${getToken()}` header. Throws on non-2xx responses with parsed error body.

4. **Create `apps/web/src/hooks/useSSEChat.ts`** — custom hook that manages the full SSE lifecycle:
   ```typescript
   export interface Citation {
     file_path: string;
     start_line: number;
     end_line: number;
     function_name: string | null;
     snippet: string;
   }

   export function useSSEChat(repoId: string) {
     // State: isStreaming, currentResponse (string), citations (Citation[]), status (string)
     // sendMessage(message: string, sessionId?: string): Promise<void>
     //   1. Abort any ongoing stream via AbortController
     //   2. Reset state
     //   3. fetch() POST to /api/v1/repos/{repoId}/chat with stream: true
     //   4. Read response.body as ReadableStream via getReader()
     //   5. Decode chunks, split on "\n\n", parse "event:" and "data:" lines
     //   6. Handle events: "status" → set status, "citations" → set citations,
     //      "token" → append to currentResponse, "done" → set isStreaming=false
     // cancelStream(): void — abort the AbortController
   }
   ```

5. **Create `apps/web/src/hooks/useIndexingProgress.ts`** — WebSocket hook:
   ```typescript
   export function useIndexingProgress(repoId: string | null) {
     // Opens WebSocket to ws://localhost:8000/api/v1/repos/{repoId}/progress
     // Reconnects with exponential backoff (1s, 2s, 4s, 8s, max 30s) on disconnect
     // Sends heartbeat ping every 30s
     // Returns: { progress: number (0-100), stage: string, isConnected: boolean }
   }
   ```

6. **Create `apps/web/src/pages/WorkspacePage.tsx`** with a CSS grid 3-panel layout:
   ```
   grid-template-columns: 240px 1fr 360px
   grid-template-rows: 48px 1fr     (header + content)
   ```
   - Left panel: `<FileTree>` displaying repo files; clicking a file opens it in Monaco
   - Center panel: `<CodeViewer>` — Monaco Editor. When a citation is clicked from chat, call `monacoInstance.revealLineInCenter(start_line)` and `monacoInstance.deltaDecorations()` to highlight lines `start_line` through `end_line` with background color `#1c4a1c`
   - Right panel: `<ChatPanel>` with message list, streaming response, citation cards

7. **Create `apps/web/src/components/DependencyGraph.tsx`** using D3.js v7:
   - Fetch graph data from `GET /api/v1/repos/{repoId}/graph` which returns `{ nodes: Node[], edges: Edge[] }`
   - `Node` has: `id`, `file_path`, `language`, `chunk_count`
   - `Edge` has: `source`, `target`, `edge_type`, `weight`
   - Create `d3.forceSimulation<Node>(nodes)` with forces:
     - `d3.forceLink(edges).id(d => d.id).distance(80).strength(0.3)`
     - `d3.forceManyBody().strength(-200).theta(0.9)` ← Barnes-Hut O(n log n)
     - `d3.forceCenter(width/2, height/2)`
     - `d3.forceCollide(25)`
   - Color nodes by language: Python `#3776AB`, TypeScript `#3178C6`, Go `#00ADD8`, Java `#ED8B00`, Rust `#CE412B`, default `#94A3B8`
   - Node radius = `Math.max(6, Math.min(20, chunk_count * 2))`
   - Add `d3.zoom()` behavior on the SVG with `scaleExtent([0.1, 10])`
   - Add `d3.drag()` on nodes: set `d.fx = d.x, d.fy = d.y` on drag, clear on drag end
   - On node click: navigate to `WorkspacePage` with that `file_path` selected

8. **Implement incremental re-indexing Celery task** `incremental_reindex(repo_id: str, changed_files: list[str], removed_files: list[str], new_sha: str) -> None` in `apps/worker/tasks/indexing.py`:
   - For `removed_files`: call `client.delete(collection_name="code_chunks", points_selector=Filter(must=[FieldCondition(key="file_path", match=MatchAny(any=removed_files)), FieldCondition(key="repo_id", match=MatchValue(value=repo_id))]))`
   - For `changed_files`: delete existing Qdrant points for those file paths (same filter), then re-parse and re-embed only those files from the cloned repo directory
   - Update `repositories.last_indexed_sha = new_sha`

**Acceptance Gate for Day 4:**
- [ ] GitHub OAuth login completes and user lands on Dashboard with repository list
- [ ] Submit a new repo URL — `IndexingProgress` bar advances from 0% to 100% in real time via WebSocket
- [ ] Type a question in ChatPanel — tokens appear progressively (not all at once), citations appear as clickable cards before the answer begins
- [ ] Click a citation card — Monaco Editor scrolls to the cited function and highlights lines with green background
- [ ] Navigate to `/repo/{id}/graph` — D3.js renders with nodes colored by language, drag and zoom work
- [ ] Push a single file change to a registered repo — within 30 seconds, only that file's vectors are updated in Qdrant (verify by checking `updated_at` on Qdrant points)
- [ ] User A's JWT cannot fetch User B's `/api/v1/repos` — returns empty array (RLS enforcement)

---

## Day 5 — Observability, RAGAS Evaluation & Production Deployment

**Goal:** Prometheus scrapes all metric endpoints. All 4 Grafana dashboards populate with live data. The RAGAS evaluation harness runs against the live API and all metrics pass their thresholds. GitHub Actions CI pipeline runs lint → test → eval → build → push → deploy in sequence and the application is accessible at a public URL.

**Deliverables:**
- `apps/api/app/middleware/metrics.py` — full Prometheus metric definitions
- `infra/prometheus/prometheus.yml` — scrape config
- `infra/grafana/provisioning/datasources/prometheus.yml`
- `infra/grafana/provisioning/dashboards/dashboard.yml`
- `infra/grafana/dashboards/codelens_overview.json`
- `infra/grafana/dashboards/rag_quality.json`
- `infra/grafana/dashboards/llm_cost.json`
- `infra/grafana/dashboards/infra_health.json`
- `apps/eval/run_eval.py` — RAGAS evaluation harness
- `apps/eval/datasets/regression.json` — ground-truth Q&A dataset (minimum 20 pairs)
- `.github/workflows/ci.yml` — lint → test → eval → build pipeline
- `.github/workflows/deploy.yml` — registry push + cloud deploy
- `infra/docker/api/Dockerfile` — multi-stage production build
- `SECURITY.md` — security controls checklist

**Tasks:**

1. **Create `apps/api/app/middleware/metrics.py`** with the following Prometheus metrics. Import and increment/observe them at the point of measurement — not in the middleware only:
   ```python
   from prometheus_client import Counter, Histogram, Gauge

   REQUEST_COUNT = Counter(
       "codelens_http_requests_total",
       "Total HTTP requests",
       ["method", "endpoint", "status_code"],
   )
   REQUEST_LATENCY = Histogram(
       "codelens_http_request_duration_seconds",
       "HTTP request latency",
       ["method", "endpoint"],
       buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
   )
   RETRIEVAL_LATENCY = Histogram(
       "codelens_retrieval_duration_seconds",
       "Hybrid search duration",
       buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0],
   )
   LLM_TOKENS_TOTAL = Counter(
       "codelens_llm_tokens_total",
       "Total LLM tokens consumed",
       ["provider", "model", "token_type"],
   )
   LLM_REQUEST_LATENCY = Histogram(
       "codelens_llm_request_duration_seconds",
       "LLM API call duration",
       ["provider", "model"],
       buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
   )
   INDEXING_JOBS_TOTAL = Counter(
       "codelens_indexing_jobs_total",
       "Indexing jobs by status",
       ["status"],
   )
   INDEXING_DURATION = Histogram(
       "codelens_indexing_duration_seconds",
       "Full repository indexing duration",
       buckets=[10, 30, 60, 120, 300, 600, 1800],
   )
   ACTIVE_WORKERS = Gauge(
       "codelens_active_celery_workers",
       "Number of active Celery workers",
   )
   ```

2. **Create `infra/prometheus/prometheus.yml`**:
   ```yaml
   global:
     scrape_interval: 15s
     evaluation_interval: 15s

   scrape_configs:
     - job_name: 'codelens-api'
       static_configs:
         - targets: ['api:8000']
       metrics_path: '/metrics'

     - job_name: 'codelens-worker'
       static_configs:
         - targets: ['worker:9090']
   ```

3. **Create 4 Grafana dashboards** as JSON files in `infra/grafana/dashboards/`:

   `codelens_overview.json` — panels:
   - Request rate: `rate(codelens_http_requests_total[5m])` grouped by endpoint
   - Error rate: `rate(codelens_http_requests_total{status_code=~"5.."}[5m])`
   - P95 latency: `histogram_quantile(0.95, rate(codelens_http_request_duration_seconds_bucket[5m]))`
   - Active indexing jobs: `codelens_indexing_jobs_total{status="running"}`

   `rag_quality.json` — panels:
   - Retrieval P95 latency over time
   - Chunks retrieved per query (histogram)
   - LLM latency by provider

   `llm_cost.json` — panels:
   - Total tokens by provider (stacked bar, 24h window)
   - Tokens by type (prompt vs completion)
   - Cost estimate (tokens * price per 1M for each provider)

   `infra_health.json` — panels:
   - Redis memory usage
   - Qdrant collection size (scraped from Qdrant `/metrics`)
   - PostgreSQL connection count
   - Celery worker count gauge

4. **Create `apps/eval/datasets/regression.json`** — minimum 20 ground-truth question/answer pairs. Format:
   ```json
   [
     {
       "question": "Where is the HTTP retry logic implemented?",
       "ground_truth_answer": "HTTP retry logic is implemented using the HTTPAdapter and Retry class from urllib3. The configuration is applied in the Session class in requests/adapters.py",
       "expected_file_paths": ["requests/adapters.py"],
       "expected_keywords": ["Retry", "HTTPAdapter", "max_retries"]
     }
   ]
   ```
   Use the `requests/requests` repository as the indexed knowledge base for all 20 questions.

5. **Create `apps/eval/run_eval.py`**. The script must:
   - Accept CLI args: `--suite` (dataset name), `--repo-id`, `--fail-below-threshold`, `--api-url` (default `http://localhost:8000`)
   - For each question, call `POST /api/v1/repos/{repo_id}/search` to retrieve contexts, then call the LLM directly with retrieved context to get an answer
   - Build `datasets.Dataset` with columns: `question`, `answer`, `contexts` (list of source_code strings), `ground_truth`
   - Call `ragas.evaluate(dataset, metrics=[faithfulness, answer_relevancy, context_recall, context_precision])`
   - Print a formatted results table with threshold comparison
   - Write JSON report to `apps/eval/reports/{suite}_{timestamp}.json`
   - Exit with code `1` if `--fail-below-threshold` and any metric is below threshold

   **Thresholds:**
   | Metric | Minimum |
   |---|---|
   | faithfulness | 0.95 |
   | answer_relevancy | 0.90 |
   | context_recall | 0.88 |
   | context_precision | 0.85 |

6. **Create `.github/workflows/ci.yml`**. Four jobs in this exact dependency order:

   ```yaml
   jobs:
     quality:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-python@v5
           with: { python-version: "3.12" }
         - run: pip install ruff mypy
         - run: ruff check .
         - run: mypy apps/ packages/ --ignore-missing-imports

     test:
       needs: [quality]
       runs-on: ubuntu-latest
       services:
         postgres:
           image: pgvector/pgvector:pg16
           env: { POSTGRES_DB: codelens_test, POSTGRES_USER: codelens, POSTGRES_PASSWORD: testpass }
           options: "--health-cmd pg_isready --health-interval 5s --health-retries 10"
         redis:
           image: redis:7-alpine
         qdrant:
           image: qdrant/qdrant:v1.9.2
       steps:
         - uses: actions/checkout@v4
         - run: pip install -e "apps/api[test]" -e packages/core -e packages/ast-parser
         - run: pytest apps/ packages/ -v --cov --cov-report=xml
         - uses: codecov/codecov-action@v4

     eval:
       needs: [test]
       if: github.ref == 'refs/heads/main'
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - run: pip install -e apps/eval
         - name: Run RAGAS Evaluation
           env:
             OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
             API_URL: ${{ secrets.STAGING_API_URL }}
           run: python apps/eval/run_eval.py --suite regression --repo-id ${{ secrets.EVAL_REPO_ID }} --fail-below-threshold

     build:
       needs: [eval]
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: docker/setup-buildx-action@v3
         - uses: docker/login-action@v3
           with:
             registry: ghcr.io
             username: ${{ github.actor }}
             password: ${{ secrets.GITHUB_TOKEN }}
         - uses: docker/build-push-action@v5
           with:
             context: .
             file: infra/docker/api/Dockerfile
             push: true
             tags: ghcr.io/${{ github.repository }}/api:${{ github.sha }}
             cache-from: type=gha
             cache-to: type=gha,mode=max
   ```

7. **Create `infra/docker/api/Dockerfile`** with two stages:
   ```dockerfile
   # Stage 1: Install dependencies
   FROM python:3.12-slim AS builder
   WORKDIR /build
   COPY pyproject.toml .
   COPY packages/ packages/
   RUN pip install --user --no-cache-dir -e packages/core -e packages/ast-parser -e packages/llm-gateway

   COPY apps/api/requirements.txt .
   RUN pip install --user --no-cache-dir -r requirements.txt

   # Stage 2: Minimal production image
   FROM python:3.12-slim AS production
   WORKDIR /app
   COPY --from=builder /root/.local /root/.local
   COPY apps/api/ .
   ENV PATH=/root/.local/bin:$PATH
   EXPOSE 8000
   CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
   ```

8. **Create `SECURITY.md`** as a verifiable checklist. Every item must include a verification command:
   ```markdown
   # Security Controls Checklist

   - [ ] JWT_SECRET is minimum 32 characters
         Verify: `echo -n "$JWT_SECRET" | wc -c`
   - [ ] No secrets committed to git history
         Verify: `git log --all -p | grep -E "API_KEY|SECRET|PASSWORD" | head -5`
   - [ ] RLS blocks cross-tenant access
         Verify: manual psql test — set user A's ID, query repositories, confirm 0 rows returned for user B's data
   - [ ] Rate limiting active (60 req/min/user)
         Verify: `for i in {1..70}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/health; done | grep -c 429`
   - [ ] Redis not exposed externally (port 6379 not public)
         Verify: `docker-compose ps | grep redis` — confirm no `0.0.0.0:6379` binding
   - [ ] HMAC webhook verification active
         Verify: `curl -X POST http://localhost:8000/api/v1/webhooks/github -d '{}'` → expect HTTP 403
   - [ ] QDRANT_API_KEY set and enforced
         Verify: `curl http://localhost:6333/collections` without API key → expect 401
   - [ ] Query max length enforced (1000 chars)
         Verify: send 1001-char query string to /search → expect HTTP 422
   ```

**Acceptance Gate for Day 5:**
- [ ] `curl http://localhost:8000/metrics` — returns Prometheus text format with all defined metric names present
- [ ] All 4 Grafana dashboards at `http://localhost:3001` show populated panels within 60 seconds of indexing activity
- [ ] `make eval` completes with all 4 RAGAS metrics above threshold (no exit code 1)
- [ ] GitHub Actions CI pipeline runs on a new PR: quality → test → eval → build all pass
- [ ] Docker image pushed to `ghcr.io/sobanshahid10/codelens/api:{sha}` (visible in GitHub Packages)
- [ ] Application deployed to Railway/Render — public URL accessible
- [ ] Full end-to-end on public URL: index `psf/requests`, ask "where is authentication handled?", receive streaming response with exact file citations
- [ ] All 8 SECURITY.md items checked with passing verification commands

---

## Final Verification Matrix

| Component | Test | Pass Criteria |
|---|---|---|
| AST Parser | Index `requests/requests` | All function defs extracted with correct start_line / end_line |
| Hybrid Search | Query `"where is retry implemented"` | Top-1 result contains retry logic source code, not a comment |
| RRF Fusion | Query exact name `HTTPAdapter` | BM25 rank boosts it to top-1 (not buried by semantic matches) |
| SSE Streaming | DevTools Network tab during chat | `status` → `citations` → N×`token` → `done` events in order |
| Webhook Re-index | Push one file to GitHub | Only that file's Qdrant points have updated timestamps |
| RBAC | User A JWT → User B's `/repos` | Returns `[]` (RLS at DB engine level, not application layer) |
| LLM Provider Swap | `LLM_PROVIDER=anthropic`, restart | All search and chat endpoints work with Anthropic models |
| Prometheus | `curl localhost:8000/metrics` | All 9 metric names present in response |
| Grafana | All 4 dashboards after indexing | Zero "No data" panels |
| RAGAS | `make eval` | Faithfulness ≥ 0.95, Context Recall ≥ 0.88, no threshold failures |
| CI Pipeline | Open a pull request | All 4 jobs run; failed test blocks merge |
| Deployment | Visit Railway/Render URL | Full app functions without any local services running |

---

## Quick Start

```bash
# 1. Clone and configure
git clone https://github.com/Sobanshahid10/CodeLens.git
cd CodeLens
cp .env.example .env
# Fill in: OPENAI_API_KEY, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, POSTGRES_PASSWORD, etc.

# 2. Start all 9 services
make up

# 3. Apply database schema + RLS policies
make migrate

# 4. Index a repository
python scripts/index_repo.py --url https://github.com/psf/requests

# 5. Open the app
open http://localhost:5173
# Flower (Celery monitor): http://localhost:5555
# Grafana dashboards:       http://localhost:3001
# Prometheus metrics:       http://localhost:9090
# Qdrant dashboard:         http://localhost:6333/dashboard
```

---

## Required Environment Variables (`.env.example`)

```bash
# ── PostgreSQL ────────────────────────────────────────────────
POSTGRES_PASSWORD=change_me_in_production

# ── Redis ─────────────────────────────────────────────────────
REDIS_PASSWORD=change_me_in_production
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0

# ── Qdrant ────────────────────────────────────────────────────
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=change_me_in_production

# ── GitHub OAuth App (create at github.com/settings/apps) ─────
GITHUB_CLIENT_ID=your_oauth_app_client_id
GITHUB_CLIENT_SECRET=your_oauth_app_client_secret
GITHUB_REDIRECT_URI=http://localhost:8000/auth/github/callback
GITHUB_WEBHOOK_SECRET=your_webhook_hmac_secret

# ── LLM Provider (choose one, comment out others) ─────────────
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# GOOGLE_API_KEY=AIza...

# ── Application ───────────────────────────────────────────────
JWT_SECRET=minimum_32_character_random_secret_here
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:5173

# ── Observability ─────────────────────────────────────────────
GRAFANA_PASSWORD=admin
DATABASE_URL=postgresql+asyncpg://codelens:${POSTGRES_PASSWORD}@postgres:5432/codelens
```

---

> This is not a tutorial project. This is what S-Tier engineering looks like.
> Every system in this plan exists in production at Anthropic, Cohere, Sourcegraph, and GitHub.
> Build it. Deploy it. Explain every design decision under pressure.
> **That is what separates a senior engineer from everyone else.**
