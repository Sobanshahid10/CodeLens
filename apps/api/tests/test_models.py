import uuid

from app.db.models import (
    ASTChunk,
    ChatMessage,
    ChatSession,
    DependencyEdge,
    Repository,
    RepositoryMember,
    User,
    WebhookEvent,
)
from app.db.session import Base


def test_models_registered_in_metadata() -> None:
    """Verify all 8 expected tables are properly registered in SQLAlchemy metadata."""
    expected_tables = {
        "users",
        "repositories",
        "repository_members",
        "ast_chunks",
        "dependency_edges",
        "chat_sessions",
        "chat_messages",
        "webhook_events",
    }
    registered_tables = set(Base.metadata.tables.keys())
    assert expected_tables.issubset(registered_tables), (
        f"Missing tables: {expected_tables - registered_tables}"
    )


def test_user_model_columns() -> None:
    """Verify User model column schema, keys, and default definitions."""
    user = User(
        github_id=12345,
        github_login="octocat",
        email="octocat@github.com",
        avatar_url="https://avatars.githubusercontent.com/u/12345",
        plan="free",
    )
    assert user.github_id == 12345
    assert user.github_login == "octocat"
    assert user.plan == "free"
    assert User.__table__.c.plan.default.arg == "free"
    assert str(User.__table__.c.plan.server_default.arg) == "free"


def test_repository_model_columns() -> None:
    """Verify Repository model column definitions and default constraints."""
    owner_id = uuid.uuid4()
    repo = Repository(
        owner_id=owner_id,
        github_url="https://github.com/octocat/hello-world",
        github_full_name="octocat/hello-world",
        default_branch="main",
        indexing_status="pending",
        indexing_progress=0,
        total_chunks=0,
    )
    assert repo.owner_id == owner_id
    assert repo.default_branch == "main"
    assert repo.indexing_status == "pending"
    assert repo.indexing_progress == 0
    assert repo.total_chunks == 0
    assert Repository.__table__.c.default_branch.default.arg == "main"
    assert Repository.__table__.c.indexing_status.default.arg == "pending"


def test_ast_chunk_model_columns() -> None:
    """Verify ASTChunk model attributes, indexing, and TSVECTOR generation."""
    repo_id = uuid.uuid4()
    chunk = ASTChunk(
        repository_id=repo_id,
        file_path="src/main.py",
        language="python",
        node_type="function_definition",
        function_name="main",
        docstring="Entry point function.",
        source_code="def main():\n    print('hello')",
        start_line=1,
        end_line=2,
        cyclomatic_complexity=1,
        token_count=10,
    )
    assert chunk.language == "python"
    assert chunk.node_type == "function_definition"
    assert chunk.function_name == "main"
    assert chunk.cyclomatic_complexity == 1
    table = ASTChunk.__table__
    index_names = [idx.name for idx in getattr(table, "indexes", set())]
    assert "ix_ast_chunks_repo_file" in index_names
    assert "ix_ast_chunks_search_vector" in index_names


def test_repository_member_model_columns() -> None:
    """Verify RepositoryMember model attributes and unique constraint."""
    repo_id = uuid.uuid4()
    user_id = uuid.uuid4()
    member = RepositoryMember(
        repository_id=repo_id,
        user_id=user_id,
        role="admin",
    )
    assert member.repository_id == repo_id
    assert member.user_id == user_id
    assert member.role == "admin"
    assert RepositoryMember.__table__.c.role.default.arg == "viewer"


def test_dependency_edge_model_columns() -> None:
    """Verify DependencyEdge model attributes and weights."""
    repo_id = uuid.uuid4()
    edge = DependencyEdge(
        repository_id=repo_id,
        source_file="app/main.py",
        target_file="app/db/session.py",
        edge_type="import",
        weight=1,
    )
    assert edge.edge_type == "import"
    assert edge.weight == 1
    assert DependencyEdge.__table__.c.weight.default.arg == 1


def test_chat_models_columns() -> None:
    """Verify ChatSession and ChatMessage model relationships."""
    repo_id = uuid.uuid4()
    user_id = uuid.uuid4()
    session = ChatSession(
        repository_id=repo_id,
        user_id=user_id,
        title="Testing Session",
    )
    message = ChatMessage(
        session_id=session.id,
        role="user",
        content="What does this repository do?",
        citations=[],
        token_count=8,
    )
    assert message.role == "user"
    assert message.citations == []
    assert str(ChatMessage.__table__.c.citations.server_default.arg) == "[]"


def test_webhook_event_model_columns() -> None:
    """Verify WebhookEvent model schema and defaults."""
    event = WebhookEvent(
        event_type="push",
        delivery_id="del_123456789",
        payload={"ref": "refs/heads/main"},
        processed=False,
    )
    assert event.event_type == "push"
    assert event.delivery_id == "del_123456789"
    assert event.processed is False
    assert WebhookEvent.__table__.c.processed.default.arg is False
