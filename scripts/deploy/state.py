"""Private deployment state stored beneath the ignored Hermes runtime directory."""
from __future__ import annotations

from dataclasses import asdict, dataclass, fields
import json
import os
from pathlib import Path


@dataclass(frozen=True)
class DeploymentState:
    app: str
    worktree_id: str
    project: str
    alias: str
    url: str = ""
    port: str = ""
    tailscale_port: str = ""
    tailscale_target: str = ""
    tailscale_previous_target: str = ""
    tailscale_url: str = ""

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        old_umask = os.umask(0o077)
        try:
            temporary = path.with_suffix(".tmp")
            temporary.write_text(json.dumps(asdict(self), indent=2, sort_keys=True) + "\n")
            temporary.replace(path)
        finally:
            os.umask(old_umask)

    @classmethod
    def load(cls, path: Path) -> "DeploymentState":
        data = json.loads(path.read_text())
        allowed = {field.name for field in fields(cls)}
        return cls(**{key: value for key, value in data.items() if key in allowed})


def runtime_dir(root: Path) -> Path:
    return root / ".hermes" / "runtime" / "deploy"
