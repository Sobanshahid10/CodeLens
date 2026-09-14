<div align="center">

# 💻 CodeLens Web Client (`apps/web`)

### React 18 + Vite + TypeScript Enterprise Frontend Workspace

[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?style=flat-square&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg?style=flat-square&logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-5.0-bear.svg?style=flat-square)](https://github.com/pmndrs/zustand)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-v5-FF4154.svg?style=flat-square&logo=react-query)](https://tanstack.com/query)

</div>

---

## 📖 Overview

The **CodeLens Web Client** is a high-performance developer workspace designed for repository intelligence, AST dependency graph visualization, and real-time streaming RAG assistant chat with line-level code citations.

---

## 🧩 Component Architecture

| Component | Path | Description |
|---|---|---|
| **ChatPanel** | `src/components/ChatPanel.tsx` | Real-time SSE streaming chat interface featuring Markdown rendering and line citation cards. |
| **CodeViewer** | `src/components/CodeViewer.tsx` | Monaco Editor integration with line highlighting and syntax support. |
| **DependencyGraph** | `src/components/DependencyGraph.tsx` | D3.js force-directed graph visualizer mapping module imports and call topologies. |
| **FileTree** | `src/components/FileTree.tsx` | Collapsible workspace file navigation tree with selection state. |
| **CommandPalette** | `src/components/CommandPalette.tsx` | Global keyboard shortcut overlay (`Cmd+K` / `Cmd+P`) for repository navigation. |
| **IndexingProgress** | `src/components/IndexingProgress.tsx` | Real-time WebSocket listener tracking repository indexing progress %. |
| **ToastContainer** | `src/components/ToastContainer.tsx` | Animated notification system for alerts, info, warnings, and errors. |
| **UserMenu** | `src/components/UserMenu.tsx` | Authentication profile menu, plan indicator, and logout control. |

---

## ⚡ State Management & Hooks

### Zustand Stores (`src/stores/`)
- `authStore.ts` — Handles GitHub OAuth tokens, user profiles, local storage sync, and demo authentication.
- `repoStore.ts` — Maintains active workspace repository context, selected files, and tree nodes.
- `commandPaletteStore.ts` — Controls global modal visibility and keyboard shortcuts (`Cmd+K`).

### Custom Hooks (`src/hooks/`)
- `useSSEChat.ts` — Manages Server-Sent Events stream for AI response generation and citation extraction.
- `useIndexingProgress.ts` — Establishes WebSocket connections for real-time repository ingestion updates.
- `useToast.ts` — Hook for triggering user notifications (`success`, `error`, `info`, `warning`).

---

## 🛣️ Application Routes

- `/login` — Public GitHub OAuth & Demo login landing page.
- `/auth/callback` — OAuth code exchange callback handler.
- `/dashboard` — Protected workspace repository catalog dashboard.
- `/repo/:repoId` — 3-Panel main workspace (File Tree, Monaco Editor, Chat Assistant).
- `/repo/:repoId/graph` — Full-screen interactive D3 dependency graph visualizer.

---

## 🧪 Automated 10-Gate Quality Assurance (`test_frontend.sh`)

The web client includes an automated **10-Gate Quality Assurance Test Suite**:

```bash
# Execute full QA test suite
./test_frontend.sh

# Fast execution (skips npm install & browser execution)
./test_frontend.sh --skip-browser --skip-install
```

### Verified Quality Gates:
1. **Dependency Integrity** (React, Monaco, D3, Zustand, Query)
2. **TypeScript Strict Verification** (`tsc --noEmit`)
3. **Vite Production Build** (`vite build`)
4. **Bundle Chunk Size Audits** (< 500 KB limit)
5. **Source Code Audits** (Console statements, TODOs, named exports)
6. **Route & Guard Coverage** (`App.tsx` & `ProtectedRoute`)
7. **Zustand & Hook Logic Smoke Unit Tests** (Node ESM)
8. **Backend API Connectivity** (`http://localhost:8000`)
9. **Environment Configuration Audit** (`.env` keys)
10. **Browser Live HTTP 200 Route Verification**
