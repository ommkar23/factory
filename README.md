# Factory

Multi-app Next.js monorepo for building products while extracting reusable UI, contracts, configuration, and tooling.

## Repository model

- `apps/<app-name>` — independently owned Next.js applications.
- `packages/ui` — reusable, accessible UI primitives and composed components.
- `packages/contracts` — shared TypeScript schemas and API contracts.
- `packages/typescript-config` — shared TypeScript configuration.
- `tooling/` — repository-wide development automation added when justified.
- `.github/` — centralized issues, pull requests, review policy, and GitHub Actions.

All product work is tracked through GitHub issues and pull requests in this repository. Use labels and milestones to identify the app, work type, priority, and lifecycle stage.

## Getting started

```bash
corepack enable
pnpm install
pnpm check
```

No application is scaffolded by default. A new app starts from an approved product brief and technical plan.
