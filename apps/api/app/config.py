from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration loaded from environment variables and .env file."""

    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "postgresql://codelens:codelens_password_change_me@localhost:5432/codelens"
    REDIS_URL: str = "redis://:redis_password_change_me@localhost:6379/0"
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str | None = None
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    # The callback must point to the API (port 8000), NOT the frontend
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/auth/github/callback"
    GITHUB_WEBHOOK_SECRET: str = "dev_webhook_secret"
    JWT_SECRET: str = "dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_DAYS: int = 7
    LLM_PROVIDER: str = "openai"
    GOOGLE_API_KEY: str | None = None
    ALLOWED_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
