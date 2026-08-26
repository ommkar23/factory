# Manage Tailscale Serve through the worktree lifecycle

1. To-do: Add opt-in Tailscale Serve setup to `scripts/worktree-dev` that allocates collision-free stable HTTPS ports for the Factory app and Storybook, proxies their worktree-specific loopback ports, and records ownership and URLs in the runtime ledger without replacing foreign routes.
   To-verify: Add lifecycle tests proving separate worktrees receive distinct stable endpoints and existing unowned Tailscale Serve configuration is preserved.
2. To-do: Extend worktree status, interrupted-start recovery, and cleanup to report and remove only the Tailscale Serve endpoints owned by that worktree.
   To-verify: Add tests proving normal cleanup, repeated cleanup, and failed startup remove owned routes while leaving other worktrees and foreign routes intact.
3. To-do: Update development documentation to distinguish VM-local Portless aliases from tailnet-accessible Tailscale Serve URLs and document opt-in setup, multi-worktree behavior, prerequisites, and cleanup.
   To-verify: Confirm the documented commands match the lifecycle interface and no active guidance requires manually assigning or removing Tailscale Serve ports.
4. To-do: Run repository verification and exercise two isolated lifecycle configurations against mocked Tailscale state.
   To-verify: Run the relevant lifecycle tests and `pnpm check`, confirming no credentials, tailnet identifiers, or machine-specific routes are committed.
