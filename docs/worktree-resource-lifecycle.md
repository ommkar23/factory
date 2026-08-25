# Clean up worktree resources reliably

Every development worktree must own and remove the resources it creates. Cleanup is complete only when no worktree-specific container, process, network, volume, generated file, or worktree path remains.

## Required guarantees

A worktree workflow must satisfy these guarantees:

- Assign every resource to one stable worktree ID
- Never create files in the worktree that the host user cannot delete
- Remove only resources owned by that worktree
- Preserve plans and other user-owned artifacts before cleanup
- Make cleanup idempotent so interrupted cleanup can run again
- Verify cleanup before removing Git worktree metadata

## Assign resource ownership

Derive a stable ID from the canonical worktree path or branch. Apply the ID to:

- The Docker Compose project name
- Docker container, network, and volume labels
- Named volumes
- Port allocations
- Background process IDs
- Test output directories
- Runtime manifests

Do not use fixed Compose project names or fixed `container_name` values for worktree services. They prevent parallel worktrees and make ownership ambiguous.

Record created resources in an ignored ledger such as `.hermes/runtime/<worktree-id>.json`. Cleanup must use both this ledger and Docker labels. Either source can recover from an interrupted run.

## Keep mutable container data outside the worktree

Store database and service state in worktree-labeled Docker named volumes. Do not bind-mount database data directories into the Git worktree.

If a writable bind mount is required, run the container with the host user ID and group ID. Teardown must confirm that the worktree contains no files owned by another user.

Treat package-manager, browser, and Docker image caches as shared resources. Worktree cleanup must not remove them unless the ledger identifies them as exclusively owned. A separate garbage collector can enforce cache retention policy.

## Provide one lifecycle command

Repository automation should expose one idempotent lifecycle wrapper, for example:

```bash
./scripts/worktree-dev up
./scripts/worktree-dev status
./scripts/worktree-dev clean
```

The wrapper must calculate the worktree ID, configure Compose, allocate ports, update the resource ledger, and register background processes. Agents must use this wrapper instead of calling Compose directly.

## Clean resources in order

Run cleanup in this order:

1. Stop recorded background processes
2. Stop and remove worktree-labeled containers
3. Remove worktree-labeled networks
4. Remove worktree-owned named volumes
5. Remove generated build and test output
6. Confirm that no foreign-owned file remains in the worktree
7. Move plans and user-owned artifacts to their canonical destination
8. Remove the Git worktree
9. Remove the feature branch when requested
10. Delete the resource ledger

Do not deregister or delete the Git worktree before container resources and generated files are clean.

## Verify cleanup

The cleanup command must fail unless all checks pass:

```bash
docker ps -a --filter "label=com.factory.worktree=<worktree-id>"
docker network ls --filter "label=com.factory.worktree=<worktree-id>"
docker volume ls --filter "label=com.factory.worktree=<worktree-id>"
git worktree list
```

It must also verify:

- Recorded ports have no worktree-owned listener
- Recorded process IDs are not running
- No foreign-owned file exists below the worktree path
- The worktree path is absent
- Preserved plans and artifacts exist at their destination

A task is not complete while any verification returns a worktree-owned resource.

## Recover after interruption

The lifecycle wrapper should register a shell trap that runs cleanup on normal interruption. Because a process can terminate without running its trap, an idempotent garbage collector must also inspect stale ledgers and Docker labels.

The garbage collector may remove a resource only when its worktree no longer exists and no active lifecycle lease references it. It must produce a report of every removed or retained resource.

## Apply this policy to Factory

Factory should make these changes first:

1. Replace the `supabase/volumes/db/data` bind mount with a worktree-labeled named volume
2. Replace the fixed `factory-dev` Compose project name with a worktree-derived name
3. Remove or parameterize fixed Supabase container names and host ports
4. Route setup, deployment, testing, and teardown through the lifecycle wrapper
5. Add a Linux integration test that starts a worktree stack, interrupts it, runs cleanup, and proves that no labeled resource or undeletable file remains

These changes remove the root-owned bind-mount failure mode and make resource cleanup deterministic without privileged filesystem deletion.
