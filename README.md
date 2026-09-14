<div align="center">

# 🔍 CodeLens

### Enterprise-Grade AI Codebase Intelligence & Visual Debugging Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?style=flat-square&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB.svg?style=flat-square&logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Qdrant](https://img.shields.io/badge/Qdrant-v1.13-dc2626.svg?style=flat-square&logo=qdrant)](https://qdrant.tech/)
[![Docker](https://img.shields.io/badge/Docker-Compose_9_Services-2496ED.svg?style=flat-square&logo=docker)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/Tests-10--Gate_QA_Suite-brightgreen.svg?style=flat-square)](#-frontend-quality-assurance--testing-suite)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

<p align="center">
  <b>CodeLens</b> is a production-ready, full-stack developer intelligence platform that indexes repositories using AST parsing, hybrid dense/sparse vector retrieval (RRF), interactive force-directed graph visualizers, and streaming RAG chat with inline line-level code citations.
</p>

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [Frontend Quality Assurance & Testing Suite](#-frontend-quality-assurance--testing-suite)
- [Backend & Infrastructure Operations](#-backend--infrastructure-operations)
- [Environment Configuration](#-environment-configuration)
- [Project Directory Structure](#-project-directory-structure)
- [Contributing & License](#-contributing--license)

---

## 🔍 Overview

CodeLens transforms complex codebases into interactive, queryable visual intelligence. By combining AST parsing across multiple programming languages with hybrid dense/sparse retrieval and real-time Server-Sent Events (SSE), developers can inspect dependency graphs, navigate code in a browser-embedded Monaco Editor, and ask natural language questions with precise file line citations.

---

## ✨ Key Features

- **🌳 AST-Aware Semantic Parsing**: Parses 8+ languages using Tree-Sitter for syntax-aware code chunking and symbol mapping.
- **⚡ Hybrid Dense + Sparse Retrieval**: Blends Qdrant HNSW dense vectors with BM25 sparse vectors via Reciprocal Rank Fusion ($RRF, k=60$).
- **💬 SSE Streaming RAG Chat**: Real-time answer streaming with interactive citation cards linking directly to exact line ranges in the editor.
- **📊 D3.js Force-Directed Dependency Graphs**: Interactive visualizer maps module imports, dependencies, and file relationships.
- **💻 Monaco Code Editor Workspace**: 3-panel split view featuring a workspace file tree, Monaco code editor, and chat assistant panel.
- **🔒 Multi-Tenant Row-Level Security (RLS)**: PostgreSQL engine-enforced tenant isolation and sliding-window Redis rate limiting.
- **📈 Comprehensive Observability**: Prometheus metrics exporter paired with Grafana dashboards for monitoring indexing queues and RAG latency.

---

## 🏗️ System Architecture

```
                       ┌──────────────────────────────────────────────┐
                       │           React 18 + Vite Frontend           │
                       │  ├─ 3-Panel Workspace (Tree | Monaco | Chat)  │
                       │  ├─ D3.js Force-Directed Dependency Graph    │
                       │  ├─ Live WebSocket Indexing Progress         │
                       │  └─ SSE Streaming Chat with Citation Cards   │
                       └──────────────────────┬───────────────────────┘
                                              │ HTTPS / WS / SSE
                                              ▼
                       ┌──────────────────────────────────────────────┐
                       │            FastAPI Async Gateway             │
                       │  ├─ GitHub OAuth + JWT Auth (7-day tokens)   │
                       │  ├─ PostgreSQL RLS Tenant Injection          │
                       │  └─ Redis Sliding-Window Rate Limiter        │
                       └──────────────┬───────────────┬───────────────┘
                                      │               │
            ┌─────────────────────────┘               └────────────────────────┐
            ▼                                                                  ▼
┌───────────────────────┐                                         ┌───────────────────────┐
│     PostgreSQL 16     │                                         │   Celery Worker Pool  │
│  (pgvector + RLS)     │                                         │  ├─ Repository Clone  │
└───────────────────────┘                                         │  ├─ AST Parallel Parse│
            ▲                                                     │  └─ Embed & Qdrant    │
            │                                                     └───────────┬───────────┘
┌───────────────────────┐                                                     │
│   Redis 7 (LRU 512MB) │                                                     │
└───────────────────────┘                                                     ▼
                                                                  ┌───────────────────────┐
                                                                  │     Qdrant Vector DB  │
                                                                  │ (HNSW Dense + BM25)   │
                                                                  └───────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend App** | React 18, Vite 6, TypeScript 5, TailwindCSS 3, Zustand, TanStack Query v5 |
| **Code Editor & Viz** | `@monaco-editor/react`, D3.js v7 (force-directed), Lucide React |
| **API Gateway** | Python 3.12, FastAPI, AsyncPG, Pydantic v2 |
| **Parsing & ML** | Tree-Sitter (8 grammars), Qdrant Vector Engine (Dense + BM25), OpenAI / Anthropic / Gemini |
| **Background Processing** | Celery 5, Redis 7 (Broker & Rate Limiting), Flower |
| **Database & Auth** | PostgreSQL 16 (`pgvector` + RLS), GitHub OAuth, JWT Bearer Auth |
| **Monitoring & QA** | Prometheus 2.52, Grafana 11, Pytest, Custom 10-Gate Bash Frontend Test Engine |

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: $\ge 18.0.0$ (LTS recommended)
- **npm**: $\ge 9.0.0$
- **Docker & Docker Compose**: Docker $\ge 24.0$
- **Python**: $\ge 3.12$ (for backend development)

---

### Quick Start (Local Docker Infrastructure)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Sobanshahid10/CodeLens.git
   cd CodeLens
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```

3. **Spin up all 9 Docker microservices**:
   ```bash
   make dev
   ```

4. **Run database migrations**:
   ```bash
   make migrate
   ```

---

### Running the Web Application (Frontend)

```bash
# Navigate to web application directory
cd apps/web

# Install dependencies
npm install

# Start local Vite development server (runs on http://localhost:3000)
npm run dev
```

Available web app scripts in `apps/web/package.json`:
- `npm run dev` — Launches Vite dev server with proxy to backend (`http://localhost:8000`).
- `npm run build` — Runs TypeScript compiler (`tsc --noEmit`) and creates optimized bundle via Vite.
- `npm run preview` — Serves local production build on `http://localhost:4173`.
- `bash test_frontend.sh` — Executes complete 10-gate automated frontend QA test suite.

---

## 🧪 Frontend Quality Assurance & Testing Suite

CodeLens includes an **automated 10-Gate Frontend Test Suite** located at [`apps/web/test_frontend.sh`](file:///Users/muhammadsoban/CodeLens/apps/web/test_frontend.sh). It validates type safety, code quality, state management logic, routing, API networking, environment security, and live browser rendering.

### Running the Frontend Quality Suite

```bash
cd apps/web

# Run full test suite (including npm install and live browser server test)
./test_frontend.sh

# Fast test run (skip npm install & skip background browser execution)
./test_frontend.sh --skip-browser --skip-install
```

### The 10 Automated Quality Gates

```
  ╔══════════════════════════════════════════════════╗
  ║   CodeLens Frontend – Full Test Suite            ║
  ╚══════════════════════════════════════════════════╝
```

1. **📦 1. Dependency Integrity Verification**: Verifies presence of `node_modules` and audits critical packages (`react`, `@tanstack/react-query`, `zustand`, `@monaco-editor/react`, `d3`, `lucide-react`).
2. **🔷 2. Strict TypeScript Type-Check (`tsc --noEmit`)**: Ensures zero type errors across all `.ts` and `.tsx` source files.
3. **🏗️ 3. Production Build Validation (`vite build`)**: Compiles production distribution bundles and verifies generation of `dist/index.html`.
4. **📊 4. Bundle Size & Chunk Analysis**: Measures output chunk sizes, warning if any chunk exceeds the 500 KB performance threshold.
5. **🔍 5. Source Code Audit**:
   - Detects stray `console.log` / `console.error` calls.
   - Audits unresolved `TODO`, `FIXME`, and `HACK` comments.
   - Verifies explicit named exports for all Components, Pages, Hooks, Stores, and Libs.
6. **🛣️ 6. Route Coverage Check**: Scans `App.tsx` for route definitions (`/login`, `/dashboard`, `/repo/:repoId`, `/repo/:repoId/graph`, `/auth/callback`) and verifies `ProtectedRoute` wrappers.
7. **⚡ 7. Zustand Store & Hook Logic Smoke Tests**: Executes isolated Node.js ESM unit tests for:
   - **Toast Notifications**: ID uniqueness, default/custom durations, state removal, and all 4 toast types.
   - **Auth Store**: LocalStorage token persistence, clearToken, and authentication status transitions.
   - **API Client**: Endpoint URL formatting, query parameter building, and header injection.
   - **Route Guards**: Unauthenticated redirect logic.
8. **🌐 8. API Gateway Health & Network Test**: Tests HTTP reachability against backend API endpoints (`/health` and `/api/v1/auth/demo`).
9. **🔑 9. Environment Security Audit**: Compares `.env` against `.env.example` to ensure all mandatory keys are populated.
10. **🌐 10. Live Browser Smoke Test**: Starts a background Vite dev server instance on port `3000`, verifies HTTP 200 responses on key routes, and checks `#root` React DOM mount points.

---

## 🔧 Backend & Infrastructure Operations

Run standard development operations using the root `Makefile`:

```bash
make up       # Launch Docker containers in detached mode
make dev      # Launch live development environment with container logs
make down     # Stop all containers and remove volumes
make migrate  # Apply latest Alembic database migrations
make lint     # Run Ruff check and MyPy type checker on Python codebase
make test     # Execute Pytest suite with coverage reports
make eval     # Run RAGAS ground-truth evaluation suite
```

---

## 🔐 Environment Configuration

Key environment variables defined in `.env.example`:

| Key | Description | Example / Default |
|---|---|---|
| `POSTGRES_PASSWORD` | Database connection password | `codelens_dev_pass` |
| `REDIS_PASSWORD` | Redis auth password | `redis_dev_pass` |
| `QDRANT_API_KEY` | Vector DB API key | `qdrant_dev_key` |
| `JWT_SECRET` | Secret key for JWT auth tokens | `super-secret-jwt-key` |
| `GITHUB_CLIENT_ID` | OAuth application client ID | `your_github_client_id` |
| `GITHUB_CLIENT_SECRET` | OAuth application client secret | `your_github_client_secret` |
| `LLM_PROVIDER` | LLM Gateway strategy (`openai`, `anthropic`, `gemini`) | `openai` |
| `OPENAI_API_KEY` | OpenAI API key for embeddings & chat | `sk-...` |

---

## 📁 Project Directory Structure

```
CodeLens/
├── apps/
│   ├── api/                  # FastAPI web gateway & controllers
│   ├── eval/                 # RAGAS ground-truth evaluation scripts
│   ├── web/                  # React 18 + Vite frontend workspace
│   │   ├── src/
│   │   │   ├── components/   # ChatPanel, Monaco Viewer, D3 Graph, FileTree, etc.
│   │   │   ├── hooks/        # Custom React hooks (useSSEChat, useToast, etc.)
│   │   │   ├── lib/          # API client, Auth, SSE handlers
│   │   │   ├── pages/        # Dashboard, Workspace, Graph, Login, AuthCallback
│   │   │   └── stores/       # Zustand state stores (auth, repo, palette)
│   │   └── test_frontend.sh  # 10-Gate Automated Frontend QA Script
│   └── worker/               # Celery worker background tasks
├── packages/
│   ├── ast_parser/           # Tree-sitter multi-language AST chunking engine
│   ├── core/                 # Shared data models, interfaces, DB utils
│   └── llm_gateway/          # Strategy-pattern client for OpenAI/Anthropic/Gemini
├── infra/
│   ├── docker/               # Dockerfiles for API, Worker, Postgres
│   ├── grafana/              # Grafana dashboards & provisioning
│   └── prometheus/           # Prometheus metrics configuration
├── docker-compose.yml        # 9-service production configuration
├── docker-compose.dev.yml    # Development override configuration
├── Makefile                  # CLI operation shortcut commands
└── README.md                 # Primary documentation
```

---

## 📄 License & Acknowledgments

This project is licensed under the [MIT License](LICENSE).

Built with ❤️ for developers who love clean architecture, deep codebase insights, and seamless AI workflow integration.
