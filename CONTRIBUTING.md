# Contributing

1. Define the change and its acceptance criteria in a compact plan under `.hermes/plans/` when planning is required.
2. Create one focused local feature branch and isolated worktree for each coherent change.
3. Keep app-specific code in `apps/<app>`; promote code to `packages/*` only after a real cross-app reuse case is identified or an ADR justifies earlier extraction.
4. Add or update relevant tests and record reproducible verification evidence for the resulting local commit.
5. For UI changes, include Storybook evidence or equivalent screenshots and obtain recorded human approval before integration.
6. Review and merge the branch into synchronized local `main`; do not push a feature branch or create a remote GitHub issue or pull request unless explicitly requested.
7. Stop worktree-local deployments and remove their containers before deleting the worktree and local feature branch.
8. Push only the resulting `main` branch without force, then verify CI for the exact pushed SHA.
9. Record risks, migrations, and follow-up work in the plan or handoff.
