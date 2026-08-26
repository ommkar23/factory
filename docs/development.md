# Development

## Prerequisites

Factory requires Node.js 24 or newer, pnpm 11 or newer, Python 3.12, and Docker Engine with the Compose plugin.

Install dependencies and run the repository checks:

```bash
corepack enable
pnpm install
pnpm check
```

## Development VM

Factory can run on any Linux VM provider. The recommended baseline is 4 vCPU, 16 GB RAM, 80 GB of persistent disk, and a non-root SSH user. Restrict inbound access to SSH; Factory and Supabase bind only to VM loopback.

Install Docker, Git, curl, Python 3.12, Node.js 24, Portless, and agent-browser using supported installers. Install the Node.js tools and browser runtime with:

```bash
npm install -g portless agent-browser
agent-browser install --with-deps
```

If required by the VM, configure agent-browser to launch Chrome with `--no-sandbox`.

Clone Factory and use its worktree-aware lifecycle command:

```bash
cd factory
./scripts/worktree-dev up
./scripts/worktree-dev status
./scripts/worktree-dev clean
```

The command derives a stable ID from the canonical worktree path, creates an isolated Compose project, assigns loopback ports, registers stable worktree-prefixed `.localhost` URLs with Portless, and tracks owned resources in `.hermes/runtime/`. `./scripts/setup-factory-dev.sh` is a compatibility alias for `worktree-dev up`.

### Worktree resource ownership

Use `scripts/worktree-dev` instead of calling Compose directly. It applies the worktree ID to Compose resources, named volumes, port allocations, background processes, test output, and runtime manifests. The ignored ledger and Docker labels provide independent ownership records so interrupted operations can recover safely. Fixed Compose project names and `container_name` values are prohibited because they prevent parallel worktrees.

Mutable database and service state belongs in worktree-labeled Docker named volumes, not bind mounts in the worktree. Any required writable bind mount must use the host user and group. Package-manager, browser, and image caches are shared and must not be removed unless explicitly recorded as worktree-owned.

Run `./scripts/worktree-dev clean` before removing Git worktree metadata. Cleanup is idempotent and removes resources in this order:

1. Background processes
2. Containers, networks, and named volumes
3. Generated build and test output
4. Foreign-owned files
5. Preserved plans and user artifacts
6. Git worktree and optional feature branch
7. Runtime ledger

Verify cleanup with:

```bash
docker ps -a --filter "label=com.factory.worktree=<worktree-id>"
docker network ls --filter "label=com.factory.worktree=<worktree-id>"
docker volume ls --filter "label=com.factory.worktree=<worktree-id>"
git worktree list
```

No recorded listener, process, worktree-owned Docker resource, foreign-owned file, or removed worktree path may remain. Cleanup removes Portless aliases before Compose resources and generated secrets. Repeated cleanup and cleanup after interrupted startup must remain safe; stale-resource collection may remove resources only when their worktree is gone and no active lifecycle lease references them.

### Remote access

For remote VMs, choose an available unprivileged proxy port, start Portless without TLS, and then start Factory:

```bash
export PORTLESS_PORT=<available-port>
portless proxy start --no-tls
./scripts/worktree-dev up
```

Tunnel that proxy entry point from the development machine:

```bash
ssh -N -L "${PORTLESS_PORT}:127.0.0.1:${PORTLESS_PORT}" <user>@<vm-host>
```

Use the URLs printed by `worktree-dev up`. Linked worktrees receive distinct hostnames.

## Running the unified web runtime directly

Use the same runtime entry point as the Home container. It starts all three Next.js development servers on private loopback ports and exposes one public port:

```bash
pnpm install --frozen-lockfile
NODE_ENV=development \
FACTORY_SHARED_ORIGIN=true \
FACTORY_API_URL=http://localhost:3004 \
LIVE_SPLASH_URL=http://localhost:8080/live-splash \
WEATHER_URL=http://localhost:8080/weather \
PORT=8080 node scripts/unified-web.mjs
```

Open `http://localhost:8080`, `/weather`, and `/live-splash`. Source changes in any app retain Next.js hot reload. Prefer `scripts/worktree-dev up` for the complete API, Supabase, Portless, and isolated-resource setup.

Production uses the same route map and one Home image containing the three standalone Next.js outputs. Build it with `FACTORY_SHARED_ORIGIN=true`; never enable development authentication in that image.

## Local authentication

An unauthenticated visit to `/`, `/weather`, or `/live-splash` redirects to the owning app's login page. In development that page automatically calls the server-only `/api/auth/dev/bootstrap` endpoint, which authenticates to the API with the configured issuer secret, relays HttpOnly cookies, and returns to the requested app route. Production does not call or expose development bootstrap behavior and instead presents Google OAuth through `/auth/*`. Configuration and API contract details are documented in [the API service README](../services/api/README.md) and [API documentation](api.md).
