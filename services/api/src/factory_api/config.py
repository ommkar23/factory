import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    cors_allow_origins: tuple[str, ...]
    environment: str
    supabase_jwks_url: str | None
    supabase_jwt_audience: str | None
    supabase_jwt_issuer: str | None

    @property
    def is_development(self) -> bool:
        return self.environment == "development"

    @classmethod
    def from_environment(cls) -> "Settings":
        environment = os.getenv("ENVIRONMENT", "production")
        settings = cls(
            cors_allow_origins=tuple(
                origin.strip()
                for origin in os.getenv("CORS_ALLOW_ORIGINS", "").split(",")
                if origin.strip()
            ),
            environment=environment,
            supabase_jwks_url=os.getenv("SUPABASE_JWKS_URL") or None,
            supabase_jwt_audience=os.getenv("SUPABASE_JWT_AUDIENCE") or None,
            supabase_jwt_issuer=os.getenv("SUPABASE_JWT_ISSUER") or None,
        )
        if not settings.is_development:
            missing = [
                name
                for name, value in (
                    ("SUPABASE_JWKS_URL", settings.supabase_jwks_url),
                    ("SUPABASE_JWT_AUDIENCE", settings.supabase_jwt_audience),
                    ("SUPABASE_JWT_ISSUER", settings.supabase_jwt_issuer),
                )
                if not value
            ]
            if missing:
                raise RuntimeError("Missing required production settings: " + ", ".join(missing))
        return settings
