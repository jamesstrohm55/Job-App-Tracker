from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database — auto-convert Render's postgresql:// to postgresql+asyncpg://
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/job_tracker"

    @property
    def async_database_url(self) -> str:
        url = self.database_url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    # Auth
    jwt_access_secret: str = "change-me-access-secret-at-least-32-chars"
    jwt_refresh_secret: str = "change-me-refresh-secret-at-least-32-chars"
    access_token_expiry_minutes: int = 15
    refresh_token_expiry_days: int = 30

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:5173/auth/google/callback"

    # Gmail
    gmail_redirect_uri: str = "http://localhost:5173/settings/gmail/callback"
    gmail_encryption_key: str = ""

    # App
    frontend_url: str = "http://localhost:5173"
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
