#!/usr/bin/env bash
# Compatibility entry point; use scripts/worktree-dev directly for lifecycle control.
set -Eeuo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
exec "$root/scripts/worktree-dev" up
