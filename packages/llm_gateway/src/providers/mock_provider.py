from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from .base import BaseLLMProvider, ChatChunk, EmbeddingResult


class MockProvider(BaseLLMProvider):
    """Mock LLM and Embedding provider for testing and local offline development."""

    def __init__(self, dimensions: int = 1536) -> None:
        self._dimensions = dimensions

    @property
    def embedding_dimensions(self) -> int:
        return self._dimensions

    @property
    def embedding_model_name(self) -> str:
        return "mock-embedding-model"

    @property
    def chat_model_name(self) -> str:
        return "mock-chat-model"

    async def embed(self, texts: list[str]) -> EmbeddingResult:
        vectors: list[list[float]] = []
        for text in texts:
            # Deterministic mock embedding based on character values
            seed = sum(ord(c) for c in text) % 1000
            vec = [(float((i + seed) % 100) / 100.0) for i in range(self._dimensions)]
            # Normalize
            norm = sum(x * x for x in vec) ** 0.5 or 1.0
            vectors.append([x / norm for x in vec])

        return EmbeddingResult(
            vectors=vectors,
            model=self.embedding_model_name,
            total_tokens=sum(len(t.split()) for t in texts),
        )

    async def chat_stream(
        self,
        messages: list[dict[str, Any]],
        system_prompt: str,
        max_tokens: int = 2048,
    ) -> AsyncIterator[ChatChunk]:
        import asyncio
        import re

        last_user_msg = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                last_user_msg = m.get("content", "")
                break

        query = last_user_msg.split("User Question:")[-1].strip() if "User Question:" in last_user_msg else last_user_msg
        context_part = last_user_msg.split("User Question:")[0].replace("Relevant Code Context:", "").strip() if "User Question:" in last_user_msg else ""

        q_lower = query.lower()

        # Extract citation references if present
        citations_found = re.findall(r"--- Citation \[\d+\] ([^\s]+) \(([^)]+)\) ---", context_part)

        if any(k in q_lower for k in ["auth", "jwt", "login", "oauth", "token", "password"]):
            topic_summary = (
                f"### Authentication & Security for `{query}`\n\n"
                "Here is how authentication and access control are implemented:\n\n"
                "- **JWT & Bearer Tokens**: Requests require a signed `Authorization: Bearer <token>` header, decoded via FastAPI's `JWTMiddleware`.\n"
                "- **Row-Level Security (RLS)**: User IDs are validated against PostgreSQL sessions (`SET LOCAL app.current_user_id`), guaranteeing tenant data isolation.\n"
                "- **OAuth & Local Demo**: Supports GitHub OAuth 2.0 exchange (`/auth/github/callback`) and mock evaluation tokens (`/auth/demo`).\n\n"
                "```python\n"
                "# Token validation flow in auth middleware\n"
                "payload = decode_jwt_token(token)\n"
                "user = await db.get(User, uuid.UUID(payload['sub']))\n"
                "```"
            )
        elif any(k in q_lower for k in ["index", "chunk", "ast", "tree-sitter", "parser", "celery", "worker"]):
            topic_summary = (
                f"### Codebase Indexing & AST Pipeline for `{query}`\n\n"
                "CodeLens executes repository indexing through an asynchronous Celery task pipeline:\n\n"
                "1. **Git Clone & Traversal**: Clones the default branch and walks the filesystem, ignoring ignored patterns (`.git`, `node_modules`, `venv`).\n"
                "2. **Tree-Sitter AST Parsing**: Generates syntax trees for 8+ languages (Python, TypeScript, Go, Rust, Java, C++) to extract semantic units (classes, functions, interfaces).\n"
                "3. **Dense Vector Embeddings**: Computes 1536-dimensional embeddings for each code block and upserts metadata into Qdrant collections.\n\n"
                "```python\n"
                "# Incremental indexing step\n"
                "parser = get_parser(language)\n"
                "chunks = parser.extract_chunks(source_bytes)\n"
                "await qdrant.upsert(collection_name=repo_id, points=chunks)\n"
                "```"
            )
        elif any(k in q_lower for k in ["search", "retrieval", "hybrid", "query", "vector", "qdrant"]):
            topic_summary = (
                f"### Hybrid Search & Code Retrieval for `{query}`\n\n"
                "Code search combines semantic dense vectors with exact lexical matching:\n\n"
                "- **Vector Search**: Embeds natural language queries and queries Qdrant with cosine distance similarity.\n"
                "- **Lexical Filter**: Matches exact function names, variable identifiers, and file paths.\n"
                "- **Rank Fusion (RRF)**: Re-ranks results to return the top 5 most relevant code snippets with exact line citations.\n"
            )
        elif any(k in q_lower for k in ["graph", "dependency", "d3", "import", "topology", "architecture"]):
            topic_summary = (
                f"### Dependency Graph & Architecture for `{query}`\n\n"
                "Module relationships are mapped and visualized using interactive D3.js:\n\n"
                "- **Module Extraction**: AST parsers detect `import` statements and package bindings.\n"
                "- **Graph JSON Topology**: The API endpoint `/api/v1/repos/{repo_id}/graph` yields directed node links and degrees.\n"
                "- **Force-Directed Rendering**: D3 force simulation renders modules, chunk distributions, and interconnects.\n"
            )
        elif any(k in q_lower for k in ["ui", "front", "react", "monaco", "tailwind", "vite", "web"]):
            topic_summary = (
                f"### Frontend Architecture for `{query}`\n\n"
                "The web client is built with React 18, TypeScript, and Vite:\n\n"
                "- **3-Panel Layout**: Split into File Explorer (left), Monaco Editor (center), and SSE Streaming Chat (right).\n"
                "- **Monaco Line Highlighting**: Clicking any citation card automatically scrolls and highlights lines with green citation glyphs.\n"
                "- **Real-Time SSE Stream**: Custom `useSSEChat` hook parses token chunks as they arrive from the FastAPI backend.\n"
            )
        else:
            code_context_note = ""
            if citations_found:
                cit_list = ", ".join(f"`{c[0]}:{c[1]}`" for c in citations_found[:3])
                code_context_note = f"\n\n**Referenced Code Chunks**: Found matching sections in {cit_list}."

            topic_summary = (
                f"### Code Analysis for `{query}`\n\n"
                f"Here is the breakdown regarding `{query}` across the codebase:\n\n"
                f"- **Context Overview**: The system analyzed the repository structure to answer your query.{code_context_note}\n"
                "- **System Flow**: Requests are handled by FastAPI route controllers, validated via Pydantic schemas, and processed through the retrieval pipeline.\n"
                "- **Next Step**: You can explore the exact source files in the file explorer on the left or click any citations to review the code in Monaco."
            )

        words = topic_summary.split(" ")
        for i, word in enumerate(words):
            suffix = " " if i < len(words) - 1 else ""
            yield ChatChunk(delta=f"{word}{suffix}", finish_reason=None)
            await asyncio.sleep(0.015)

        yield ChatChunk(delta="", finish_reason="stop")


