from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUserDep, SessionDep
from app.models import Candle, Dataset, User
from app.schemas import CandleRead, DatasetSummary, DatasetWithCandles
from app.services.csv_parser import parse_ohlcv_csv

router = APIRouter()


@router.post("/upload", response_model=DatasetSummary, status_code=status.HTTP_201_CREATED)
async def upload_dataset(
    session: SessionDep,
    current_user: CurrentUserDep,
    file: Annotated[UploadFile, File()],
    name: Annotated[str, Form()],
    symbol: Annotated[str, Form()],
    timeframe: Annotated[str, Form()] = "1m",
    asset_class: Annotated[str, Form()] = "forex",
    exchange: Annotated[str, Form()] = "custom",
) -> DatasetSummary:
    content = (await file.read()).decode("utf-8-sig")

    try:
        parsed_candles = parse_ohlcv_csv(content)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    if len(parsed_candles) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dataset must contain at least 10 candles.",
        )

    dataset = Dataset(
        user_id=current_user.id,
        name=name,
        symbol=symbol.upper(),
        asset_class=asset_class,
        exchange=exchange,
        timeframe=timeframe,
        source="upload",
        metadata_json={
            "filename": file.filename,
            "candle_count": len(parsed_candles),
            "start_time": parsed_candles[0].time.isoformat(),
            "end_time": parsed_candles[-1].time.isoformat(),
        },
    )
    session.add(dataset)
    await session.flush()

    session.add_all(
        Candle(
            dataset_id=dataset.id,
            time=parsed.time,
            open=parsed.open,
            high=parsed.high,
            low=parsed.low,
            close=parsed.close,
            volume=parsed.volume,
        )
        for parsed in parsed_candles
    )
    await session.commit()
    await session.refresh(dataset)

    return await dataset_summary(session, dataset)


@router.get("", response_model=list[DatasetSummary])
async def list_datasets(
    session: SessionDep,
    current_user: CurrentUserDep,
) -> list[DatasetSummary]:
    result = await session.execute(
        select(Dataset)
        .where(Dataset.user_id == current_user.id)
        .order_by(Dataset.updated_at.desc())
    )
    return [await dataset_summary(session, dataset) for dataset in result.scalars()]


@router.get("/{dataset_id}", response_model=DatasetSummary)
async def get_dataset(
    dataset_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> DatasetSummary:
    dataset = await get_dataset_or_404(session, dataset_id, current_user)
    return await dataset_summary(session, dataset)


@router.get("/{dataset_id}/candles", response_model=DatasetWithCandles)
async def get_dataset_candles(
    dataset_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
    limit: int = 5000,
) -> DatasetWithCandles:
    dataset = await get_dataset_or_404(session, dataset_id, current_user)
    safe_limit = min(max(limit, 10), 50_000)
    result = await session.execute(
        select(Candle)
        .where(Candle.dataset_id == dataset.id)
        .order_by(Candle.time.asc())
        .limit(safe_limit)
    )
    candles = [
        CandleRead(
            time=int(candle.time.timestamp()),
            open=float(candle.open),
            high=float(candle.high),
            low=float(candle.low),
            close=float(candle.close),
            volume=float(candle.volume),
        )
        for candle in result.scalars()
    ]

    return DatasetWithCandles(dataset=await dataset_summary(session, dataset), candles=candles)


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    dataset = await get_dataset_or_404(session, dataset_id, current_user)
    await session.delete(dataset)
    await session.commit()


async def get_dataset_or_404(
    session: AsyncSession,
    dataset_id: UUID,
    current_user: User,
) -> Dataset:
    result = await session.execute(
        select(Dataset).where(Dataset.id == dataset_id).where(Dataset.user_id == current_user.id)
    )
    dataset = result.scalar_one_or_none()

    if dataset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset not found")

    return dataset


async def dataset_summary(session: AsyncSession, dataset: Dataset) -> DatasetSummary:
    stats = await session.execute(
        select(func.count(Candle.time), func.min(Candle.time), func.max(Candle.time)).where(
            Candle.dataset_id == dataset.id
        )
    )
    candle_count, start_time, end_time = stats.one()

    return DatasetSummary(
        id=dataset.id,
        name=dataset.name,
        symbol=dataset.symbol,
        asset_class=dataset.asset_class,
        exchange=dataset.exchange,
        timeframe=dataset.timeframe,
        source=dataset.source,
        created_at=dataset.created_at,
        updated_at=dataset.updated_at,
        candle_count=candle_count,
        start_time=start_time,
        end_time=end_time,
    )
