# Isolated app deployments

**Worktree Name:** `isolated-app-deployments`

1. **To-Do:** Create the `scripts/deploy/` Python package with shared process, state, Docker, Portless, and identity primitives using dataclasses, and keep all generated deployment state under a worktree-local ignored runtime directory.
   **To-Verify:** Run unit tests for worktree identity, state serialization, command execution, and `git check-ignore` to prove generated ledgers and secrets cannot be tracked.
   **Commit:** `refactor(deploy): add shared deployment foundation`

2. **To-Do:** Add an app-selectable Compose topology where each Home, Weather, or Live Splash deployment owns separate web, API, Supabase, network, volume, secret, and database resources, while Home uses the existing unified three-process web image.
   **To-Verify:** Render and start each app topology to prove resource names do not overlap, child-app images run one Next.js process, and Home runs the unified runtime without changing production deployment configuration.
   **Commit:** `feat(deploy): add isolated app stack topology`

3. **To-Do:** Implement `deploy.app up <app>`, `deploy.app down <app>`, `deploy.app status`, and `deploy.app down --all` with one idempotent active deployment per app per worktree and support concurrent deployments of different apps.
   **To-Verify:** Exercise repeated up, targeted down, status, concurrent Home and Live Splash stacks, and down-all to prove idempotency and complete app-scoped cleanup.
   **Commit:** `feat(deploy): add app lifecycle cli`

4. **To-Do:** Move development auth provisioning into `scripts/deploy/auth.py` and provision a separate user in each app deployment after its isolated API and Supabase services become ready.
   **To-Verify:** Deploy two apps concurrently and authenticate against each database to prove users and sessions are independently provisioned and no deployment shares auth state.
   **Commit:** `refactor(deploy): integrate isolated dev auth provisioning`

5. **To-Do:** Add app-scoped Portless aliases and optional collision-safe Tailscale Serve routes whose ownership is persisted before mutation and removed only when the current route still matches the deployment.
   **To-Verify:** Deploy multiple apps with local and tailnet access, verify distinct URLs and exact route ownership, then repeat targeted and all cleanup while preserving foreign routes.
   **Commit:** `feat(deploy): add app routing and tailnet access`

6. **To-Do:** Migrate deployment callers, tests, and documentation to `scripts/deploy/`, remove superseded lifecycle and auth scripts, and document that production continues to deploy only the unified Home image.
   **To-Verify:** Run focused integration tests and `pnpm check`, then confirm no stale script references, generated resources, aliases, routes, containers, volumes, or unignored secrets remain.
   **Commit:** `chore(deploy): complete isolated deployment migration`
