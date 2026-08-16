# Factory

## Stack

- pnpm/Turborepo monorepo for Next.js applications and reusable TypeScript packages.
- Node.js 24+, pnpm 11+, TypeScript 5, Vitest, ESLint, Prettier, Playwright, and Storybook.
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

## Delivery

- Work in local branches or worktrees; review and merge locally.
- Deploy Storybook from `main` to GitHub Pages at `/factory/storybook/`.
- For branch work, deploy Storybook only to the local `storybook` service with Podman Compose or Docker Compose; do not publish branch builds to GitHub Pages.
- Push only the resulting `main` branch. Do not create GitHub issues or pull requests unless requested.
- Never commit credentials, tokens, or `.env` files.

## Verification

- Run relevant tests for changed behavior.
- Run `pnpm check` before handoff.
- Include or update Storybook coverage for reusable UI changes.
