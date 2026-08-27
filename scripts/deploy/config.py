"""Per-deployment secret and Compose environment generation."""
from __future__ import annotations

import base64
import os
from pathlib import Path
import secrets
from .identity import DeploymentIdentity
from .state import runtime_dir


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            values[key] = value
    return values


def write_env(path: Path, values: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    old_umask = os.umask(0o077)
    try:
        path.write_text("".join(f"{key}={value}\n" for key, value in sorted(values.items())))
        path.chmod(0o600)
    finally:
        os.umask(old_umask)


def ensure_environment(identity: DeploymentIdentity, public_url: str) -> tuple[dict[str, str], Path]:
    directory = runtime_dir(identity.root) / identity.app
    supabase_path = directory / "supabase.env"
    api_path = directory / "api.env"
    if supabase_path.exists():
        supabase = read_env(supabase_path)
    else:
        supabase = read_env(identity.root / "supabase" / ".env.example")
        supabase["POSTGRES_PASSWORD"] = secrets.token_urlsafe(32)
        supabase["DASHBOARD_PASSWORD"] = secrets.token_urlsafe(24)
        write_env(supabase_path, supabase)

    if api_path.exists():
        api = read_env(api_path)
    else:
        publishable = supabase.get("SUPABASE_PUBLISHABLE_KEY") or supabase["ANON_KEY"]
        api = {
            "SUPABASE_URL": "http://api-gw:8000",
            "SUPABASE_PUBLISHABLE_KEY": publishable,
            "AUTH_ALLOWED_RETURN_PATHS": "/,/weather,/live-splash",
            "AUTH_SESSION_ENCRYPTION_KEY": base64.urlsafe_b64encode(secrets.token_bytes(32)).decode(),
            "AUTH_SESSION_DATABASE_URL": "sqlite:////data/factory-api/sessions.db",
            "DEV_AUTH_ENABLED": "true",
            "DEV_AUTH_EMAIL": f"factory-{identity.app}-{identity.worktree_id}@example.test",
            "DEV_AUTH_PASSWORD": secrets.token_urlsafe(32),
            "DEV_AUTH_SECRET": secrets.token_urlsafe(32),
        }
        write_env(api_path, api)

    environment = os.environ.copy()
    environment.update(supabase)
    environment.update({
        "COMPOSE_PROJECT_NAME": identity.project,
        "FACTORY_WORKTREE_ID": identity.worktree_id,
        "DEPLOY_APP": identity.app,
        "DEPLOY_WEB_TARGET": "runner" if identity.app == "home" else f"{identity.app}-local",
        "DEPLOY_SHARED_ORIGIN": "true" if identity.app == "home" else "false",
        "DEPLOY_PUBLIC_URL": public_url,
        "DEPLOY_SUPABASE_URL": f"{public_url}/auth/v1",
        "SUPABASE_PUBLIC_URL": f"{public_url}/supabase",
        "API_EXTERNAL_URL": f"{public_url}/auth/v1",
        "SITE_URL": public_url,
        "ADDITIONAL_REDIRECT_URLS": ",".join((public_url, f"{public_url}/weather", f"{public_url}/live-splash")),
        "DEPLOY_API_ENV": str(api_path),
        "DEV_AUTH_SECRET": api["DEV_AUTH_SECRET"],
    })
    return environment, api_path
