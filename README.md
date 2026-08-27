# Factory

Factory is a multi-application product platform built as a pnpm/Turborepo monorepo. It combines Next.js applications and reusable JavaScript packages with a FastAPI service for authentication, application APIs, and external-provider integrations.

## Technology stack

### Runtimes and languages

- **JavaScript** — application and shared-package language.
- **Node.js 24+** — JavaScript runtime.
- **pnpm 11+** — package manager.
- **Python 3.12** (`>=3.12,<3.13`) — API runtime.

### Application platform

- **Next.js 16.1.1** — web application framework.
- **React 19.2.3** — user-interface library.
- **FastAPI 0.141.1** — backend API framework.
- **Tailwind CSS 4** (`^4.1.18`) — styling framework.
- **Supabase CLI 2.114.0** — local Supabase tooling.
- **Terraform 1.9+** — Google Cloud infrastructure definition.

### Build, quality, and testing

- **Turborepo 2.10.9** — monorepo task orchestration.
- **Storybook 10.5.8** — component development and review.
- **Vitest 3.2.4** — JavaScript unit and component tests.
- **Playwright 1.58.2** — browser contract and end-to-end tests.
- **ESLint 9.39.1** — JavaScript linting.
- **Prettier 3.9.6** — source formatting.

## Applications

- **Factory Home** — launcher for the Factory applications.
- **Live Splash** — Factory's live splash experience.
- **Weather** — location search and weather experience.
- **Storybook** — review surface for reusable UI components.

## Repository structure

- `apps/<app-name>` — independently owned Next.js applications.
- `packages/auth` — shared helpers and UI for authentication through each application's `/auth/*` routes.
- `packages/ui` — reusable, accessible UI primitives and composed components.
- `services/api` — FastAPI boundary for authentication, application APIs, and external providers.
- `supabase` — pinned self-hosted Supabase development configuration.
- `infra/gcp` — production Google Cloud infrastructure.
- `e2e` — Playwright contract and end-to-end test suites.
- `scripts` — repository-wide development automation.
- `.github` — ownership policy and GitHub Actions.

## Architecture

Browser-facing applications access backend capabilities through same-origin Factory `/auth/*` and `/app/*` routes. The FastAPI service owns Supabase OAuth, session lifecycle, provider credentials, upstream integrations, response normalization, and safe error mapping. Browsers receive authentication state only through HttpOnly Factory cookies.

Applications keep independent source scaffolds but ship to production in one Home web image and container. Home is served at `/`, Live Splash at `/live-splash`, and Weather at `/weather`; the API remains independently deployed for `/auth/*` and `/app/*`. Local production-style verification can instead create a fully isolated stack for any one app.

## Documentation

- [Development environment and application workflows](docs/development.md)
- [API architecture and contracts](docs/api.md)
- [API service](services/api/README.md)
- [Factory architecture](docs/architecture.md)
