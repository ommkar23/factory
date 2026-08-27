"""Stable, app-scoped deployment identities."""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
from pathlib import Path

APPS = ("home", "weather", "live-splash")


@dataclass(frozen=True)
class DeploymentIdentity:
    root: Path
    app: str
    worktree_id: str
    project: str
    alias: str

    @classmethod
    def create(cls, root: Path, app: str) -> "DeploymentIdentity":
        if app not in APPS:
            raise ValueError(f"Unsupported app: {app}")
        canonical = root.resolve()
        worktree_id = hashlib.sha256(str(canonical).encode()).hexdigest()[:10]
        slug = app.replace("-", "")
        return cls(canonical, app, worktree_id, f"factory-{worktree_id}-{slug}", f"{app}.{worktree_id}.factory")
