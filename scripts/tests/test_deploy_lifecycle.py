import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import sys

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))

from deploy.identity import APPS
from deploy.lifecycle import AppLifecycle
from deploy.process import Runner

ROOT = Path(__file__).resolve().parents[2]


class FakeRunner(Runner):
    def __init__(self): self.commands = []
    def run(self, command, **kwargs):
        from subprocess import CompletedProcess
        self.commands.append(command.args)
        output = "127.0.0.1:32100\n" if "port" in command.args else ("container\n" if "--quiet" in command.args else "")
        return CompletedProcess(command.args, 0, output, "")


class DeployLifecycleTests(unittest.TestCase):
    def test_apps_have_non_overlapping_projects(self):
        projects = {AppLifecycle(ROOT, app).identity.project for app in APPS}
        self.assertEqual(len(projects), len(APPS))

    def test_repeated_up_uses_same_project_without_down(self):
        runner = FakeRunner()
        lifecycle = AppLifecycle(ROOT, "home", runner)
        with patch.object(lifecycle, "require_commands"), patch.object(lifecycle, "wait_ready"), patch.object(lifecycle, "provision_auth"), patch("deploy.lifecycle.Routes.register", side_effect=lambda state, tailscale: state), patch.object(lifecycle, "environment", return_value={}):
            lifecycle.up(); lifecycle.up()
        flattened = [part for command in runner.commands for part in command]
        self.assertNotIn("down", flattened)
        self.assertEqual(sum("up" in command for command in runner.commands), 2)
        lifecycle.state_path.parent.exists() and __import__("shutil").rmtree(lifecycle.state_path.parent)

    def test_targeted_down_is_app_scoped(self):
        runner = FakeRunner()
        lifecycle = AppLifecycle(ROOT, "weather", runner)
        with patch.object(lifecycle, "environment", return_value={}): lifecycle.down()
        command = runner.commands[0]
        self.assertIn(lifecycle.identity.project, command)
        self.assertIn("--volumes", command)


if __name__ == "__main__": unittest.main()
