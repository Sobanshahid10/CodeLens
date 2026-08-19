from __future__ import annotations

from pathlib import Path

import pytest

from packages.ast_parser.src.engine import ASTParser


@pytest.fixture
def parser() -> ASTParser:
    return ASTParser()


@pytest.fixture
def temp_py_file(tmp_path: Path) -> Path:
    """Create a test Python file."""
    file = tmp_path / "test.py"
    file.write_text('''
def greet(name):
    """Say hello."""
    return f"Hello, {name}!"

class Calculator:
    """Simple math operations."""
    def add(self, a, b):
        return a + b
''')
    return file


def test_parse_python_function(parser: ASTParser, temp_py_file: Path) -> None:
    """Test extraction of Python functions."""
    chunks = parser.parse_file(temp_py_file)
    assert len(chunks) >= 1
    assert any(c.node_type == "function_definition" for c in chunks)
    greet_chunk = next(c for c in chunks if c.function_name == "greet")
    assert greet_chunk.function_name == "greet"
    assert "File:" in greet_chunk.embedding_context
    assert greet_chunk.token_estimate > 0


def test_parse_python_class(parser: ASTParser, temp_py_file: Path) -> None:
    """Test extraction of Python classes."""
    chunks = parser.parse_file(temp_py_file)
    assert any(c.node_type == "class_definition" for c in chunks)
    calc_chunk = next(c for c in chunks if c.function_name == "Calculator")
    assert calc_chunk.function_name == "Calculator"


def test_docstring_extraction(parser: ASTParser, temp_py_file: Path) -> None:
    """Test docstring extraction from functions."""
    chunks = parser.parse_file(temp_py_file)
    docstring_chunks = [c for c in chunks if c.docstring]
    assert len(docstring_chunks) > 0
    assert docstring_chunks[0].docstring is not None
    assert "Say hello." in docstring_chunks[0].docstring


def test_import_extraction(parser: ASTParser, tmp_path: Path) -> None:
    """Test import statement extraction."""
    file = tmp_path / "imports.py"
    file.write_text('''
import os
from pathlib import Path

def work():
    pass
''')
    chunks = parser.parse_file(file)
    assert len(chunks) > 0
    imports = chunks[0].imports
    assert any("os" in imp for imp in imports)
    assert any("pathlib" in imp for imp in imports)


def test_skip_large_files(parser: ASTParser, tmp_path: Path) -> None:
    """Test that files > 500KB are skipped."""
    file = tmp_path / "large.py"
    file.write_text("x = 1\n" * 100_000)  # ~600KB
    chunks = parser.parse_file(file)
    assert len(chunks) == 0


def test_cyclomatic_complexity(parser: ASTParser, tmp_path: Path) -> None:
    """Test cyclomatic complexity calculation."""
    file = tmp_path / "complex.py"
    file.write_text('''
def check_value(x):
    if x > 0:
        if x > 10:
            return "large"
        else:
            return "medium"
    else:
        return "small"
''')
    chunks = parser.parse_file(file)
    assert len(chunks) > 0
    # Counts if statements → complexity >= 2
    assert chunks[0].cyclomatic_complexity >= 2


def test_parse_go_methods(parser: ASTParser, tmp_path: Path) -> None:
    """Test extraction of Go methods and types."""
    go_file = tmp_path / "main.go"
    go_file.write_text('''
package main

import "fmt"

type Service struct{}

func (s *Service) Execute() error {
    return nil
}

func main() {
    fmt.Println("run")
}
''')
    chunks = parser.parse_file(go_file)
    assert len(chunks) >= 2
    names = [c.function_name for c in chunks]
    assert "Execute" in names or "Service" in names or "main" in names


def test_should_skip_blacklisted_paths(parser: ASTParser, tmp_path: Path) -> None:
    """Test that files in blacklisted directories are skipped during directory parsing."""
    node_dir = tmp_path / "node_modules" / "some_pkg"
    node_dir.mkdir(parents=True)
    (node_dir / "index.js").write_text("function bad() {}")

    valid_dir = tmp_path / "src"
    valid_dir.mkdir(parents=True)
    (valid_dir / "index.js").write_text("function good() {}")

    chunks = list(parser.parse_directory(tmp_path))
    assert len(chunks) == 1
    assert "src" in chunks[0].file_path
    assert "node_modules" not in chunks[0].file_path
