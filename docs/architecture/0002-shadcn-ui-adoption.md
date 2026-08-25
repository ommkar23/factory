# Adopt source-owned shadcn/ui primitives

- Status: Accepted
- Date: 2026-08-15
- Owner: Factory UI maintainers
- Governing issue: [#6](https://github.com/ommkar23/factory/issues/6)

> Implementation note (2026-08-25): Factory subsequently migrated from TypeScript to JavaScript. Current `components.json` files use `"tsx": false`, and current delivery uses locally reviewed branches and worktrees without requiring remote issues or pull requests. The text below is retained as the historical decision and implementation record.

## Context

Factory has two Next.js applications (`apps/weather` and `apps/live-splash`) that
need a consistent, accessible foundation without moving application-domain UI
into a generic package. The product owner requested literal shadcn/ui adoption.
That request supersedes issue #6's previous non-goal that prohibited external
component and icon runtime dependencies. This ADR records the bounded adoption
so later work can use the same source, contracts, and migration rules.

This is a Tailwind CSS v4 and component-source migration. It is not a black-box
package installation, a wholesale domain UI rewrite, or authorization for
backend, API, database, Supabase, RLS, production deployment, or dark-mode
work.

## Decision

### Shared package and public contract

`packages/ui` is the source-owned home for shared primitives, shared tokens,
utility helpers, and shared CSS. Consumers import only published `@factory/ui`
subpaths, including:

- `@factory/ui/components/button`
- `@factory/ui/lib/utils`
- `@factory/ui/globals.css`

Applications must not import `packages/ui/src` internals. Package exports and
workspace aliases will make these public paths explicit.

Each participating workspace (`packages/ui`, `apps/weather`, and
`apps/live-splash`) will have a `components.json` with these identical choices:

- `style`: `base-nova`
- `baseColor`: `neutral`
- `iconLibrary`: `lucide`
- `cssVariables`: `true`
- `rsc`: `true`
- `tsx`: `true`
- Tailwind `config`: empty (`""`) for Tailwind CSS v4

The shadcn CLI is a controlled source-generation tool, not an opaque runtime
component package. It must be run from an inspected app workspace, with the
resulting paths, imports, and dependency changes reviewed before commit. Never
run a catalog-wide install such as `add --all`.

### Styling and tokens

The repository will use Tailwind CSS v4. Shared CSS will expose the shadcn token
surface and layer stable public `--factory-*` semantic variables above it, so
applications can override supported semantic values without changing component
internals. The initial implementation is light theme only.

The Tailwind v4 source configuration must explicitly register the shared package
and application source paths; builds must not rely on whichever directory happens
to be the current working directory. Dynamic class construction is avoided in
favor of statically detectable class names. App-specific layout and domain
styling remains within the relevant app whenever that is clearer.

### Initial component boundary

The initial shared primitives are:

- `Button`
- `Input`
- `Label`
- `Card`
- `Badge`
- `Alert`
- `Skeleton` and/or `Spinner`
- the `cn` utility

Do not introduce `Select`, `Dialog`, `Command`, `Popover`, navigation,
data-table, or other complex primitives until a real approved flow needs one.

Weather's `LocationSearch` is deliberately outside this initial primitive
migration. Its combobox/listbox behavior, active-descendant keyboard model,
disabled-result handling, live announcements, retry/remove semantics,
accessible names, and responsive domain-data layout must be preserved. It must
not be blindly replaced with `Command` or `Popover`.

### Dependency ownership and updates

Generated component source and its direct runtime dependencies belong to
`@factory/ui` when the component is shared. React and React DOM remain
compatible peers rather than being bundled by the shared package. Applications
declare `@factory/ui` as a workspace dependency and retain only app-specific
runtime dependencies.

Any dependency added for a justified shadcn primitive, Tailwind integration, or
Lucide icon use must be recorded in its change handoff with its owner and
purpose. Updates are deliberate: review upstream release notes, regenerate or
patch only the affected source, inspect the diff and exports, run the applicable
checks, and record compatibility or token changes. Local modifications to
source-owned generated files are allowed, but must remain reviewable and be
preserved or consciously reconciled on later updates.

## Migration strategy

1. Establish the shared Tailwind v4, CSS-token, export, and `components.json`
   foundation without changing application UI markup.
2. Add only the approved initial primitives in `packages/ui`.
3. Migrate Weather and Live Splash independently, preserving their domain
   behavior and app-local styling where appropriate.
4. Integrate only after package and application checks pass and the required
   technical and human UI review evidence is recorded.

Implementation starts from immutable base commit
`1d0d87fb0298f1400800d86a4efb3624b1b01140`. The root checkout remains on
`main`; isolated task worktrees perform implementation. The shared feature
branch is `feature/factory-shadcn-ui`. Implementers commit locally and hand
lead-sde an immutable commit SHA with reproducible verification evidence.
Implementers do not push feature branches, create GitHub pull requests, or
integrate their own work. After local technical checks and required human UI
approval, lead-sde locally squash-merges the reviewed feature into synchronized
`main`. Lead-sde pushes `main` directly without force and without weakening
branch protection, then verifies CI for the exact pushed SHA.

## Rollback

The migration is incremental and reversible. Revert the affected local feature
commit before integration, or revert the local squash-integrated commit on
`main`, to restore the preceding package exports, CSS imports, and app-local
markup. If a shared primitive causes a regression, applications may
stay on their existing local implementation while the primitive is repaired;
they do not need to be rewritten as a group. Remove newly unused dependencies
only in the corresponding rollback change after lockfile validation. No database
migration, persisted data, provider configuration, or production deployment is
part of this decision.

## Consequences

This creates a single auditable shared UI source while retaining explicit app
boundaries. It authorizes justified Tailwind, shadcn-generated-source, and
Lucide runtime dependencies, but rejects speculative component catalog
installation and blind Weather combobox rewrites. It also requires source-path
registration and compatibility verification whenever shared styling changes.

## References

- [shadcn/ui monorepo documentation](https://ui.shadcn.com/docs/monorepo)
- [shadcn/ui Tailwind CSS v4 documentation](https://ui.shadcn.com/docs/tailwind-v4)
- [Tailwind CSS source detection documentation](https://tailwindcss.com/docs/detecting-classes-in-source-files)
