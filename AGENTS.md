# Factory agent operating rules

## Repository scope

Factory is the single repository for all applications in this product portfolio. Every application change, shared-package change, issue, pull request, and CI workflow belongs here.

## Roles and handoffs

1. `product-manager` decides what should be built and turns research, feedback, defects, and requests into product-ready GitHub issues.
2. `lead-sde` owns technical planning, explicit ownership of shared contracts and migrations, worktree task creation, integration, CI/CD, review, and merge decisions.
3. `frontend-sde` and `backend-sde` implement assigned tasks on isolated branches/worktrees and push their branches to this repository.
4. Implementation agents may open pull requests but must not merge them. `lead-sde` merges only after required checks and approvals pass.

## Architecture boundaries

- Put application-specific code in `apps/<app-name>`.
- Put reusable packages in `packages/*`.
- Do not extract an abstraction merely because reuse might occur. Extract after at least two apps need it, unless `lead-sde` records an ADR explaining earlier extraction.
- Shared contracts, generated types, migrations, and reusable packages must have an explicit owner in the issue and technical plan.
- Do not add provider-specific deployment configuration or workflows without explicit human approval.

## GitHub workflow

- Begin product work from a GitHub issue with acceptance criteria, priority, lifecycle, and app/area labels.
- Use one branch and worktree per implementation task.
- Open all pull requests against this repository and link the governing issue.
- Include test output and concise handoff evidence in every pull request.
- Keep commits scoped and never commit credentials or generated secret files.

## Mandatory Storybook approval gate

Any pull request that changes user interface behavior or appearance must complete this gate before merge:

1. The frontend implementer supplies a Storybook URL or screenshots.
2. The implementer blocks the Kanban task with `kind=needs_input` and requests human review.
3. A human records explicit approval in a Kanban comment.
4. A human unblocks the task.
5. The implementer reruns required checks and completes the task.
6. Only then may `lead-sde` merge the pull request.

A green automated CI run does not replace this human approval.
