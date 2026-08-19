from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class ASTChunk:
    chunk_id: str  # SHA256(file_path:start_line:end_line)[:36]
    file_path: str
    language: str
    node_type: str  # e.g. "function_definition", "class_declaration"
    function_name: str | None
    docstring: str | None
    source_code: str
    start_line: int  # 1-indexed
    end_line: int  # 1-indexed
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
