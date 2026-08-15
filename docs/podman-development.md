# Local Podman development

Governing issue: https://github.com/ommkar23/factory/issues/4

This is a local-only development workflow. It intentionally has no production deployment configuration, provider integration, credentials, or secret mounts.

## Start

```bash
podman compose up --build
```

- Live Splash: http://127.0.0.1:3000
- Weather: http://127.0.0.1:3001
- Factory Home: http://127.0.0.1:3002
- UI Storybook: http://127.0.0.1:6006

Each service binds to `0.0.0.0` inside its container, while compose publishes only loopback host ports. Compose bind-mounts the tracked workspace files required for development at `/workspace`, intentionally excluding gitignored local `.env` files; named volumes hold root `node_modules` and the pnpm cache. Containers run as UID/GID `1000:1000`. The Compose configuration enables polling-based watchers for macOS bind mounts; Next runs with webpack because its default Turbopack watcher did not observe host file edits through the Podman macOS mount.

## Verify and stop

```bash
podman compose ps
curl -fsS http://127.0.0.1:3000
curl -fsS http://127.0.0.1:3001
curl -fsS http://127.0.0.1:3002
curl -fsS http://127.0.0.1:6006
podman compose down
```

Use `podman compose down` (without `-v`) to retain dependencies and cache across restarts. `podman compose down -v` removes those local development volumes.

## Environment variables

A future Unsplash key must remain server-side and live only in a gitignored local `.env` file. Do not place it in client-side variables, compose files, or source control.
