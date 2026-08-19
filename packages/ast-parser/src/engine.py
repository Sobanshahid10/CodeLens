from __future__ import annotations

import hashlib
from collections.abc import Iterator
from pathlib import Path

import tree_sitter_cpp
import tree_sitter_go
import tree_sitter_java
import tree_sitter_javascript
import tree_sitter_python
import tree_sitter_ruby
import tree_sitter_rust
import tree_sitter_typescript
from tree_sitter import Language, Node, Parser

from packages.ast_parser.src.models import ASTChunk


def _get_ts_grammar() -> object:
    if hasattr(tree_sitter_typescript, "language_typescript"):
        return tree_sitter_typescript.language_typescript()
    return getattr(tree_sitter_typescript, "language")()


LANGUAGE_MAP: dict[str, tuple[object, frozenset[str]]] = {
    "python": (
        tree_sitter_python.language(),
        frozenset(["function_definition", "class_definition", "decorated_definition"]),
    ),
    "javascript": (
        tree_sitter_javascript.language(),
        frozenset(
            [
                "function_declaration",
                "function_expression",
                "arrow_function",
                "class_declaration",
            ]
        ),
    ),
    "typescript": (
        _get_ts_grammar(),
        frozenset(
            [
                "function_declaration",
                "function_signature",
                "class_declaration",
                "method_definition",
            ]
        ),
    ),
    "go": (
        tree_sitter_go.language(),
        frozenset(["function_declaration", "method_declaration", "type_declaration"]),
    ),
    "java": (
        tree_sitter_java.language(),
        frozenset(["method_declaration", "class_declaration", "interface_declaration"]),
    ),
    "rust": (
        tree_sitter_rust.language(),
        frozenset(["function_item", "impl_item", "struct_item", "trait_item"]),
    ),
    "cpp": (
        tree_sitter_cpp.language(),
        frozenset(["function_definition", "class_specifier", "namespace_definition"]),
    ),
    "ruby": (
        tree_sitter_ruby.language(),
        frozenset(["method", "singleton_method", "class", "module"]),
    ),
}

FILE_EXTENSION_MAP: dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".go": "go",
    ".java": "java",
    ".rs": "rust",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".h": "cpp",
    ".hpp": "cpp",
    ".rb": "ruby",
}

SKIP_PATHS: set[str] = {
    "node_modules",
    ".git",
    "__pycache__",
    ".venv",
    "dist",
    "build",
    "vendor",
}


class ASTParser:
    def __init__(self) -> None:
        """Initialize one tree-sitter Parser per language."""
        self.parsers: dict[str, Parser] = {}
        self.target_types: dict[str, frozenset[str]] = {}
        for lang_name, (grammar, target_types) in LANGUAGE_MAP.items():
            parser = Parser()
            lang_obj = Language(grammar)
            if hasattr(parser, "set_language"):
                parser.set_language(lang_obj)
            else:
                parser.language = lang_obj
            self.parsers[lang_name] = parser
            self.target_types[lang_name] = target_types

    def parse_file(self, file_path: Path) -> list[ASTChunk]:
        """Read and parse a single file, returning all code chunks."""
        ext = file_path.suffix.lower()
        if ext not in FILE_EXTENSION_MAP:
            return []

        language = FILE_EXTENSION_MAP[ext]

        # Skip large files > 500KB
        try:
            if file_path.stat().st_size > 500 * 1024:
                return []
            source = file_path.read_bytes()
        except Exception:
            return []

        parser = self.parsers[language]
        tree = parser.parse(source)
        source_text = source.decode("utf-8", errors="ignore")

        chunks: list[ASTChunk] = []
        imports = self._extract_imports(tree.root_node, source_text, language)

        for node in self._walk_target_nodes(tree.root_node, self.target_types[language]):
            chunk = self._node_to_chunk(node, file_path, language, source_text, imports)
            if chunk and chunk.token_estimate <= 8192:
                chunks.append(chunk)

        return chunks

    def parse_directory(self, directory: Path, max_files: int = 5000) -> Iterator[ASTChunk]:
        """Recursively parse all supported files in a directory."""
        file_count = 0
        for file_path in directory.rglob("*"):
            if file_count >= max_files:
                break

            # Skip directories
            if not file_path.is_file():
                continue

            # Skip blacklisted paths
            if any(skip in file_path.parts for skip in SKIP_PATHS):
                continue

            # Only process supported extensions
            if file_path.suffix.lower() not in FILE_EXTENSION_MAP:
                continue

            file_count += 1
            yield from self.parse_file(file_path)

    def _walk_target_nodes(self, node: Node, target_types: frozenset[str]) -> Iterator[Node]:
        """DFS walk yielding only target node types, without recursing into them."""
        if node.type in target_types:
            yield node
            # Don't recurse into this node to avoid nested duplicates
        else:
            for child in node.children:
                yield from self._walk_target_nodes(child, target_types)

    def _extract_name(self, node: Node, language: str) -> str | None:
        """Extract the name of a function/class/method."""
        if node.type == "decorated_definition":
            for child in node.children:
                if child.type in {"function_definition", "class_definition"}:
                    name_node = child.child_by_field_name("name")
                    if name_node and name_node.text:
                        return name_node.text.decode("utf-8")

        name_node = node.child_by_field_name("name")
        if name_node and name_node.text:
            return name_node.text.decode("utf-8")

        # Go type declarations: type Foo struct {}
        if language == "go" and node.type == "type_declaration":
            for child in node.children:
                if child.type == "type_spec":
                    spec_name = child.child_by_field_name("name")
                    if spec_name and spec_name.text:
                        return spec_name.text.decode("utf-8")

        # C++ function definitions: declarator -> function_declarator -> identifier
        if language == "cpp":
            decl = node.child_by_field_name("declarator")
            while decl and decl.type == "function_declarator":
                inner = decl.child_by_field_name("declarator")
                if inner:
                    decl = inner
                else:
                    for child in decl.children:
                        if child.type == "identifier" and child.text:
                            return child.text.decode("utf-8")
                    break
            if decl and decl.text:
                return decl.text.decode("utf-8")

        return None

    def _extract_docstring(self, node: Node, source_text: str, language: str) -> str | None:
        """Extract docstring (Python only for now)."""
        if language != "python":
            return None

        target_node = node
        if node.type == "decorated_definition":
            for child in node.children:
                if child.type in {"function_definition", "class_definition"}:
                    target_node = child
                    break

        # For Python, check if first statement in body is a string
        for child in target_node.children:
            if child.type == "block":
                for stmt in child.children:
                    if stmt.type == "expression_statement":
                        for subchild in stmt.children:
                            if subchild.type == "string" and subchild.text:
                                text = subchild.text.decode("utf-8")
                                # Strip triple quotes or single quotes
                                for quote in ['"""', "'''", '"', "'"]:
                                    if text.startswith(quote) and text.endswith(quote):
                                        return text[len(quote) : -len(quote)]
                                return text
                break
        return None

    def _extract_imports(self, root: Node, source_text: str, language: str) -> list[str]:
        """Extract import statements."""
        imports: list[str] = []
        import_types: dict[str, list[str]] = {
            "python": ["import_statement", "import_from_statement"],
            "javascript": ["import_statement"],
            "typescript": ["import_statement"],
            "go": ["import_declaration"],
            "java": ["import_declaration"],
            "rust": ["use_declaration"],
            "cpp": ["preproc_include"],
            "ruby": ["require_statement"],
        }

        target = import_types.get(language, [])
        for child in root.children:
            if child.type in target and child.text:
                text = child.text.decode("utf-8").strip()
                if text and len(imports) < 20:
                    imports.append(text)

        return imports

    def _compute_cyclomatic_complexity(self, node: Node) -> int:
        """Count decision points in a function."""
        complexity = 1
        decision_types = {
            "if_statement",
            "elif_clause",
            "for_statement",
            "while_statement",
            "except_clause",
            "boolean_operator",
            "conditional_expression",
            "case_clause",
            "catch_clause",
            "ternary_expression",
            "switch_statement",
        }

        def count_decisions(n: Node) -> None:
            nonlocal complexity
            if n.type in decision_types:
                complexity += 1
            for child in n.children:
                count_decisions(child)

        for child in node.children:
            count_decisions(child)

        return complexity

    def _node_to_chunk(
        self,
        node: Node,
        file_path: Path,
        language: str,
        source_text: str,
        file_imports: list[str],
    ) -> ASTChunk | None:
        """Convert a tree-sitter node to an ASTChunk."""
        start_line = node.start_point[0] + 1
        end_line = node.end_point[0] + 1
        if not node.text:
            return None
        source_code = node.text.decode("utf-8")
        function_name = self._extract_name(node, language)
        docstring = self._extract_docstring(node, source_text, language)

        chunk_id = hashlib.sha256(
            f"{file_path}:{start_line}:{end_line}".encode()
        ).hexdigest()[:36]

        return ASTChunk(
            chunk_id=chunk_id,
            file_path=str(file_path),
            language=language,
            node_type=node.type,
            function_name=function_name,
            docstring=docstring,
            source_code=source_code,
            start_line=start_line,
            end_line=end_line,
            imports=file_imports,
            cyclomatic_complexity=self._compute_cyclomatic_complexity(node),
        )
