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
[![Tests](https://img.shields.io/badge/Tests-10--Gate_QA_Passed-brightgreen.svg?style=flat-square)](#-frontend-quality-assurance--testing-suite)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](LICENSE)

<p align="center">
  <b>CodeLens</b> is a high-performance codebase intelligence platform. It indexes multi-language repositories using AST parsing, hybrid dense/sparse vector retrieval ($RRF, k=60$), D3.js force-directed dependency graph visualizers, and streaming RAG chat with line-level code citations.
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
- [License](#-license)

---

## 🔍 Overview

CodeLens turns complex, multi-thousand file repositories into interactive visual workspace graphs. By coupling multi-language AST symbol extraction with hybrid vector search and real-time Server-Sent Events (SSE), engineers can query their codebases in natural language, visually inspect dependency topologies, and trace logic using embedded Monaco Editor views.

---

## ✨ Key Features

- **🌳 AST-Aware Semantic Parsing**: Multi-language AST chunking via Tree-Sitter (8+ grammars) preserves function, class, and interface boundaries instead of arbitrary token cuts.
- **⚡ Hybrid Dense + Sparse Retrieval (RRF)**: Combines Qdrant HNSW dense semantic embeddings with BM25 sparse keyword vectors via Reciprocal Rank Fusion ($k=60$).
- **💬 SSE Streaming RAG Chat**: Real-time streaming conversational assistant providing answer streams with clickable line-level code citations.
- **📊 D3.js Force-Directed Dependency Graph**: Interactive topology viewer rendering call graphs, module dependencies, and import structures.
- **💻 3-Panel Monaco Editor Workspace**: VS Code-powered editor integration featuring a live workspace file tree, code viewer, and assistant panel.
- **🔒 PostgreSQL Engine Row-Level Security (RLS)**: Enforces strict multi-tenant isolation at the database level paired with Redis sliding-window rate limiting.
- **📈 Native Observability Suite**: Integrated Prometheus metrics collection and pre-configured Grafana dashboards for job queues and RAG latency profiling.

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

| Domain | Technology / Library | Description |
|---|---|---|
| **Frontend Platform** | React 18, Vite 6, TypeScript 5 | Lightning-fast HMR & build environment |
| **Styling & State** | TailwindCSS 3, Zustand 5, TanStack Query v5 | Responsive UI tokens and unified store management |
| **Editor & Graph** | `@monaco-editor/react`, D3.js v7, Lucide React | VS Code editing engine & force-directed visualization |
| **API Gateway** | Python 3.12, FastAPI, AsyncPG, Pydantic v2 | High-concurrency async HTTP/WS backend |
| **Vector Engine & RAG** | Qdrant v1.13, Tree-Sitter, OpenAI / Anthropic / Gemini | Dense HNSW + Sparse BM25 hybrid search |
| **Task Queue & Cache** | Celery 5, Redis 7, Flower | Distributed asynchronous worker processing |
| **Persistence & Security**| PostgreSQL 16 (`pgvector` + RLS), JWT Auth | Engine-level tenant isolation & vector storage |
| **Monitoring & QA** | Prometheus 2.52, Grafana 11, Pytest | Production metrics telemetry & health monitoring |

---

## 🚀 Getting Started

### Prerequisites

Ensure the following tools are installed locally:
- **Node.js**: $\ge 18.0.0$ (LTS recommended)
- **npm**: $\ge 9.0.0$
- **Docker & Docker Compose**: Docker Engine $\ge 24.0$
- **Python**: $\ge 3.12$ (for backend services)

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

# Start local Vite dev server (http://localhost:3000)
npm run dev
```

Available scripts in `apps/web/package.json`:
- `npm run dev` — Launches Vite dev server with backend API proxy (`http://localhost:8000`).
- `npm run build` — Runs TypeScript compiler (`tsc --noEmit`) and creates production build.
- `npm run preview` — Serves local production build on `http://localhost:4173`.
- `bash test_frontend.sh` — Executes the complete 10-gate frontend QA test suite.

---

## 🧪 Frontend Quality Assurance & Testing Suite

CodeLens features a custom **10-Gate Automated Frontend QA Engine** located at [`apps/web/test_frontend.sh`](file:///Users/muhammadsoban/CodeLens/apps/web/test_frontend.sh). It validates type safety, source audits, store state logic, routing integrity, API reachability, and browser rendering.

### Running the Frontend Test Suite

```bash
cd apps/web

# Full execution (includes npm install & background browser check)
./test_frontend.sh

# Fast execution (skips npm install & browser spawn)
./test_frontend.sh --skip-browser --skip-install
```

### Breakdown of the 10 Quality Gates

```
  ╔══════════════════════════════════════════════════╗
  ║   CodeLens Frontend – Full Test Suite            ║
  ╚══════════════════════════════════════════════════╝
```

| Gate | Name | Description & Verification Standard |
|:---:|---|---|
| **1** | **Dependency Integrity** | Verifies presence of `node_modules` and required core libraries (`react`, `@tanstack/react-query`, `zustand`, `@monaco-editor/react`, `d3`, `lucide-react`). |
| **2** | **TypeScript Type-Check** | Runs `npx tsc --noEmit` across all `.ts` and `.tsx` source files to guarantee zero type errors. |
| **3** | **Production Build** | Executes `vite build` to verify clean production compilation and distribution output. |
| **4** | **Bundle Size Analysis** | Measures JavaScript chunk sizes, issuing warnings if any single chunk exceeds 500 KB. |
| **5** | **Source File Audit** | Scans for stray `console.log` statements, unresolved `TODO`/`FIXME` tags, and verifies explicit named exports for components, pages, hooks, and stores. |
| **6** | **Route Coverage Check** | Audits route declarations (`/login`, `/dashboard`, `/repo/:repoId`, `/repo/:repoId/graph`, `/auth/callback`) in `App.tsx` and checks `ProtectedRoute` wrapping. |
| **7** | **Store & Hook Logic** | Runs inline Node.js unit-smoke tests for Zustand Toast & Auth stores, API URL builders, and route redirection logic (**16/16 passed**). |
| **8** | **API Network Test** | Tests backend HTTP reachability at `http://localhost:8000/health` and `/api/v1/auth/demo`. |
| **9** | **Environment Audit** | Compares key definitions between `.env` and `.env.example`. |
| **10** | **Browser Live Verification** | Launches background dev server on port `3000`, checking HTTP 200 responses and DOM `#root` mount point. |

---

## 🔧 Backend & Infrastructure Operations

Execute operations using root `Makefile` shortcuts:

```bash
make up       # Launch all 9 Docker containers in background
make dev      # Launch dev environment with streaming service logs
make down     # Terminate all containers and purge volumes
make migrate  # Apply Alembic schema migrations
make lint     # Execute Ruff linter and MyPy static type analyzer
make test     # Execute Pytest test suite with coverage
make eval     # Execute RAGAS ground-truth evaluation pipeline
```

---

## 🔐 Environment Configuration

Key configuration parameters in `.env`:

| Key | Purpose | Default / Format |
|---|---|---|
| `POSTGRES_PASSWORD` | PostgreSQL superuser password | `codelens_dev_pass` |
| `REDIS_PASSWORD` | Redis authentication password | `redis_dev_pass` |
| `QDRANT_API_KEY` | Vector DB security key | `qdrant_dev_key` |
| `JWT_SECRET` | Signing key for authorization tokens | `super-secret-jwt-key` |
| `GITHUB_CLIENT_ID` | OAuth application ID | `your_github_client_id` |
| `GITHUB_CLIENT_SECRET` | OAuth application secret | `your_github_client_secret` |
| `LLM_PROVIDER` | Swappable LLM strategy (`openai`, `anthropic`, `gemini`) | `openai` |
| `OPENAI_API_KEY` | OpenAI secret API key | `sk-...` |

---

## 📁 Project Directory Structure

```
CodeLens/
├── apps/
│   ├── api/                  # FastAPI Web Gateway, Controllers & Middleware
│   ├── eval/                 # RAGAS Ground-Truth Evaluation Suite
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
├── docker-compose.yml        # 9-Service Infrastructure Manifest
├── docker-compose.dev.yml    # Local Development Override Configuration
├── Makefile                  # Operational Command Shortcuts
└── README.md                 # Project Documentation
```

---

## 📄 License

This repository is licensed under the [MIT License](LICENSE).
