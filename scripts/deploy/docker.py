"""Docker Compose command construction."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from .process import Command, Runner


@dataclass(frozen=True)
class Compose:
    root: Path
    project: str
    runner: Runner
    file: Path

    def run(self, *args: str, capture: bool = False, check: bool = True, env=None, stdout=None):
        command = Command(("docker", "compose", "--project-name", self.project, "--file", str(self.file), *args), self.root)
        return self.runner.run(command, capture=capture, check=check, env=env, stdout=stdout)
