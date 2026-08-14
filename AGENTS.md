# Factory project conventions

## Repository purpose

Factory is a pnpm/Turborepo monorepo containing multiple Next.js applications and reusable packages. All application changes, shared-package changes, issues, pull requests, and CI workflows belong in this repository.

## Scaffold

- `apps/<app-name>` contains independently owned Next.js applications.
- `packages/ui` contains reusable accessible UI components.
- `packages/contracts` contains shared TypeScript schemas and API contracts.
- `packages/typescript-config` contains shared TypeScript configuration.
- `tooling` contains repository-wide development automation when justified.
- `docs/architecture` contains architecture decision records.
- `.github` contains centralized issue forms, pull-request conventions, ownership, dependency updates, and CI.

The baseline uses Node.js 24, pnpm 11.21.0, Turborepo 2.10.9, TypeScript 7.0.2, and Prettier 3.9.6.

## Architecture boundaries

- Keep application-specific code in `apps/<app-name>`.
- Extract code into `packages/*` only after at least two applications need it, unless an ADR explains why earlier extraction is justified.
- Give shared contracts, generated types, migrations, and reusable packages explicit ownership in the governing issue or technical plan.
- Preserve clear package exports and avoid importing another application's private implementation.
- Do not add provider-specific deployment configuration or workflows without explicit human approval.

## Development conventions

- Start product work from a GitHub issue with acceptance criteria and relevant app or area labels.
- Keep each branch and pull request focused on one coherent change.
- Link pull requests to their governing issue.
- Add or update tests for changed behavior and include verification evidence in the pull request.
- UI changes must include Storybook evidence or equivalent screenshots and recorded human approval before merge.
- Keep commits scoped and never commit credentials, tokens, `.env` files, or generated secrets.

## Delivery and orchestration

- Freeze shared contracts and cross-lane decisions before parallel implementation begins.
- Give delegated tasks bounded scope, an isolated worktree, an explicit owner, acceptance criteria, dependencies, prohibited actions, and required handoff evidence.
- Require delegated completion handoffs to include an immutable commit reference and reproducible verification evidence; independently verify those claims before integration.
- Keep implementation, technical review, operational deployment, and required human approval as separate responsibilities.
- Route blocking review findings back to the implementer; do not silently repair work under review.
- Inspect branch-protection and merge-policy constraints before work reaches the integration gate.
- Verify the exact integrated commit after merge and push; do not rely only on feature-branch checks.
- Do not launch installed host GUI applications or request broad operating-system permissions during automated verification; prefer HTTP checks and isolated test tooling.
- Identify temporary and long-running processes, clean them up when finished, and provide rollback or stop instructions for persistent review services.

## Required checks

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm check
```

Run relevant application-level tests in addition to the repository checks. A green CI run does not replace required human UI approval.
