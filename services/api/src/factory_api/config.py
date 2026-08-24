import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    cors_allow_origins: tuple[str, ...]

    @classmethod
    def from_environment(cls) -> "Settings":
        origins = tuple(
            origin.strip()
            for origin in os.getenv("CORS_ALLOW_ORIGINS", "").split(",")
            if origin.strip()
        )
        return cls(cors_allow_origins=origins)
