"""Initial database schema and Row-Level Security policies.

Revision ID: 001
Revises:
Create Date: 2026-08-18 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 0. Ensure extensions exist
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')
    op.execute('CREATE EXTENSION IF NOT EXISTS "vector";')
    op.execute('CREATE EXTENSION IF NOT EXISTS "pg_trgm";')

    # 1. users table
    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("github_id", sa.BigInteger(), nullable=False),
        sa.Column("github_login", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("avatar_url", sa.String(length=1024), nullable=True),
        sa.Column("plan", sa.String(length=50), server_default="free", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("github_id", name="uq_users_github_id"),
    )
    op.create_index("ix_users_github_id", "users", ["github_id"], unique=True)

    # 2. repositories table
    op.create_table(
        "repositories",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "owner_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("github_url", sa.String(length=1024), nullable=False),
        sa.Column("github_full_name", sa.String(length=255), nullable=False),
        sa.Column("default_branch", sa.String(length=100), server_default="main", nullable=False),
        sa.Column("last_indexed_sha", sa.String(length=40), nullable=True),
        sa.Column(
            "indexing_status", sa.String(length=50), server_default="pending", nullable=False
        ),
        sa.Column("indexing_progress", sa.Integer(), server_default="0", nullable=False),
        sa.Column("total_chunks", sa.Integer(), server_default="0", nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_repositories_github_full_name", "repositories", ["github_full_name"])

    # 3. repository_members table
    op.create_table(
        "repository_members",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "repository_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("repositories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(length=50), server_default="viewer", nullable=False),
        sa.UniqueConstraint("repository_id", "user_id", name="uq_repo_member"),
    )

    # 4. ast_chunks table
    op.create_table(
        "ast_chunks",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "repository_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("repositories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("file_path", sa.String(length=1024), nullable=False),
        sa.Column("language", sa.String(length=50), nullable=False),
        sa.Column("node_type", sa.String(length=100), nullable=False),
        sa.Column("function_name", sa.String(length=255), nullable=True),
        sa.Column("docstring", sa.Text(), nullable=True),
        sa.Column("source_code", sa.Text(), nullable=False),
        sa.Column("start_line", sa.Integer(), nullable=False),
        sa.Column("end_line", sa.Integer(), nullable=False),
        sa.Column("cyclomatic_complexity", sa.Integer(), server_default="1", nullable=False),
        sa.Column("token_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column(
            "extra_metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("qdrant_point_id", sa.String(length=64), nullable=True),
        sa.Column(
            "search_vector",
            postgresql.TSVECTOR(),
            sa.Computed(
                "to_tsvector('english', coalesce(function_name, '') || ' ' || coalesce(docstring, '') || ' ' || source_code)",
                persisted=True,
            ),
            nullable=True,
        ),
    )
    op.create_index("ix_ast_chunks_repo_file", "ast_chunks", ["repository_id", "file_path"])
    op.create_index(
        "ix_ast_chunks_search_vector",
        "ast_chunks",
        ["search_vector"],
        postgresql_using="gin",
    )

    # 5. dependency_edges table
    op.create_table(
        "dependency_edges",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "repository_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("repositories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("source_file", sa.String(length=1024), nullable=False),
        sa.Column("target_file", sa.String(length=1024), nullable=False),
        sa.Column("edge_type", sa.String(length=50), nullable=False),
        sa.Column("weight", sa.Integer(), server_default="1", nullable=False),
    )

    # 6. chat_sessions table
    op.create_table(
        "chat_sessions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "repository_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("repositories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # 7. chat_messages table
    op.create_table(
        "chat_messages",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "session_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("chat_sessions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("role", sa.String(length=50), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "citations",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("token_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("provider", sa.String(length=50), nullable=True),
        sa.Column("model", sa.String(length=100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    # 8. webhook_events table
    op.create_table(
        "webhook_events",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column(
            "repository_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("repositories.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("delivery_id", sa.String(length=255), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("processed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("processing_error", sa.Text(), nullable=True),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("delivery_id", name="uq_webhook_events_delivery_id"),
    )
    op.create_index("ix_webhook_events_delivery_id", "webhook_events", ["delivery_id"], unique=True)

    # 9. Enable Row-Level Security on Multi-Tenant Tables
    op.execute("ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE ast_chunks ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE dependency_edges ENABLE ROW LEVEL SECURITY;")

    # 10. Grant Privileges to Application Role
    op.execute("GRANT USAGE ON SCHEMA public TO codelens_app;")
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO codelens_app;"
    )
    op.execute("GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO codelens_app;")

    # 11. Create RLS Policies for Tenant Isolation
    op.execute("""
    CREATE POLICY repo_isolation ON repositories
      FOR ALL TO codelens_app
      USING (
        id IN (
          SELECT repository_id FROM repository_members
          WHERE user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        )
      )
      WITH CHECK (
        id IN (
          SELECT repository_id FROM repository_members
          WHERE user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        )
      );
    """)

    op.execute("""
    CREATE POLICY chunk_isolation ON ast_chunks
      FOR ALL TO codelens_app
      USING (
        repository_id IN (
          SELECT repository_id FROM repository_members
          WHERE user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        )
      )
      WITH CHECK (
        repository_id IN (
          SELECT repository_id FROM repository_members
          WHERE user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        )
      );
    """)

    op.execute("""
    CREATE POLICY chat_session_isolation ON chat_sessions
      FOR ALL TO codelens_app
      USING (
        repository_id IN (
          SELECT repository_id FROM repository_members
          WHERE user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        )
      )
      WITH CHECK (
        repository_id IN (
          SELECT repository_id FROM repository_members
          WHERE user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        )
      );
    """)

    op.execute("""
    CREATE POLICY chat_message_isolation ON chat_messages
      FOR ALL TO codelens_app
      USING (
        session_id IN (
          SELECT cs.id FROM chat_sessions cs
          JOIN repository_members rm ON cs.repository_id = rm.repository_id
          WHERE rm.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        )
      )
      WITH CHECK (
        session_id IN (
          SELECT cs.id FROM chat_sessions cs
          JOIN repository_members rm ON cs.repository_id = rm.repository_id
          WHERE rm.user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        )
      );
    """)

    op.execute("""
    CREATE POLICY edge_isolation ON dependency_edges
      FOR ALL TO codelens_app
      USING (
        repository_id IN (
          SELECT repository_id FROM repository_members
          WHERE user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        )
      )
      WITH CHECK (
        repository_id IN (
          SELECT repository_id FROM repository_members
          WHERE user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
        )
      );
    """)


def downgrade() -> None:
    # 1. Drop RLS Policies
    op.execute("DROP POLICY IF EXISTS edge_isolation ON dependency_edges;")
    op.execute("DROP POLICY IF EXISTS chat_message_isolation ON chat_messages;")
    op.execute("DROP POLICY IF EXISTS chat_session_isolation ON chat_sessions;")
    op.execute("DROP POLICY IF EXISTS chunk_isolation ON ast_chunks;")
    op.execute("DROP POLICY IF EXISTS repo_isolation ON repositories;")

    # 2. Drop Tables
    op.drop_table("webhook_events")
    op.drop_table("chat_messages")
    op.drop_table("chat_sessions")
    op.drop_table("dependency_edges")
    op.drop_table("ast_chunks")
    op.drop_table("repository_members")
    op.drop_table("repositories")
    op.drop_table("users")
