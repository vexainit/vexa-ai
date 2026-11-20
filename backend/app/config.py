"""Application settings loaded from environment / .env (PRD Ch. 17.1 & GCP Cloud Run)."""
from __future__ import annotations

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
_DEFAULT_SAMPLE_DIR = (
    BACKEND_DIR / "sample_data"
    if (BACKEND_DIR / "sample_data").exists()
    else WORKSPACE_ROOT / "sample_data"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(WORKSPACE_ROOT / ".env"), str(BACKEND_DIR / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    gemini_api_key: str = ""
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'vexa_bridge.db').as_posix()}"
    gcs_bucket_raw: str = ""
    gcs_bucket_masked: str = ""
    local_storage_dir: str = str(BACKEND_DIR / "storage")
    sample_data_dir: str = str(_DEFAULT_SAMPLE_DIR)
    gemini_timeout_seconds: float = 8.0
    max_upload_mb: int = 10

    # Auth & Firebase
    jwt_secret: str = "vexa-bridge-dev-secret-change-in-production-2026"
    jwt_expire_hours: int = 72
    firebase_project_id: str = ""

    # Platform Admin Bootstrap (created if no ADMIN exists in DB; zero mock cases seeded)
    admin_bootstrap_email: str = "admin@vexabridge.in"
    admin_bootstrap_password: str = "Admin@Vexa2026"


settings = Settings()
