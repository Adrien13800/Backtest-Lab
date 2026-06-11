from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampedUuidMixin


class User(TimestampedUuidMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False, default="")

    tokens: Mapped[list["AuthToken"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    datasets: Mapped[list["Dataset"]] = relationship(back_populates="user")
    sessions: Mapped[list["ReplaySession"]] = relationship(back_populates="user")


class AuthToken(TimestampedUuidMixin, Base):
    __tablename__ = "auth_tokens"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="tokens")


class Dataset(TimestampedUuidMixin, Base):
    __tablename__ = "datasets"

    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    symbol: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    asset_class: Mapped[str] = mapped_column(String(40), nullable=False, default="forex")
    exchange: Mapped[str] = mapped_column(String(80), nullable=False, default="custom")
    timeframe: Mapped[str] = mapped_column(String(20), nullable=False, default="1m")
    source: Mapped[str] = mapped_column(String(120), nullable=False, default="upload")
    metadata_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    user: Mapped[User | None] = relationship(back_populates="datasets")
    candles: Mapped[list["Candle"]] = relationship(
        back_populates="dataset",
        cascade="all, delete-orphan",
    )
    sessions: Mapped[list["ReplaySession"]] = relationship(back_populates="dataset")


class Candle(Base):
    __tablename__ = "candles"

    dataset_id: Mapped[UUID] = mapped_column(
        ForeignKey("datasets.id", ondelete="CASCADE"),
        primary_key=True,
    )
    time: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    open: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    high: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    low: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    close: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    volume: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False, default=0)
    spread: Mapped[Decimal | None] = mapped_column(Numeric(18, 8))

    dataset: Mapped[Dataset] = relationship(back_populates="candles")

    __table_args__ = (
        Index("ix_candles_dataset_time", "dataset_id", "time"),
    )


class ReplaySession(TimestampedUuidMixin, Base):
    __tablename__ = "replay_sessions"

    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        index=True,
    )
    dataset_id: Mapped[UUID | None] = mapped_column(ForeignKey("datasets.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    initial_balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    current_balance: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    cursor_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="draft")
    settings_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    metrics_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    user: Mapped[User | None] = relationship(back_populates="sessions")
    dataset: Mapped[Dataset | None] = relationship(back_populates="sessions")
    trades: Mapped[list["TradeRecord"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
    )


class TradeRecord(TimestampedUuidMixin, Base):
    __tablename__ = "trade_records"

    session_id: Mapped[UUID] = mapped_column(
        ForeignKey("replay_sessions.id", ondelete="CASCADE"),
        index=True,
    )
    side: Mapped[str] = mapped_column(String(12), nullable=False)
    order_kind: Mapped[str] = mapped_column(String(20), nullable=False)
    setup: Mapped[str] = mapped_column(String(160), nullable=False, default="")
    tags: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    entry_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    exit_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    entry_price: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    exit_price: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    stop_loss: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    take_profit: Mapped[Decimal] = mapped_column(Numeric(18, 8), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(24, 8), nullable=False)
    pnl: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    gross_pnl: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    fees: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    r_multiple: Mapped[Decimal] = mapped_column(Numeric(12, 4), nullable=False)
    hold_candles: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    exit_reason: Mapped[str] = mapped_column(String(40), nullable=False)

    session: Mapped[ReplaySession] = relationship(back_populates="trades")
