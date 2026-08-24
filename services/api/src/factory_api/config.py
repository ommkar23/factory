import os
from dataclasses import dataclass
from urllib.parse import urlparse


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
    dev_auth_enabled: bool = False
    dev_auth_email: str | None = None
    dev_auth_password: str | None = None
    dev_auth_secret: str | None = None

    def __post_init__(self) -> None:
        if "*" in self.cors_allow_origins:
            raise RuntimeError("CORS_ALLOW_ORIGINS must not contain \"*\" when credentials are enabled.")
        if self.dev_auth_enabled and not self.is_development:
            raise RuntimeError("DEV_AUTH_ENABLED is permitted only when ENVIRONMENT=development.")
        if self.dev_auth_enabled:
            missing = [
                name
                for name, value in (
                    ("DEV_AUTH_EMAIL", self.dev_auth_email),
                    ("DEV_AUTH_PASSWORD", self.dev_auth_password),
                    ("DEV_AUTH_SECRET", self.dev_auth_secret),
                )
                if not value
            ]
            if missing:
                raise RuntimeError("Missing required development auth settings: " + ", ".join(missing))
            if not self.is_auth_configured:
                raise RuntimeError("DEV_AUTH_ENABLED requires complete Supabase auth configuration.")

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    @property
    def is_dev_auth_enabled(self) -> bool:
        return self.is_development and self.dev_auth_enabled

    @property
    def browser_cookie_secure(self) -> bool:
        return urlparse(self.auth_public_url or "").hostname != "localhost"

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
            dev_auth_enabled=os.getenv("DEV_AUTH_ENABLED", "").lower() == "true",
            dev_auth_email=os.getenv("DEV_AUTH_EMAIL") or None,
            dev_auth_password=os.getenv("DEV_AUTH_PASSWORD") or None,
            dev_auth_secret=os.getenv("DEV_AUTH_SECRET") or None,
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
