from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUserDep, SessionDep
from app.models import ReplaySession, User
from app.schemas import (
    ReplaySessionCreate,
    ReplaySessionRead,
    ReplaySessionSnapshotRead,
    ReplaySessionSnapshotSummary,
    ReplaySessionSnapshotUpsert,
)

router = APIRouter()


@router.post("", response_model=ReplaySessionRead, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: ReplaySessionCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> ReplaySession:
    replay_session = ReplaySession(
        user_id=current_user.id,
        dataset_id=payload.dataset_id,
        name=payload.name,
        initial_balance=payload.initial_balance,
        current_balance=payload.initial_balance,
        settings_json=payload.settings_json,
        metrics_json={},
    )
    session.add(replay_session)
    await session.commit()
    await session.refresh(replay_session)
    return replay_session


@router.get("", response_model=list[ReplaySessionRead])
async def list_sessions(session: SessionDep) -> list[ReplaySession]:
    raise HTTPException(status_code=status.HTTP_410_GONE, detail="Use /sessions/snapshots")


@router.get("/all", response_model=list[ReplaySessionRead])
async def list_all_sessions(
    session: SessionDep,
    current_user: CurrentUserDep,
) -> list[ReplaySession]:
    result = await session.execute(
        select(ReplaySession)
        .where(ReplaySession.user_id == current_user.id)
        .order_by(ReplaySession.created_at.desc())
    )
    return list(result.scalars())


@router.post(
    "/snapshots",
    response_model=ReplaySessionSnapshotRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_session_snapshot(
    payload: ReplaySessionSnapshotUpsert,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> ReplaySessionSnapshotRead:
    replay_session = ReplaySession(
        user_id=current_user.id,
        dataset_id=None,
        name=payload.name,
        initial_balance=payload.initial_balance,
        current_balance=payload.current_balance,
        status="active",
        settings_json=build_snapshot_settings(payload),
        metrics_json=payload.metrics_json,
    )
    session.add(replay_session)
    await session.commit()
    await session.refresh(replay_session)
    return snapshot_from_model(replay_session)


@router.get("/snapshots", response_model=list[ReplaySessionSnapshotSummary])
async def list_session_snapshots(
    session: SessionDep,
    current_user: CurrentUserDep,
) -> list[ReplaySessionSnapshotSummary]:
    result = await session.execute(
        select(ReplaySession)
        .where(ReplaySession.user_id == current_user.id)
        .order_by(ReplaySession.updated_at.desc())
    )
    return [snapshot_summary_from_model(replay_session) for replay_session in result.scalars()]


@router.get("/{session_id}/snapshot", response_model=ReplaySessionSnapshotRead)
async def get_session_snapshot(
    session_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> ReplaySessionSnapshotRead:
    replay_session = await get_session_or_404(session, session_id, current_user)
    return snapshot_from_model(replay_session)


@router.put("/{session_id}/snapshot", response_model=ReplaySessionSnapshotRead)
async def update_session_snapshot(
    session_id: UUID,
    payload: ReplaySessionSnapshotUpsert,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> ReplaySessionSnapshotRead:
    replay_session = await get_session_or_404(session, session_id, current_user)
    replay_session.name = payload.name
    replay_session.initial_balance = payload.initial_balance
    replay_session.current_balance = payload.current_balance
    replay_session.status = "active"
    replay_session.settings_json = build_snapshot_settings(payload)
    replay_session.metrics_json = payload.metrics_json

    await session.commit()
    await session.refresh(replay_session)
    return snapshot_from_model(replay_session)


@router.get("/{session_id}", response_model=ReplaySessionRead)
async def get_replay_session(
    session_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> ReplaySession:
    return await get_session_or_404(session, session_id, current_user)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_replay_session(
    session_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    replay_session = await get_session_or_404(session, session_id, current_user)
    await session.delete(replay_session)
    await session.commit()


async def get_session_or_404(
    session: AsyncSession,
    session_id: UUID,
    current_user: User,
) -> ReplaySession:
    result = await session.execute(
        select(ReplaySession)
        .where(ReplaySession.id == session_id)
        .where(ReplaySession.user_id == current_user.id)
    )
    replay_session = result.scalar_one_or_none()
    if replay_session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    return replay_session


def build_snapshot_settings(payload: ReplaySessionSnapshotUpsert) -> dict:
    return {
        "data_label": payload.data_label,
        "cursor": payload.cursor,
        "total_trades": payload.total_trades,
        "snapshot": payload.snapshot,
    }


def snapshot_summary_from_model(replay_session: ReplaySession) -> ReplaySessionSnapshotSummary:
    settings = replay_session.settings_json or {}
    return ReplaySessionSnapshotSummary(
        id=replay_session.id,
        name=replay_session.name,
        data_label=settings.get("data_label", "Unknown dataset"),
        current_balance=replay_session.current_balance,
        total_trades=int(settings.get("total_trades", 0)),
        updated_at=replay_session.updated_at,
        created_at=replay_session.created_at,
    )


def snapshot_from_model(replay_session: ReplaySession) -> ReplaySessionSnapshotRead:
    settings = replay_session.settings_json or {}
    summary = snapshot_summary_from_model(replay_session)
    return ReplaySessionSnapshotRead(
        **summary.model_dump(),
        snapshot=settings.get("snapshot", {}),
        metrics_json=replay_session.metrics_json or {},
    )
