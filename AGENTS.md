# Factory

## Project reference

1. Read [README.md](README.md) for the project overview, applications, repository structure, architecture, and preferred technology versions.
2. Follow [docs/development.md](docs/development.md) for environment setup, local workflows, Portless usage, and worktree resource lifecycle

## Plans

1. [State] Feature ask or bug fix or chore
2. Write plans in .hermes/plans folder
3. Compact and declarative plans that define what to do and what to verify.
4. A plan has a list of tasks. Each task has two parts - to-do and to-verify. One sentence each for each part.
5. All the tasks to be implemented sequentially.
6. [Human] Plan Review
7. [State] Plan approved
8. Use delegate tool to carry out each task.
9. For a plan with four tasks, delegate each task sequentially:
   1. `delegate(task_1)`
   2. `delegate(task_2)`
   3. Continue through the remaining tasks.
10. If the plan includes UI, hand off for Human Review - UI Review.
11. [Human] App review - dev deployment done for human to test
12. [Human] Code review - code in new worktree

## Delivery

- Work in local branches or worktrees; create all worktrees under the repository-local `.worktrees/` directory, and review and merge locally.
- Keep `.worktrees/` ignored by Git.
- Push only the resulting `main` branch. Do not create GitHub issues or pull requests unless requested.
- Never commit credentials, tokens, or `.env` files.

## UI development

- Keep application-specific shadcn/ui configuration and components in the owning `apps/*` directory.
- Keep only genuinely common Factory-themed compositions in `packages/ui`; promote a composition after at least two applications need it unless an approved architecture decision says otherwise.
- Build shared compositions strictly from the shadcn/ui primitives exported by `packages/ui`; do not create ground-up controls when an appropriate shadcn/ui primitive exists.
- Keep behavior in its domain package or application and presentation in `packages/ui`; for example, authentication requests and state belong in `packages/auth` while common login and account presentation belongs in `packages/ui`.
- Do not add speculative shared components before an active application needs them.

## Verification

- Run relevant tests for changed behavior.
- Run `pnpm check` before handoff.
- Use Storybook for isolated development of reusable UI components; include or update stories and provide Storybook evidence for human review.
