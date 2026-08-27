"""App-scoped Portless and collision-safe Tailscale Serve routing."""
from __future__ import annotations

from dataclasses import replace
import fcntl
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
from typing import IO

from .portless import Portless
from .process import Command, Runner
from .state import DeploymentState, runtime_dir
from .tailscale import ServeConfiguration, TailscaleStatus, allocate_serve_ports, magic_dns_hostname, serve_state


class RouteError(RuntimeError): pass


def lock_routes(root: Path) -> IO[str]:
    directory = runtime_dir(root)
    directory.mkdir(parents=True, exist_ok=True)
    lock = (directory / "tailscale.lock").open("w")
    fcntl.flock(lock, fcntl.LOCK_EX)
    return lock


def reserved_ports(root: Path) -> list[int]:
    ports = []
    for path in runtime_dir(root).glob("*/state.json"):
        try: value = DeploymentState.load(path).tailscale_port
        except (OSError, json.JSONDecodeError, TypeError): continue
        if value.isdigit(): ports.append(int(value))
    return ports


class Routes:
    def __init__(self, root: Path, runner: Runner, state_path: Path) -> None:
        self.root, self.runner, self.state_path = root, runner, state_path
        self.portless = Portless(runner)

    def tailscale_status(self) -> ServeConfiguration:
        result = self.runner.run(Command(("tailscale", "serve", "status", "--json")), capture=True, check=False, stderr=subprocess.DEVNULL)
        if result.returncode: raise RouteError("Unable to inspect Tailscale Serve routes")
        return ServeConfiguration.from_mapping(json.loads(result.stdout or "{}"))

    def register(self, state: DeploymentState, tailscale: bool) -> DeploymentState:
        # State is persisted before either host-global routing mutation.
        state.save(self.state_path)
        self.runner.run(Command(("portless", "proxy", "start")), stdout=subprocess.DEVNULL)
        self.portless.register(state.alias, state.port)
        if not tailscale: return state
        if shutil.which("tailscale") is None: raise RouteError("tailscale is required with --tailscale")
        with lock_routes(self.root):
            status = self.tailscale_status()
            target = f"http://127.0.0.1:{state.port}"
            previous = state.tailscale_target
            port = state.tailscale_port
            if not port:
                allocation = hashlib.sha256(f"{state.worktree_id}:{state.app}".encode()).hexdigest()[:10]
                port = str(allocate_serve_ports(worktree_hash=allocation, occupied_ports=[*status.occupied_ports, *reserved_ports(self.root)], count=1)[0])
            node = self.runner.run(Command(("tailscale", "status", "--json")), capture=True)
            hostname = magic_dns_hostname(TailscaleStatus.from_mapping(json.loads(node.stdout or "{}")))
            if not hostname: raise RouteError("Tailscale did not report a MagicDNS hostname")
            state = replace(state, tailscale_port=port, tailscale_target=target, tailscale_previous_target=previous, tailscale_url=f"https://{hostname}:{port}{'' if state.app == 'home' else f'/{state.app}'}")
            state.save(self.state_path)
            current = serve_state(status).proxy_for_port(int(port))
            if current and current not in {target, previous}:
                raise RouteError(f"Tailscale HTTPS port {port} is owned by a foreign route; preserving {current}")
            if current != target:
                self.runner.run(Command(("tailscale", "serve", f"--https={port}", "--bg", target)), stdout=subprocess.DEVNULL)
            state = replace(state, tailscale_previous_target="")
            state.save(self.state_path)
            return state

    def remove(self, state: DeploymentState) -> None:
        if state.tailscale_port and state.tailscale_target and shutil.which("tailscale"):
            with lock_routes(self.root):
                try: current = serve_state(self.tailscale_status()).proxy_for_port(int(state.tailscale_port))
                except RouteError: current = None
                if current in {state.tailscale_target, state.tailscale_previous_target}:
                    self.runner.run(Command(("tailscale", "serve", f"--https={state.tailscale_port}", "off")), stdout=subprocess.DEVNULL)
                elif current:
                    print(f"Preserving foreign Tailscale route {current}")
        self.portless.remove(state.alias)
