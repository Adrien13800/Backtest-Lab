from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str


class PlatformModule(BaseModel):
    key: str
    status: str
    description: str


class PlatformResponse(BaseModel):
    modules: list[PlatformModule]


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    display_name: str
    created_at: datetime


class AuthRegister(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=200)
    display_name: str = Field(default="", max_length=120)


class AuthLogin(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=8, max_length=200)


class AuthResponse(BaseModel):
    token: str
    user: UserRead


class DatasetCreate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    symbol: str = Field(min_length=1, max_length=40)
    asset_class: str = "forex"
    exchange: str = "custom"
    timeframe: str = "1m"
    source: str = "upload"


class DatasetRead(DatasetCreate):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime


class DatasetSummary(DatasetRead):
    candle_count: int = 0
    start_time: datetime | None = None
    end_time: datetime | None = None


class CandleRead(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: float


class DatasetWithCandles(BaseModel):
    dataset: DatasetSummary
    candles: list[CandleRead]


class ReplaySessionCreate(BaseModel):
    dataset_id: UUID | None = None
    name: str = Field(min_length=1, max_length=160)
    initial_balance: Decimal = Decimal("10000.00")
    settings_json: dict = Field(default_factory=dict)


class ReplaySessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    dataset_id: UUID | None
    name: str
    initial_balance: Decimal
    current_balance: Decimal
    status: str
    settings_json: dict
    metrics_json: dict
    created_at: datetime


class ReplaySessionSnapshotUpsert(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    data_label: str = Field(min_length=1, max_length=240)
    initial_balance: Decimal = Decimal("10000.00")
    current_balance: Decimal
    cursor: int = Field(ge=0)
    total_trades: int = Field(ge=0)
    snapshot: dict
    metrics_json: dict = Field(default_factory=dict)


class ReplaySessionSnapshotSummary(BaseModel):
    id: UUID
    name: str
    data_label: str
    current_balance: Decimal
    total_trades: int
    updated_at: datetime
    created_at: datetime


class ReplaySessionSnapshotRead(ReplaySessionSnapshotSummary):
    snapshot: dict
    metrics_json: dict
