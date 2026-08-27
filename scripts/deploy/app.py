#!/usr/bin/env python3
"""CLI for isolated Factory app deployments."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import subprocess
import sys

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from deploy.identity import APPS
    from deploy.lifecycle import AppLifecycle, DeploymentError, all_lifecycles
else:
    from .identity import APPS
    from .lifecycle import AppLifecycle, DeploymentError, all_lifecycles

ROOT = Path(__file__).resolve().parents[2]


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(prog="deploy.app")
    subcommands = result.add_subparsers(dest="command", required=True)
    up = subcommands.add_parser("up")
    up.add_argument("app", choices=APPS)
    up.add_argument("--tailscale", action="store_true")
    down = subcommands.add_parser("down")
    down_group = down.add_mutually_exclusive_group(required=True)
    down_group.add_argument("app", nargs="?", choices=APPS)
    down_group.add_argument("--all", action="store_true")
    subcommands.add_parser("status")
    return result


def main(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    try:
        if args.command == "up":
            state = AppLifecycle(ROOT, args.app, tailscale=args.tailscale).up()
            print(f"{state.app}: {state.url}")
            if state.tailscale_url:
                print(f"Tailnet {state.app}: {state.tailscale_url}")
        elif args.command == "down":
            targets = all_lifecycles(ROOT) if args.all else [AppLifecycle(ROOT, args.app)]
            for lifecycle in targets:
                lifecycle.down()
        else:
            for lifecycle in all_lifecycles(ROOT):
                lifecycle.status()
    except (DeploymentError, subprocess.CalledProcessError, json.JSONDecodeError, OSError) as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
