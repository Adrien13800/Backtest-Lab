"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-06-11
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    connection = op.get_bind()
    has_timescale = bool(
        connection.execute(
            sa.text("SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb'")
        ).scalar()
    )

    if has_timescale:
        op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb")

    op.create_table(
        "datasets",
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("symbol", sa.String(length=40), nullable=False),
        sa.Column("asset_class", sa.String(length=40), nullable=False),
        sa.Column("exchange", sa.String(length=80), nullable=False),
        sa.Column("timeframe", sa.String(length=20), nullable=False),
        sa.Column("source", sa.String(length=120), nullable=False),
        sa.Column("metadata_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_datasets")),
    )
    op.create_index(op.f("ix_datasets_symbol"), "datasets", ["symbol"], unique=False)

    op.create_table(
        "candles",
        sa.Column("dataset_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("open", sa.Numeric(18, 8), nullable=False),
        sa.Column("high", sa.Numeric(18, 8), nullable=False),
        sa.Column("low", sa.Numeric(18, 8), nullable=False),
        sa.Column("close", sa.Numeric(18, 8), nullable=False),
        sa.Column("volume", sa.Numeric(24, 8), nullable=False),
        sa.Column("spread", sa.Numeric(18, 8), nullable=True),
        sa.ForeignKeyConstraint(["dataset_id"], ["datasets.id"], name=op.f("fk_candles_dataset_id_datasets"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("dataset_id", "time", name=op.f("pk_candles")),
    )
    op.create_index("ix_candles_dataset_time", "candles", ["dataset_id", "time"], unique=False)
    if has_timescale:
        op.execute("SELECT create_hypertable('candles', by_range('time'), if_not_exists => TRUE)")

    op.create_table(
        "replay_sessions",
        sa.Column("dataset_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("initial_balance", sa.Numeric(18, 2), nullable=False),
        sa.Column("current_balance", sa.Numeric(18, 2), nullable=False),
        sa.Column("cursor_time", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("settings_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("metrics_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["dataset_id"], ["datasets.id"], name=op.f("fk_replay_sessions_dataset_id_datasets"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_replay_sessions")),
    )

    op.create_table(
        "trade_records",
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("side", sa.String(length=12), nullable=False),
        sa.Column("order_kind", sa.String(length=20), nullable=False),
        sa.Column("setup", sa.String(length=160), nullable=False),
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("entry_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("exit_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("entry_price", sa.Numeric(18, 8), nullable=False),
        sa.Column("exit_price", sa.Numeric(18, 8), nullable=False),
        sa.Column("stop_loss", sa.Numeric(18, 8), nullable=False),
        sa.Column("take_profit", sa.Numeric(18, 8), nullable=False),
        sa.Column("quantity", sa.Numeric(24, 8), nullable=False),
        sa.Column("pnl", sa.Numeric(18, 2), nullable=False),
        sa.Column("gross_pnl", sa.Numeric(18, 2), nullable=False),
        sa.Column("fees", sa.Numeric(18, 2), nullable=False),
        sa.Column("r_multiple", sa.Numeric(12, 4), nullable=False),
        sa.Column("hold_candles", sa.Integer(), nullable=False),
        sa.Column("exit_reason", sa.String(length=40), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["replay_sessions.id"], name=op.f("fk_trade_records_session_id_replay_sessions"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_trade_records")),
    )
    op.create_index(op.f("ix_trade_records_session_id"), "trade_records", ["session_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_trade_records_session_id"), table_name="trade_records")
    op.drop_table("trade_records")
    op.drop_table("replay_sessions")
    op.drop_index("ix_candles_dataset_time", table_name="candles")
    op.drop_table("candles")
    op.drop_index(op.f("ix_datasets_symbol"), table_name="datasets")
    op.drop_table("datasets")
