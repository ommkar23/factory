import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    cors_allow_origins: tuple[str, ...]
    environment: str
    supabase_url: str | None
    supabase_publishable_key: str | None
    auth_public_url: str | None
    auth_allowed_return_paths: tuple[str, ...]
    auth_session_encryption_key: str | None
    auth_session_database_url: str | None
    supabase_authorization_url: str | None = None

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    @property
    def is_auth_configured(self) -> bool:
        return all(
            (
                self.supabase_url,
                self.supabase_publishable_key,
                self.auth_public_url,
                self.auth_session_encryption_key,
                self.auth_session_database_url,
            )
        )

    @classmethod
    def from_environment(cls) -> "Settings":
        settings = cls(
            cors_allow_origins=tuple(
                origin.strip()
                for origin in os.getenv("CORS_ALLOW_ORIGINS", "").split(",")
                if origin.strip()
            ),
            environment=os.getenv("ENVIRONMENT", "production"),
            supabase_url=os.getenv("SUPABASE_URL") or None,
            supabase_publishable_key=os.getenv("SUPABASE_PUBLISHABLE_KEY") or None,
            auth_public_url=(os.getenv("AUTH_PUBLIC_URL") or "").rstrip("/") or None,
            auth_allowed_return_paths=tuple(
                path.strip()
                for path in os.getenv("AUTH_ALLOWED_RETURN_PATHS", "/,/weather,/live-splash").split(",")
                if path.strip()
            ),
            auth_session_encryption_key=os.getenv("AUTH_SESSION_ENCRYPTION_KEY") or None,
            auth_session_database_url=os.getenv("AUTH_SESSION_DATABASE_URL") or None,
            supabase_authorization_url=(os.getenv("SUPABASE_AUTHORIZATION_URL") or os.getenv("SUPABASE_URL") or "").rstrip("/") or None,
        )
        if not settings.is_development:
            missing = [
                name
                for name, value in (
                    ("SUPABASE_URL", settings.supabase_url),
                    ("SUPABASE_PUBLISHABLE_KEY", settings.supabase_publishable_key),
                    ("AUTH_PUBLIC_URL", settings.auth_public_url),
                    ("AUTH_SESSION_ENCRYPTION_KEY", settings.auth_session_encryption_key),
                    ("AUTH_SESSION_DATABASE_URL", settings.auth_session_database_url),
                )
                if not value
            ]
            if missing:
                raise RuntimeError("Missing required production settings: " + ", ".join(missing))
            if not settings.auth_session_database_url.startswith(("postgresql://", "postgres://")):
                raise RuntimeError("AUTH_SESSION_DATABASE_URL must use PostgreSQL in production.")
        return settings
