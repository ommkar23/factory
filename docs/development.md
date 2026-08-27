# Development

## Prerequisites

Factory requires Node.js 24+, pnpm 11+, Python 3.12, Docker Compose, and Portless. Install dependencies and verify the repository:

```bash
corepack enable
pnpm install
pnpm check
```

## Isolated application deployments

Use the Python deployment package for local production-style stacks. Every app receives its own web, API, Supabase, network, named volumes, generated secrets, database, development user, and app-scoped Portless alias. State and secrets are written only beneath ignored `.hermes/runtime/deploy/`.

```bash
python3 -m scripts.deploy.app up home
python3 -m scripts.deploy.app up weather
python3 -m scripts.deploy.app up live-splash
python3 -m scripts.deploy.app status
```

Home uses the production unified image and runs Home, Weather, and Live Splash through `scripts/unified-web.mjs`. Its directory links resolve on the current Home origin at `/weather` and `/live-splash`. Weather and Live Splash use their single-process standalone image targets and each app is rooted at its own base URL. Different apps can run concurrently; repeating `up` converges the same app's Compose project.

Portless and optional Tailscale URLs always identify an app at the origin root, without an appended app-name path. Pass `--tailscale` to add a collision-safe tailnet HTTPS route. Route ownership is recorded before Tailscale is changed, and cleanup removes a route only while its current target still matches the deployment.

```bash
python3 -m scripts.deploy.app up weather --tailscale
python3 -m scripts.deploy.app down weather
python3 -m scripts.deploy.app down --all
```

Run `down --all` before removing a worktree. Cleanup is app-scoped and removes Compose containers, networks, named volumes, generated credentials, Portless aliases, and owned Tailscale routes while preserving foreign routes.

## Source development

Run an application directly with its package script when hot reload is preferred, and run Storybook independently:

```bash
pnpm --filter @factory/home dev
pnpm --filter @factory/ui dev
```

The repository `compose.yml` remains the unified development topology used by contract tests. The app deployment CLI is the supported resource-owning lifecycle for production-style local verification.

## Production

Production continues to build and deploy only the unified Home image plus the independently deployed API. It does not deploy the local Weather or Live Splash image targets and never enables development authentication.

## Local authentication

Each isolated deployment provisions a distinct confirmed Supabase user after its own API and Supabase services become ready. Credentials and the server-only issuer secret are stored in that deployment's ignored `api.env`; browsers receive only HttpOnly Factory cookies through the owning app's same-origin auth routes.
