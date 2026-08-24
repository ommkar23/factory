# Factory

Multi-app Next.js monorepo for building products while extracting reusable UI, contracts, configuration, and tooling.

## Repository model

- `apps/<app-name>` — independently owned Next.js applications.
- `packages/ui` — reusable, accessible UI primitives and composed components.
- `packages/contracts` — shared TypeScript schemas and API contracts.
- `packages/typescript-config` — shared TypeScript configuration.
- `tooling/` — repository-wide development automation added when justified.
- `.github/` — centralized issues, ownership policy, and GitHub Actions.

All product work is tracked through GitHub issues in this repository. Use labels and milestones to identify the app, work type, priority, and lifecycle stage.

## Local integration workflow

Factory is a sole-owner repository. Implementers work in isolated local feature branches and worktrees, then hand lead-sde an immutable commit SHA with verification evidence. Implementers do not push feature branches, create GitHub pull requests, or integrate their own work.

Lead-sde reviews the handoff after local technical checks and required human UI approval. Lead-sde locally squash-merges the reviewed feature into synchronized `main`, pushes `main` directly without force or weaker branch protection, and verifies CI for the exact pushed SHA.

## Getting started

```bash
corepack enable
pnpm install
pnpm check
```

## Provider-agnostic development VM bootstrap

Use any Linux VM provider. Recommended baseline: 4 vCPU, 16 GB RAM, 80 GB persistent disk, a non-root SSH user, and Docker Engine with the Compose plugin. Restrict inbound access to SSH; Factory and Supabase bind only to VM loopback.

Install Docker, Git, curl, Python 3, Node.js 24, and agent-browser using your distribution package manager or supported installers. On Linux VMs, install agent-browser with `npm install -g agent-browser`, then run `agent-browser install --with-deps`. If the VM requires it, configure agent-browser to launch Chrome with `--no-sandbox`. Clone Factory with GitHub HTTPS credentials, then run:

```bash
cd factory
./scripts/setup-factory-dev.sh
```

The script creates ignored runtime configuration and Supabase secrets when absent, validates Compose, starts the three apps plus the self-hosted Supabase stack, and waits for local readiness. It does not install Docker, overwrite existing secrets, or commit files.

From a development Mac, tunnel the loopback-only services:

```bash
ssh -N \
  -L 3001:127.0.0.1:3001 \
  -L 3002:127.0.0.1:3002 \
  -L 3003:127.0.0.1:3003 \
  -L 8000:127.0.0.1:8000 \
  <user>@<vm-host>
```

Open Home, Live Splash, and Weather at http://localhost:3001, :3002, and :3003. The Supabase gateway remains private and is available through the tunnel at http://localhost:8000.

## Server-only API authentication

The FastAPI service owns Supabase Google OAuth at `/auth/login` and keeps Supabase credentials in its encrypted server-side session store. Browser clients receive only the `Factory-Session` HttpOnly secure cookie; access and refresh tokens are never delivered to the browser. See [services/api/README.md](services/api/README.md) for required production configuration and the API contract.

## Home app

Factory Home is the application directory at `http://localhost:3002`. Start the
three applications in separate terminals:

```bash
pnpm --filter @factory/live-splash dev
pnpm --filter @factory/weather dev
pnpm --filter @factory/home dev
```

Home links to Live Splash at `http://localhost:3000` and Weather at
`http://localhost:3001` by default. For independently hosted deployments,
configure public absolute HTTPS URLs with `LIVE_SPLASH_URL` and `WEATHER_URL`.

For the shared origin `https://factory.markagen.ai`, build Weather with
`FACTORY_SHARED_ORIGIN=true` (serves `/weather`) and Live Splash with
`FACTORY_SHARED_ORIGIN=true` (serves `/live-splash`), then route those path
prefixes to their corresponding applications without stripping the prefix.
