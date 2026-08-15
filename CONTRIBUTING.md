# Contributing

1. Start from a GitHub issue with acceptance criteria and an app or area label.
2. Create one focused local feature branch and isolated worktree for each coherent change.
3. Keep app-specific code in `apps/<app>`; promote code to `packages/*` only after a real cross-app reuse case is identified or an ADR justifies earlier extraction.
4. Add or update tests, then hand off an immutable local commit SHA with reproducible verification evidence linked to the governing issue.
5. For UI changes, include Storybook evidence or equivalent screenshots and obtain recorded human approval before integration.
6. Implementers do not push feature branches, create GitHub pull requests, or integrate their own work. Lead-sde reviews the handoff and handles local integration.
7. After technical checks and human UI approval, lead-sde locally squash-merges the reviewed feature into synchronized `main`.
8. Lead-sde pushes `main` directly without force and without weakening branch protection, then verifies CI for the exact pushed SHA.
9. Document risks, migrations, or follow-up work in the issue or handoff.
