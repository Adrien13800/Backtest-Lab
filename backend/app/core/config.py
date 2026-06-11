from functools import cached_property

from pydantic import AnyUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Backtest Lab API"
    app_env: str = "local"
    api_v1_prefix: str = "/v1"
    backend_cors_origins_raw: str = Field(
        default="http://127.0.0.1:5173,http://localhost:5173",
        alias="BACKEND_CORS_ORIGINS",
    )
    database_url: str = "postgresql+asyncpg://backtest:backtest@localhost:5432/backtest_lab"
    redis_url: str = "redis://localhost:6379/0"
    s3_endpoint_url: AnyUrl | None = None
    s3_access_key: str = ""
    s3_secret_key: str = ""
    s3_bucket: str = "backtest-lab"

    @cached_property
    def backend_cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.backend_cors_origins_raw.split(",")
            if origin.strip()
        ]


settings = Settings()
