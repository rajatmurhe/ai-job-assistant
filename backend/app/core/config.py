"""
Application configuration.

Reads all settings from environment variables (via .env in local/dev,
real env vars in production). Nothing is hardcoded — see Golden Rule 8.
"""
from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    app_name: str = Field(default="ai-job-assistant", alias="APP_NAME")
    app_env: Literal["development", "staging", "production"] = Field(
        default="development", alias="APP_ENV"
    )
    app_version: str = Field(default="0.1.0", alias="APP_VERSION")
    secret_key: str = Field(default="CHANGE_THIS_TO_RANDOM_32_CHARS", alias="SECRET_KEY")

    # Database
    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/ai_job_assistant",
        alias="DATABASE_URL",
    )

    # LLM
    llm_provider: Literal["gemini", "ollama", "auto"] = Field(default="gemini", alias="LLM_PROVIDER")
    gemini_api_key: str | None = Field(default=None, alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.0-flash", alias="GEMINI_MODEL")
    ollama_base_url: str = Field(default="http://localhost:11434", alias="OLLAMA_BASE_URL")
    ollama_model: str = Field(default="qwen2.5:7b", alias="OLLAMA_MODEL")
    ollama_embed_model: str = Field(default="nomic-embed-text", alias="OLLAMA_EMBED_MODEL")
    llm_max_retries: int = Field(default=3, alias="LLM_MAX_RETRIES")
    llm_timeout_seconds: int = Field(default=180, alias="LLM_TIMEOUT_SECONDS")

    # Scoring weights (must sum to 1.0 — validated below)
    match_required_skill_weight: float = Field(default=0.30, alias="MATCH_REQUIRED_SKILL_WEIGHT")
    match_preferred_skill_weight: float = Field(default=0.15, alias="MATCH_PREFERRED_SKILL_WEIGHT")
    match_experience_weight: float = Field(default=0.15, alias="MATCH_EXPERIENCE_WEIGHT")
    match_education_weight: float = Field(default=0.10, alias="MATCH_EDUCATION_WEIGHT")
    match_project_weight: float = Field(default=0.10, alias="MATCH_PROJECT_WEIGHT")
    match_semantic_weight: float = Field(default=0.10, alias="MATCH_SEMANTIC_WEIGHT")
    match_ats_keyword_weight: float = Field(default=0.10, alias="MATCH_ATS_KEYWORD_WEIGHT")

    # Email
    gmail_enabled: bool = Field(default=False, alias="GMAIL_ENABLED")
    gmail_credentials_path: str = Field(default="./credentials.json", alias="GMAIL_CREDENTIALS_PATH")
    gmail_token_path: str = Field(default="./token.json", alias="GMAIL_TOKEN_PATH")
    gmail_sender_email: str | None = Field(default=None, alias="GMAIL_SENDER_EMAIL")
    mailhog_smtp_host: str = Field(default="localhost", alias="MAILHOG_SMTP_HOST")
    mailhog_smtp_port: int = Field(default=1025, alias="MAILHOG_SMTP_PORT")

    # Storage
    storage_backend: Literal["local", "minio"] = Field(default="local", alias="STORAGE_BACKEND")
    storage_local_path: str = Field(default="./storage", alias="STORAGE_LOCAL_PATH")
    max_file_size_mb: int = Field(default=10, alias="MAX_FILE_SIZE_MB")

    # n8n
    n8n_url: str = Field(default="http://localhost:5678", alias="N8N_URL")
    n8n_webhook_secret: str = Field(default="CHANGE_THIS_TO_RANDOM", alias="N8N_WEBHOOK_SECRET")

    # Google Sheets
    google_sheets_enabled: bool = Field(default=False, alias="GOOGLE_SHEETS_ENABLED")
    google_sheets_id: str | None = Field(default=None, alias="GOOGLE_SHEETS_ID")

    # Logging
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(default="INFO", alias="LOG_LEVEL")
    log_format: Literal["json", "text"] = Field(default="json", alias="LOG_FORMAT")

    # Auth (Phase 2)
    auth_enabled: bool = Field(default=False, alias="AUTH_ENABLED")
    jwt_secret: str = Field(default="CHANGE_THIS_TO_RANDOM_64_CHARS", alias="JWT_SECRET")
    jwt_expire_minutes: int = Field(default=60, alias="JWT_EXPIRE_MINUTES")
    jwt_refresh_expire_days: int = Field(default=30, alias="JWT_REFRESH_EXPIRE_DAYS")

    @field_validator("llm_max_retries")
    @classmethod
    def _positive_retries(cls, v: int) -> int:
        if v < 0:
            raise ValueError("LLM_MAX_RETRIES must be >= 0")
        return v

    @property
    def scoring_weights_sum(self) -> float:
        return round(
            self.match_required_skill_weight
            + self.match_preferred_skill_weight
            + self.match_experience_weight
            + self.match_education_weight
            + self.match_project_weight
            + self.match_semantic_weight
            + self.match_ats_keyword_weight,
            4,
        )


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton. Import this, not Settings() directly."""
    settings = Settings()
    if settings.scoring_weights_sum != 1.0:
        raise ValueError(
            f"MATCH_*_WEIGHT env vars must sum to 1.0, got {settings.scoring_weights_sum}. "
            "See Golden Rule 8 and section 19 of the master documentation."
        )
    return settings
