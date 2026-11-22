"""Application configuration loaded from environment variables / backend .env file."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "EstateIQ - AI Lead Management API"

    # Gemini
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash"
    # Tried in order when the primary model is overloaded (503) or unavailable (404)
    gemini_fallback_models: str = "gemini-3.8-flash,gemini-3.5-flash-lite"
    gemini_timeout_seconds: int = 90

    # Comma separated list of allowed frontend origins
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def model_chain(self) -> list[str]:
        models = [self.gemini_model.strip()]
        for m in self.gemini_fallback_models.split(","):
            m = m.strip()
            if m and m not in models:
                models.append(m)
        return models

    @property
    def ai_configured(self) -> bool:
        key = self.gemini_api_key.strip()
        return bool(key) and not key.lower().startswith("your_")


@lru_cache
def get_settings() -> Settings:
    return Settings()
