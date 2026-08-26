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

## Plans

1. Write plans in .hermes/plans folder
2. Compact and declarative plans that define what to do and what to verify.
3. A plan has a list of tasks. Each task has two parts - to-do and to-verify. One sentence each for each part.
4. All the tasks to be implemented sequentially.
5. Use delegate tool to carry out each task.

Suppose a plan has 4 tasks.

1. delegate(task_1)
2. delegate(task_2)
3. ... and so on

## Architecture

- Keep view, presentation, business logic, data models, and API layers separate.
- Define explicit interfaces at layer and package boundaries.
- Keep application-specific code in `apps/*`; share code through `packages/*` only when reusable.
- Home, Live Splash, and Weather call backend APIs only through same-origin Factory `/auth/*` and `/app/*` routes; do not call external providers from applications or browser-facing shared packages.
- Keep external-provider adapters and SDKs, provider credentials, response normalization, upstream timeouts, and safe error mapping in `services/api`.
- App-local `/api/health` and server-only `/api/auth/dev/bootstrap` are explicit exceptions. External navigation and attribution links are links, not API calls.

## UI development

- Keep application-specific shadcn/ui configuration and components in the owning `apps/*` directory.
- Keep only genuinely common Factory-themed compositions in `packages/ui`; promote a composition after at least two applications need it unless an approved architecture decision says otherwise.
- Build shared compositions strictly from the shadcn/ui primitives exported by `packages/ui`; do not create ground-up controls when an appropriate shadcn/ui primitive exists.
- Keep behavior in its domain package or application and presentation in `packages/ui`; for example, authentication requests and state belong in `packages/auth` while common login and account presentation belongs in `packages/ui`.
- Do not add speculative shared components before an active application needs them.

## Delivery

- Work in local branches or worktrees; review and merge locally.

- Push only the resulting `main` branch. Do not create GitHub issues or pull requests unless requested.
- Never commit credentials, tokens, or `.env` files.

## Land the plane

1. Stop local deployment and remove the docker containers.
2. Merge to main.
3. Delete the worktree.

## Verification

- Run relevant tests for changed behavior.
- Run `pnpm check` before handoff.
- Include or update Storybook coverage for reusable UI changes.
