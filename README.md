# Factory

Multi-app JavaScript and Next.js monorepo for building products while extracting reusable UI, contracts, authentication, and tooling.

## Repository model

- `apps/<app-name>` — independently owned Next.js applications.
- `packages/auth` — shared same-origin authentication helpers and UI.
- `packages/ui` — reusable, accessible UI primitives and composed components.
- `packages/contracts` — shared JavaScript API contracts.
- `services/api` — the FastAPI boundary for authentication and external providers.
- `supabase` — pinned self-hosted Supabase development configuration.
- `infra/gcp` — production Google Cloud infrastructure.
- `scripts/` — repository-wide development automation.
- `.github/` — ownership policy and GitHub Actions.

## Local integration workflow

Create one focused local branch and isolated worktree for each coherent change. Review and verify the resulting commit locally, merge it into synchronized local `main`, and remove the worktree after stopping its development resources. Push only the resulting `main` branch.

Do not create remote GitHub issues, pull requests, or feature branches unless explicitly requested. UI changes still require Storybook or equivalent visual evidence and human approval before local integration.

## Getting started

```bash
corepack enable
pnpm install
pnpm check
```

## Provider-agnostic development VM bootstrap

Use any Linux VM provider. Recommended baseline: 4 vCPU, 16 GB RAM, 80 GB persistent disk, a non-root SSH user, and Docker Engine with the Compose plugin. Restrict inbound access to SSH; Factory and Supabase bind only to VM loopback.

Install Docker, Git, curl, Python 3.12, Node.js 24, Portless, and agent-browser using supported installers. Install the Node.js tools with `npm install -g portless agent-browser`, then run `agent-browser install --with-deps`. If the VM requires it, configure agent-browser to launch Chrome with `--no-sandbox`.

Clone Factory, then use the worktree-aware lifecycle command:

```bash
cd factory
./scripts/worktree-dev up
./scripts/worktree-dev status
./scripts/worktree-dev clean
```

The command derives an isolated Compose project from the canonical worktree path, uses Docker-assigned loopback ports, and registers stable worktree-prefixed `.localhost` URLs with Portless. It records owned aliases and resources in `.hermes/runtime/`, creates local secrets only when absent, and removes its aliases, containers, networks, volumes, generated secrets, and ledger during idempotent cleanup. `./scripts/setup-factory-dev.sh` remains a compatibility alias for `worktree-dev up`.

For remote VMs, start Portless without TLS on one unprivileged port before bringing up Factory:

```bash
portless proxy start --no-tls -p 8080
./scripts/worktree-dev up
```

Tunnel that single proxy entry point from the development machine:

```bash
ssh -N -L 8080:127.0.0.1:8080 <user>@<vm-host>
```

Use the URLs printed by `worktree-dev up`; linked worktrees automatically receive distinct hostnames.

## Server-only API authentication

Factory API owns Supabase Google OAuth and persists only encrypted short-lived PKCE/state records. Browsers use same-origin `/auth/*` and `/app/*` paths, and receive only HttpOnly `Factory-Access-Token` and `Factory-Refresh-Token` cookies. The API owns login, callback, session refresh, and logout; Next.js apps do not own callback routes, client token handling, or Supabase clients. For local development, a browser calls its app's `/api/auth/dev/bootstrap`, which is development-only and relays cookies after the app server authenticates to the API with a server-held secret. See [services/api/README.md](services/api/README.md) and [docs/api.md](docs/api.md) for configuration and contract details.

## Direct-process application development

Outside Compose, Factory Home runs at `http://localhost:3002`. Start the three applications in separate terminals:

```bash
pnpm --filter @factory/live-splash dev
pnpm --filter @factory/weather dev
pnpm --filter @factory/home dev
```

Home links to Live Splash at `http://localhost:3000` and Weather at `http://localhost:3001` by default. For independently hosted deployments, configure server-side absolute HTTPS URLs with `LIVE_SPLASH_URL` and `WEATHER_URL`.

For the shared origin `https://factory.markagen.ai`, build Weather with `FACTORY_SHARED_ORIGIN=true` (serves `/weather`) and Live Splash with `FACTORY_SHARED_ORIGIN=true` (serves `/live-splash`), then route those path prefixes to their corresponding applications without stripping the prefix.
