from fastapi import APIRouter

from app.schemas import PlatformModule, PlatformResponse

router = APIRouter()


@router.get("/platform", response_model=PlatformResponse)
async def platform_status() -> PlatformResponse:
    return PlatformResponse(
        modules=[
            PlatformModule(
                key="replay-engine",
                status="local-v1",
                description=(
                    "Frontend replay engine supports market, limit, stop, fees and prop rules."
                ),
            ),
            PlatformModule(
                key="api",
                status="bootstrapped",
                description="FastAPI service is ready for persisted sessions and datasets.",
            ),
            PlatformModule(
                key="timeseries-store",
                status="docker-ready",
                description="PostgreSQL + TimescaleDB schema is defined through Alembic.",
            ),
        ],
    )
