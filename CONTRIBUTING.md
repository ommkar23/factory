# Contributing

1. Start from a GitHub issue with acceptance criteria and an app/area label.
2. Use one branch and Git worktree per implementation task.
3. Keep app-specific code in `apps/<app>`; promote code to `packages/*` only after a real cross-app reuse case is identified.
4. Add tests and structured handoff evidence with every pull request.
5. UI pull requests must include Storybook evidence and recorded human approval.
6. Implementation agents may push and open pull requests but may not merge them.
7. `lead-sde` reviews, integrates, and merges only after required checks pass.
