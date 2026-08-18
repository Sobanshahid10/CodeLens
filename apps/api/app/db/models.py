import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    Computed,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class User(Base):
    """User accounts authenticated via GitHub OAuth."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    github_id: Mapped[int] = mapped_column(
        BigInteger, unique=True, index=True, nullable=False
    )
    github_login: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    plan: Mapped[str] = mapped_column(
        String(50), default="free", server_default="free", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        onupdate=func.now(),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    owned_repositories: Mapped[list["Repository"]] = relationship(
        "Repository", back_populates="owner", cascade="all, delete-orphan"
    )
    memberships: Mapped[list["RepositoryMember"]] = relationship(
        "RepositoryMember", back_populates="user", cascade="all, delete-orphan"
    )
    chat_sessions: Mapped[list["ChatSession"]] = relationship(
        "ChatSession", back_populates="user", cascade="all, delete-orphan"
    )


class Repository(Base):
    """Connected Git repositories indexed for code intelligence."""

    __tablename__ = "repositories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    github_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    github_full_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    default_branch: Mapped[str] = mapped_column(
        String(100), default="main", server_default="main", nullable=False
    )
    last_indexed_sha: Mapped[str | None] = mapped_column(String(40), nullable=True)
    indexing_status: Mapped[str] = mapped_column(
        String(50), default="pending", server_default="pending", nullable=False
    )
    indexing_progress: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    total_chunks: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, default=dict, server_default="{}", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        onupdate=func.now(),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="owned_repositories")
    members: Mapped[list["RepositoryMember"]] = relationship(
        "RepositoryMember", back_populates="repository", cascade="all, delete-orphan"
    )
    chunks: Mapped[list["ASTChunk"]] = relationship(
        "ASTChunk", back_populates="repository", cascade="all, delete-orphan"
    )
    dependency_edges: Mapped[list["DependencyEdge"]] = relationship(
        "DependencyEdge", back_populates="repository", cascade="all, delete-orphan"
    )
    chat_sessions: Mapped[list["ChatSession"]] = relationship(
        "ChatSession", back_populates="repository", cascade="all, delete-orphan"
    )
    webhook_events: Mapped[list["WebhookEvent"]] = relationship(
        "WebhookEvent", back_populates="repository"
    )


class RepositoryMember(Base):
    """Membership and access control for repositories."""

    __tablename__ = "repository_members"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(
        String(50), default="viewer", server_default="viewer", nullable=False
    )

    __table_args__ = (
        UniqueConstraint("repository_id", "user_id", name="uq_repo_member"),
    )

    # Relationships
    repository: Mapped["Repository"] = relationship("Repository", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="memberships")


class ASTChunk(Base):
    """Granular code chunk extracted from AST parsing."""

    __tablename__ = "ast_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False
    )
    file_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    language: Mapped[str] = mapped_column(String(50), nullable=False)
    node_type: Mapped[str] = mapped_column(String(100), nullable=False)
    function_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    docstring: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_code: Mapped[str] = mapped_column(Text, nullable=False)
    start_line: Mapped[int] = mapped_column(Integer, nullable=False)
    end_line: Mapped[int] = mapped_column(Integer, nullable=False)
    cyclomatic_complexity: Mapped[int] = mapped_column(
        Integer, default=1, server_default="1", nullable=False
    )
    token_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    extra_metadata: Mapped[dict[str, Any]] = mapped_column(
        "extra_metadata", JSONB, default=dict, server_default="{}", nullable=False
    )
    qdrant_point_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    search_vector: Mapped[Any | None] = mapped_column(
        TSVECTOR,
        Computed(
            "to_tsvector('english', "
            "coalesce(function_name, '') || ' ' || coalesce(docstring, '') || ' ' || source_code)",
            persisted=True,
        ),
        nullable=True,
    )

    __table_args__ = (
        Index("ix_ast_chunks_repo_file", "repository_id", "file_path"),
        Index("ix_ast_chunks_search_vector", "search_vector", postgresql_using="gin"),
    )

    # Relationships
    repository: Mapped["Repository"] = relationship("Repository", back_populates="chunks")


class DependencyEdge(Base):
    """File-to-file dependency graph edges."""

    __tablename__ = "dependency_edges"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False
    )
    source_file: Mapped[str] = mapped_column(String(1024), nullable=False)
    target_file: Mapped[str] = mapped_column(String(1024), nullable=False)
    edge_type: Mapped[str] = mapped_column(String(50), nullable=False)  # import/call/inherit
    weight: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)

    # Relationships
    repository: Mapped["Repository"] = relationship("Repository", back_populates="dependency_edges")


class ChatSession(Base):
    """Conversational RAG session scoped to a repository and user."""

    __tablename__ = "chat_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    repository_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False
    )

    # Relationships
    repository: Mapped["Repository"] = relationship("Repository", back_populates="chat_sessions")
    user: Mapped["User"] = relationship("User", back_populates="chat_sessions")
    messages: Mapped[list["ChatMessage"]] = relationship(
        "ChatMessage", back_populates="session", cascade="all, delete-orphan"
    )


class ChatMessage(Base):
    """Individual messages and citations within a ChatSession."""

    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # user/assistant/system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    citations: Mapped[list[Any]] = mapped_column(
        JSONB, default=list, server_default="[]", nullable=False
    )
    token_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    provider: Mapped[str | None] = mapped_column(String(50), nullable=True)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False
    )

    # Relationships
    session: Mapped["ChatSession"] = relationship("ChatSession", back_populates="messages")


class WebhookEvent(Base):
    """Audit log for incoming GitHub webhook payloads."""

    __tablename__ = "webhook_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    repository_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="SET NULL"), nullable=True
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    delivery_id: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    processed: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=func.now(), server_default=func.now(), nullable=False
    )

    # Relationships
    repository: Mapped[Optional["Repository"]] = relationship(
        "Repository", back_populates="webhook_events"
    )
