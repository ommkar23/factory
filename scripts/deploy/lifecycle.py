"""App-scoped isolated Compose lifecycle."""
from __future__ import annotations

import shutil
import subprocess
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

from .auth import provision
from .config import ensure_environment, read_env
from .docker import Compose
from .identity import APPS, DeploymentIdentity
from .process import Command, Runner
from .routes import Routes
from .state import DeploymentState, runtime_dir


class DeploymentError(RuntimeError):
    pass


class AppLifecycle:
    def __init__(self, root: Path, app: str, runner: Runner | None = None, *, tailscale: bool = False) -> None:
        self.identity = DeploymentIdentity.create(root, app)
        self.runner = runner or Runner()
        self.tailscale = tailscale
        self.state_path = runtime_dir(self.identity.root) / app / "state.json"
        self.compose = Compose(self.identity.root, self.identity.project, self.runner, self.identity.root / "scripts/deploy/compose.yml")

    @property
    def public_url(self) -> str:
        return f"http://{self.identity.alias}.localhost"

    def environment(self) -> dict[str, str]:
        environment, _ = ensure_environment(self.identity, self.public_url)
        return environment

    def require_commands(self) -> None:
        for command in ("docker", "portless"):
            if shutil.which(command) is None:
                raise DeploymentError(f"{command} is required")
        self.runner.run(Command(("docker", "compose", "version")))

    def published_port(self, service: str = "gateway", container_port: str = "8080") -> str:
        result = self.compose.run("port", service, container_port, capture=True, env=self.environment())
        mapping = result.stdout.strip()
        if not mapping:
            raise DeploymentError(f"{self.identity.app} {service} has no published port")
        return mapping.rsplit(":", 1)[-1]

    def save_initial_state(self, port: str = "") -> DeploymentState:
        state = DeploymentState(self.identity.app, self.identity.worktree_id, self.identity.project, self.identity.alias, self.public_url, port)
        state.save(self.state_path)
        return state

    def provision_auth(self, environment: dict[str, str]) -> None:
        api = read_env(Path(environment["DEPLOY_API_ENV"]))
        auth_port = self.published_port("api-gw", "8000")
        for _ in range(30):
            try:
                provision(f"http://127.0.0.1:{auth_port}/auth/v1", environment["SERVICE_ROLE_KEY"], api["DEV_AUTH_EMAIL"], api["DEV_AUTH_PASSWORD"])
                return
            except RuntimeError:
                time.sleep(1)
        raise DeploymentError(f"{self.identity.app} auth provisioning failed")

    def wait_ready(self, port: str) -> None:
        for _ in range(60):
            try:
                with urlopen(f"http://127.0.0.1:{port}{'/' if self.identity.app == 'home' else f'/{self.identity.app}'}", timeout=3) as response:
                    if response.status < 500:
                        return
            except (OSError, URLError):
                time.sleep(2)
        raise DeploymentError(f"{self.identity.app} readiness timed out")

    def up(self) -> DeploymentState:
        self.require_commands()
        environment = self.environment()
        completed = False
        try:
            self.compose.run("config", env=environment, stdout=subprocess.DEVNULL)
            self.compose.run("up", "-d", "--build", env=environment)
            port = self.published_port()
            state = self.save_initial_state(port)
            state = Routes(self.identity.root, self.runner, self.state_path).register(state, self.tailscale)
            self.provision_auth(environment)
            self.wait_ready(port)
            completed = True
            return state
        finally:
            if not completed:
                self.down()

    def down(self) -> None:
        environment = self.environment()
        if self.state_path.exists():
            Routes(self.identity.root, self.runner, self.state_path).remove(DeploymentState.load(self.state_path))
        self.compose.run("down", "--volumes", "--remove-orphans", check=False, env=environment, stdout=subprocess.DEVNULL)
        directory = self.state_path.parent
        if directory.exists():
            shutil.rmtree(directory)

    def status(self) -> int:
        if not self.state_path.exists():
            print(f"{self.identity.app}: down")
            return 0
        state = DeploymentState.load(self.state_path)
        result = self.compose.run("ps", "--status", "running", "--quiet", capture=True, check=False, env=self.environment())
        condition = "running" if result.stdout.strip() else "stopped"
        print(f"{state.app}: {condition} {state.url}")
        return 0


def all_lifecycles(root: Path, runner: Runner | None = None):
    return [AppLifecycle(root, app, runner) for app in APPS]
