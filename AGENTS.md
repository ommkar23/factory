# Factory

## Stack

- pnpm/Turborepo monorepo for Next.js applications and reusable JavaScript packages.
- Node.js 24+, pnpm 11+, JavaScript, Vitest, ESLint, Prettier, Playwright, and Storybook.
- GitHub Pages hosts Storybook built from `main` at `/factory/storybook/`.

## Applications

- `apps/home` / `@factory/home`: Factory Home launcher on port 3002.
- `apps/live-splash` / `@factory/live-splash`: Live Splash on port 3000.
- `apps/weather` / `@factory/weather`: Weather on port 3001.
- Home links use `LIVE_SPLASH_URL` and `WEATHER_URL`, defaulting to local ports.
- `compose.yml` runs all apps plus Storybook on port 6006.

## Architecture

- Keep view, presentation, business logic, data models, and API layers separate.
- Define explicit interfaces at layer and package boundaries.
- Keep application-specific code in `apps/*`; share code through `packages/*` only when reusable.
- Home, Live Splash, and Weather call backend APIs only through same-origin Factory `/auth/*` and `/app/*` routes; do not call external providers from applications or browser-facing shared packages.
- Keep external-provider adapters and SDKs, provider credentials, response normalization, upstream timeouts, and safe error mapping in `services/api`.
- App-local `/api/health` and server-only `/api/auth/dev/bootstrap` are explicit exceptions. External navigation and attribution links are links, not API calls.

## Delivery

- Work in local branches or worktrees; review and merge locally.
- Before implementing any feature, write its plan in `plans/` and obtain a review of that plan.
- Deploy Storybook from `main` to GitHub Pages at `/factory/storybook/`.
- For branch work, deploy Storybook only to the local `storybook` service with Podman Compose or Docker Compose; do not publish branch builds to GitHub Pages.
- Push only the resulting `main` branch. Do not create GitHub issues or pull requests unless requested.
- Never commit credentials, tokens, or `.env` files.

## Verification

- Run relevant tests for changed behavior.
- Run `pnpm check` before handoff.
- Include or update Storybook coverage for reusable UI changes.
