# TypeScript-to-JavaScript Migration Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Convert all 111 tracked TypeScript-family source, test, story, configuration, declaration, and Supabase edge-function files to JavaScript while preserving existing runtime behavior and coverage.

**Architecture:** Preserve ESM, Next App Router, Vitest, Storybook, Turbo, and Supabase/Deno. Rename `.ts` to `.js` and `.tsx` to `.jsx`; leave existing `.mjs` files as JavaScript; remove compile-time TypeScript syntax/configuration/dependencies rather than replacing it with JSDoc or another type system.

**Tech Stack:** pnpm 11, Node 24, Turbo 2, Next 16, React 19, Vitest 3, Storybook 10, Supabase CLI/Deno 2.

**Current context / boundary:** `main` is seven commits ahead of `origin/main` and has unrelated generated modifications to three `next-env.d.ts` files. Start in a clean worktree. Scope is every tracked `*.ts`, `*.tsx`, `*.d.ts`, and `*.d.mts` file (67 in `apps/`, 42 in `packages/`, 2 in `supabase/`), not TypeScript internal to third-party dependencies.

---

## Step 1: Create an isolated migration branch

**What:** From a clean worktree at the intended `main` commit, create `refactor/migrate-typescript-to-javascript` so unrelated local changes are excluded.

**Verification:** `git branch --show-current` is `refactor/migrate-typescript-to-javascript`, `git status --short` is clean before edits, and `git log --oneline --decorate -1` records the base.

**Commit:** No commit is required for branch creation.

## Step 2: Capture the conversion contract and inventory

**What:** Inventory all 111 tracked TypeScript-family files and apply consistent mechanical rules: remove type-only imports/exports, declarations, annotations, generics, assertions, `satisfies`, `readonly`, and `override`; retain runtime imports, exports, and behavior; update every extension-specific reference.

**Files:** Inspect every result of `git ls-files -- '*.ts' '*.tsx' '*.d.ts' '*.d.mts'`; track source, tests, Storybook, package exports/imports, Vitest globs, Next generated files, package scripts, Turbo, lockfile, and Supabase entrypoints.

**Verification:** The inventory is 111 files before edits and every renamed file has an identified consumer/configuration reference to update in the same commit.

**Commit:** No commit; this is the guardrail for the reviewable migration slices.

## Step 3: Migrate Contracts and Auth

**What:** Convert `packages/contracts/src/index.ts` and all Auth source/test/story files to JS/JSX, remove Auth compile-time types while preserving runtime exports/auth behavior, update exports/scripts, and delete their TypeScript configurations.

**Files:**
- Rename `packages/contracts/src/index.ts` → `index.js`.
- Rename `packages/auth/src/*.ts` → `*.js`, `*.tsx` → `*.jsx`, `packages/auth/tests/*.test.ts` → `*.test.js`, and `*.test.tsx` → `*.test.jsx`.
- Modify `packages/contracts/package.json` and `packages/auth/package.json` to use new export paths and remove `tsc` scripts/direct `typescript` and `@types/*` devDependencies.
- Delete `packages/contracts/tsconfig.json` and `packages/auth/tsconfig.json`.

**Verification:** `pnpm --filter @factory/auth lint && pnpm --filter @factory/auth test` passes, Auth consumers resolve all runtime exports, and `git ls-files packages/auth packages/contracts -- '*.ts' '*.tsx' '*.d.ts' '*.d.mts'` is empty.

**Commit:** `refactor(auth): migrate workspace packages to javascript`

## Step 4: Migrate shared UI and Storybook discovery

**What:** Convert UI components, tests, stories, Vitest and Storybook config to JS/JSX; replace the `StatusMessageProps` compile-time contract with a runtime public-API assertion; remove declaration-only artifacts; and update export/import maps, story globs, artifact target paths, and test include globs without changing component behavior or story IDs.

**Files:**
- Rename `packages/ui/src/**/*.ts` → `*.js`, `**/*.tsx` → `*.jsx`, `packages/ui/tests/**/*.ts` → `*.js`, `**/*.tsx` → `*.jsx`, `.storybook/*.ts` → `.mjs`/`.js`, and `vitest.config.ts` → `vitest.config.mjs`.
- Modify `packages/ui/package.json`, `packages/ui/scripts/package-pages-artifact.mjs`, and `packages/ui/tests/public-api.test.js` (after rename) to use `.js`/`.jsx` source paths and runtime assertions instead of `StatusMessageProps`.
- Modify `packages/ui/components.json` to set `tsx` to `false` so generated components stay JavaScript.
- Delete `packages/ui/tsconfig.json` and `packages/ui/scripts/package-pages-artifact.d.mts`.
- Do not commit ignored generated `packages/ui/storybook-static/`.

**Verification:** `pnpm --filter @factory/ui test`, `pnpm --filter @factory/ui build`, and `pnpm --filter @factory/ui package:pages -- --output /tmp/factory-storybook-pages --input packages/ui/storybook-static` pass; Storybook resolves canonical Home, Live Splash, and Weather stories at `.jsx` paths.

**Commit:** `refactor(ui): migrate shared ui package to javascript`

## Step 5: Migrate Home

**What:** Convert every Home App Router route, component, library, proxy, test, story, and Vitest config to JS/JSX; remove TypeScript-only annotations, update test discovery/package metadata, and remove obsolete TS files.

**Files:**
- Rename `apps/home/app/**/*.{ts,tsx}`, `components/*.tsx`, `lib/*.ts`, `proxy.ts`, `stories/*.tsx`, `tests/*.{ts,tsx}`, and `vitest.config.ts` to matching `.js`, `.jsx`, or `.mjs` extensions.
- Modify `apps/home/package.json` to remove `typecheck`, direct TypeScript/@types deps, and old file references; update `apps/home/tests/auth-routes.test.mjs` string fixtures from `.ts` to `.js`.
- Delete `apps/home/tsconfig.json` and `apps/home/next-env.d.ts`.

**Verification:** `pnpm --filter @factory/home test` and `pnpm --filter @factory/home build` pass, including app-directory, health, login, auth-route, Docker-routing, and Next-config coverage; a clean build does not recreate tracked TS files.

**Commit:** `refactor(home): migrate application to javascript`

## Step 6: Migrate Live Splash

**What:** Convert every Live Splash route, proxy, story, and test to JS/JSX; replace explicit Vitest TS paths, remove direct TypeScript dependencies, and delete obsolete TS config/declarations.

**Files:**
- Rename `apps/live-splash/app/**/*.{ts,tsx}`, `proxy.ts`, `stories/*.tsx`, and `tests/*.{ts,tsx}` to matching `.js`/`.jsx` files.
- Modify `apps/live-splash/package.json` to remove `typecheck`, direct TypeScript/@types deps, and explicit `.ts`/`.tsx` test names; update `tests/auth-routes.test.mjs` and `tests/baseline.test.mjs` string fixtures.
- Modify `apps/live-splash/components.json` to set `tsx` to `false`.
- Delete `apps/live-splash/tsconfig.json` and `apps/live-splash/next-env.d.ts`.

**Verification:** `pnpm --filter @factory/live-splash test` and `pnpm --filter @factory/live-splash build` pass, covering shared-origin, health, login, UI-public-contract, auth-route, baseline, and Next-config behavior.

**Commit:** `refactor(live-splash): migrate application to javascript`

## Step 7: Migrate Weather

**What:** Convert Weather domain/provider/API code, fixtures, hooks, components, App Router routes, proxy, stories, tests, and Vitest config to JS/JSX while preserving validated weather parsing, errors, comparison, and UI behavior.

**Files:**
- Rename `apps/weather/app/**/*.{ts,tsx}`, `components/*.{ts,tsx}`, `fixtures/*.ts`, `hooks/*.ts`, `lib/**/*.ts`, `proxy.ts`, `stories/*.tsx`, `tests/*.{ts,tsx}`, and `vitest.config.ts` to matching JavaScript extensions.
- Modify `apps/weather/package.json` to remove `typecheck`, direct TypeScript/@types deps, and old file references; update extension-sensitive source-text tests `tests/auth-routes.test.mjs`, `tests/scaffold.test.mjs`, and `tests/weather-ui.test.mjs`.
- Modify `apps/weather/components.json` to set `tsx` to `false`.
- Delete `apps/weather/tsconfig.json` and `apps/weather/next-env.d.ts`.

**Verification:** `pnpm --filter @factory/weather test` and `pnpm --filter @factory/weather build` pass, proving provider validation, APIs/client, comparison hook/screens, location search, condition display, health/login/shared-origin/auth/Next-config routes, and Storybook-consumed UI remain unchanged.

**Commit:** `refactor(weather): migrate application to javascript`

## Step 8: Migrate Supabase edge functions through the custom dispatcher

**What:** In an isolated Compose staging worktree, convert both Deno functions to `.js` and remove only TypeScript syntax, but first explicitly prove/configure JavaScript entrypoint resolution for the custom `EdgeRuntime.userWorkers.create` dispatcher so the gateway, Hello worker, and JWT-routing main worker retain their behavior.

**Files:**
- Rename `supabase/volumes/functions/main/index.ts` → `index.js` and `supabase/volumes/functions/hello/index.ts` → `index.js`.
- Modify `supabase/volumes/functions/main/index.js` to remove annotations and `as jose.JSONWebKeySet` while preserving HS256/ES256/RS256 JWT checks, CORS handling, worker limits, import-map use, and gateway errors.
- Modify `supabase/volumes/functions/hello/index.js` to remove the declaration-only Edge Runtime import while retaining the `withSupabase` handler.
- Inspect and modify `supabase/docker-compose.yml` and/or the custom dispatcher only if the pinned `supabase/edge-runtime:v1.74.0` does not discover `index.js` from `servicePath`; do not rely on CLI-only `[functions.<name>].entrypoint` configuration.
- Keep `supabase/volumes/functions/deno.jsonc` unchanged; function-local import-map refactoring is a separate change.

**Verification:** Before switching stacks, use `docker compose ps` and `docker inspect` to prove the staging services mount the target worktree. Against the pinned Compose runtime, prove main startup and `/functions/v1/hello` behavior for unauthenticated, publishable-key, and secret-key requests; then prove main-worker gateway handling for OPTIONS, missing/malformed authorization, valid HS256 and ES256/RS256 JWTs, unknown functions, and worker exceptions. Do not claim `supabase functions serve` verification unless the CLI is installed and is actually the deployment path.

**Commit:** `refactor(supabase): migrate edge functions to javascript`

## Step 9: Remove shared TypeScript infrastructure

**What:** Once no workspace source needs TypeScript, delete `packages/typescript-config`, remove all direct `typescript` and `@types/node`/`@types/react`/`@types/react-dom` devDependencies, remove `typecheck` from root/package scripts and Turbo dependencies, refresh the lockfile, and make root `check` run formatting, lint, tests, and builds only.

**Files:**
- Modify `package.json`, `turbo.json`, and `pnpm-lock.yaml`.
- Delete the full `packages/typescript-config/` package.
- Confirm all application/workspace package manifests have neither TypeScript-only scripts nor direct TypeScript/@types devDependencies.

**Verification:** `pnpm install --lockfile-only`, then `pnpm install --frozen-lockfile`, succeeds; `pnpm check` passes without invoking `tsc`; and `git ls-files -- '*.ts' '*.tsx' '*.d.ts' '*.d.mts'` produces no output.

**Commit:** `chore(tooling): remove typescript infrastructure`

## Step 10: Run complete regression and boundary validation

**What:** Validate the JavaScript-only branch from a clean install, inspect extension-sensitive exports/artifacts, and prove no TypeScript configuration or unrelated work remains tracked.

**Verification:** In a clean worktree run `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm check`, and `git diff --check`; verify `git ls-files -- '*.ts' '*.tsx' '*.d.ts' '*.d.mts'` is empty; inspect tracked manifests/configuration for active `typecheck`, `tsconfig`, and direct `typescript` references; and verify `git status --short` contains only intended migration files.

**Commit:** `test(migration): verify javascript-only workspace` only if this step adds durable regression coverage; otherwise no additional commit.

---

## Risks and mitigations

- Type-only exports may unexpectedly be used at runtime; focused Auth/UI public-API/app tests run in each slice.
- Export/import maps, Storybook globs, explicit Vitest paths, source-text test fixtures, shadcn `tsx` settings, and the Storybook packaging script encode extensions; update them in the same commit as renames.
- A clean JavaScript Next build must not regenerate `next-env.d.ts`; if it does, find the remaining TS config/dependency first.
- Deno supports JavaScript, but this repository's custom Compose dispatcher—not `supabase functions serve`—is the authoritative renamed-entrypoint test.
