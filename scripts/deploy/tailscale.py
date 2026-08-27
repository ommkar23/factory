"""Helpers for allocating and inspecting worktree-owned Tailscale Serve routes."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

MIN_PORT = 10_000
MAX_PORT = 59_999
PORT_COUNT = MAX_PORT - MIN_PORT + 1


def allocate_serve_ports(
    *, worktree_hash: str, occupied_ports: list[int], count: int = 2
) -> list[int]:
    if len(worktree_hash) < 8 or any(character not in "0123456789abcdefABCDEF" for character in worktree_hash):
        raise ValueError("worktree_hash must contain at least eight hexadecimal characters")

    occupied = {int(port) for port in occupied_ports}
    selected: list[int] = []
    start = MIN_PORT + (int(worktree_hash[:8], 16) % PORT_COUNT)
    for offset in range(PORT_COUNT):
        if len(selected) == count:
            break
        candidate = MIN_PORT + ((start - MIN_PORT + offset) % PORT_COUNT)
        if candidate not in occupied:
            selected.append(candidate)
            occupied.add(candidate)
    if len(selected) != count:
        raise RuntimeError("No free Tailscale Serve HTTPS ports are available")
    return selected


@dataclass(frozen=True)
class ServeProxy:
    port: int
    target: str


@dataclass(frozen=True)
class ServeConfiguration:
    occupied_ports: frozenset[int] = frozenset()
    proxies: tuple[ServeProxy, ...] = ()

    @classmethod
    def from_mapping(cls, configuration: Mapping[str, object] | None = None) -> ServeConfiguration:
        if configuration is None:
            return cls()
        tcp = configuration.get("TCP")
        occupied_ports = frozenset(int(port) for port in tcp) if isinstance(tcp, Mapping) else frozenset()

        proxies: list[ServeProxy] = []
        web_routes = configuration.get("Web")
        if isinstance(web_routes, Mapping):
            for address, raw_web in web_routes.items():
                if not isinstance(address, str) or not isinstance(raw_web, Mapping):
                    continue
                suffix = address.rsplit(":", 1)
                port = int(suffix[1]) if len(suffix) == 2 and suffix[1].isdigit() else 443
                handlers = raw_web.get("Handlers")
                root = handlers.get("/") if isinstance(handlers, Mapping) else None
                target = root.get("Proxy") if isinstance(root, Mapping) else None
                if isinstance(target, str) and target:
                    proxies.append(ServeProxy(port=port, target=target))
        return cls(occupied_ports=occupied_ports, proxies=tuple(proxies))


@dataclass(frozen=True)
class ServeState:
    occupied_ports: frozenset[int]
    proxies: tuple[ServeProxy, ...]

    def proxy_for_port(self, port: int) -> str:
        return next((proxy.target for proxy in self.proxies if proxy.port == port), "")


def serve_state(configuration: ServeConfiguration | None = None) -> ServeState:
    configuration = configuration or ServeConfiguration()
    return ServeState(
        occupied_ports=configuration.occupied_ports,
        proxies=configuration.proxies,
    )


@dataclass(frozen=True)
class TailscaleStatus:
    dns_name: str = ""

    @classmethod
    def from_mapping(cls, status: Mapping[str, object] | None = None) -> TailscaleStatus:
        if status is None:
            return cls()
        self_status = status.get("Self")
        dns_name = self_status.get("DNSName") if isinstance(self_status, Mapping) else ""
        return cls(dns_name=dns_name if isinstance(dns_name, str) else "")


def magic_dns_hostname(status: TailscaleStatus | None = None) -> str:
    return (status or TailscaleStatus()).dns_name.removesuffix(".")
