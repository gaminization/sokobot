from functools import lru_cache
from typing import Literal

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Sokobot"
    api_prefix: str = "/api"
    environment: Literal["development", "test", "production"] = "development"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 8
    auth_cookie_name: str = "wrms_session"
    auth_cookie_secure: bool = False
    auth_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    database_url: str = "sqlite:///./wrms.db"
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    auto_seed: bool = True
    auto_create_schema: bool = True
    simulation_tick_seconds: int = 2
    low_battery_threshold: float = 20.0
    critical_battery_threshold: float = 8.0
    battery_drain_navigation: float = 2.5
    battery_drain_execution: float = 1.5
    battery_charge_rate: float = 12.0
    manual_control_step: float = 1.0
    robot_default_speed: float = 1.0
    max_robot_trail_points: int = 10
    admin_email: str = "admin@wrms.com"
    admin_password: str = "admin123"
    operator_email: str = "operator@wrms.com"
    operator_password: str = "operator123"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @computed_field
    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @computed_field
    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    return Settings()
