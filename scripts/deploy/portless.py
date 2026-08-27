"""Portless alias primitives."""
from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlparse
from .process import Command, Runner


@dataclass(frozen=True)
class Portless:
    runner: Runner

    def url(self, name: str) -> str:
        return self.runner.run(Command(("portless", "get", name)), capture=True).stdout.strip()

    @staticmethod
    def alias(url: str) -> str:
        hostname = urlparse(url).hostname or ""
        if not hostname.endswith(".localhost"):
            raise ValueError("Portless must return a .localhost URL")
        return hostname.removesuffix(".localhost")

    def register(self, alias: str, port: str) -> None:
        self.runner.run(Command(("portless", "alias", alias, port, "--force")))

    def remove(self, alias: str) -> None:
        self.runner.run(Command(("portless", "alias", "--remove", alias)), check=False)
