"""Command execution boundary."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import subprocess
from typing import IO, Mapping


@dataclass(frozen=True)
class Command:
    args: tuple[str, ...]
    cwd: Path | None = None


class Runner:
    def run(self, command: Command, *, capture: bool = False, check: bool = True, env: Mapping[str, str] | None = None, stdout: int | IO[str] | None = None, stderr: int | IO[str] | None = None) -> subprocess.CompletedProcess[str]:
        return subprocess.run(command.args, cwd=command.cwd, env=env, check=check, text=True, stdout=subprocess.PIPE if capture else stdout, stderr=stderr)
