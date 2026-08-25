# Script and worktree hardening

1. To-do: Introduce centralized Factory app metadata and make client-boundary discovery operate only on tracked repository files.
   To-verify: Run boundary fixtures proving generated local environment files are excluded and registered apps/packages remain covered.
2. To-do: Isolate formatting tests and add unit coverage for the Python development-auth provisioner with Python 3.12 compatibility explicit.
   To-verify: Run the Node and Python script test suites without relying on unrelated repository formatting or live Supabase.
3. To-do: Replace fixed Compose identity, host ports, container names, and writable data bind storage with worktree-scoped resources and random loopback ports.
   To-verify: Validate the Compose model and prove two project names produce disjoint containers, networks, volumes, and host bindings.
4. To-do: Add a Portless-backed worktree lifecycle wrapper that owns setup, aliases, status, teardown, and an ignored resource ledger.
   To-verify: Exercise lifecycle failure cleanup and verify aliases and Docker resources are absent after idempotent cleanup.
5. To-do: Update local-development documentation and route the legacy setup entry point through the lifecycle wrapper.
   To-verify: Confirm documented stable worktree URLs and commands match wrapper output and repository checks pass.
