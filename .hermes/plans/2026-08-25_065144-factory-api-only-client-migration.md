# Factory API-Only Client Migration

## Goal and scope

Move all Home, Live Splash, and Weather data access to same-origin Factory `/auth/*` and `/app/*` contracts; no runtime code under `apps/*` may call a third-party API or own a provider adapter. External navigation/attribution links, `/api/health`, and the server-only development auth bootstrap remain; provider calls stay in `services/api`.

## Current context

- Home and Live Splash have no third-party data calls today.
- Weather still duplicates Open-Meteo access in Next.js through `/api/locations`, `/api/weather`, and `lib/open-meteo/provider.js`.
- Factory API already owns Open-Meteo behind `GET /app/weather/v1/locations` and `GET /app/weather/v1/current-conditions`, and every app already routes root `/app/*` requests to it.

## Tasks

### 1. Point Weather directly at Factory API

- **To do:** Update `apps/weather/lib/weather-api-client.js` and its tests to use root-relative `/app/weather/v1/locations` and `/app/weather/v1/current-conditions`, preserving cancellation, concurrency, response validation, generic UI errors, and cookie authentication without adding the Weather base path.
- **To verify:** `pnpm --filter @factory/weather test` proves exact Factory URLs in standalone and shared-origin modes, normalized success envelopes, stable `INVALID_CREDENTIALS`/request/upstream failures, and independent abort behavior.

### 2. Remove client-owned provider and data routes

- **To do:** Delete `apps/weather/app/api/locations/route.js`, `apps/weather/app/api/weather/route.js`, `apps/weather/lib/weather-api.js`, `apps/weather/lib/open-meteo/provider.js`, and their route/provider tests, retaining only UI/domain logic that consumes Factory response models.
- **To verify:** Weather tests and build pass, the deleted `/api/locations` and `/api/weather` contracts return no application route, and no Open-Meteo endpoint or outbound provider request remains under `apps/`.

### 3. Enforce the boundary across every client app

- **To do:** Add a repository-owned architecture test under `scripts/` and include it in the root check so runtime app/shared-client sources and dependencies reject third-party API SDKs, public provider credentials, provider URL requests, and app-owned data BFF routes while allowing links plus the documented health and server-only auth bootstrap routes.
- **To verify:** The guard covers Home, Live Splash, Weather, and browser-facing shared packages; a fixture violation fails it, current allowed routes pass it, and `node --test scripts/checks/client-api-boundary.test.mjs` succeeds.

### 4. Document and exercise the API-only contract

- **To do:** Update `AGENTS.md`, `services/api/README.md`, and relevant E2E coverage to state that clients call only same-origin Factory endpoints and that external-provider adapters, credentials, normalization, timeouts, and safe error mapping belong to `services/api`.
- **To verify:** API tests prove the existing Weather contracts and protected credential behavior, local-proxy browser coverage observes Weather requests only at `/app/weather/v1/*`, and `pnpm check` passes as the final repository gate.

## Public contracts

- Keep `GET /app/weather/v1/locations?q=…`.
- Keep `GET /app/weather/v1/current-conditions?latitude=…&longitude=…`.
- Remove Weather’s client-owned `GET /api/locations` and `GET /api/weather` routes.
- Add no Home or Live Splash data endpoint until those clients need server-owned data.

## Migration constraints

- Browser API paths remain root-relative `/app/*`; never prefix them with `/weather` in shared-origin deployments.
- Factory API remains the only caller of Open-Meteo, Supabase, or any future external data provider; clients receive normalized Factory contracts only.
- Keep `/api/auth/dev/bootstrap` server-only so browsers never receive the development issuer secret.
- This plan does not change providers, weather payloads, UI behavior, authentication architecture, external links, or the separate Live Splash prototype worktree.

## Final verification

- `pnpm --filter @factory/weather test`
- `pnpm --filter @factory/weather build`
- `docker run --rm -v "$PWD/services/api:/workspace" -w /workspace python:3.12.14-slim sh -c 'pip install -e .[dev] && pytest -q'`
- `pnpm test:e2e -- --project=local-proxy`
- `pnpm check`
