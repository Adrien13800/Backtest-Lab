from fastapi import APIRouter

from app.api.routes import auth, datasets, health, platform, sessions

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(platform.router, tags=["platform"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["datasets"])
