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

No application is scaffolded by default. A new app starts from an approved product brief and technical plan.
