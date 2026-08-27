import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import sys

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))

from deploy.identity import DeploymentIdentity
from deploy.process import Command, Runner
from deploy.state import DeploymentState, runtime_dir

ROOT = Path(__file__).resolve().parents[2]


class DeployFoundationTests(unittest.TestCase):
    def test_identity_is_stable_and_app_scoped(self):
        first = DeploymentIdentity.create(ROOT, "home")
        self.assertEqual(first, DeploymentIdentity.create(ROOT, "home"))
        self.assertNotEqual(first.project, DeploymentIdentity.create(ROOT, "weather").project)

    def test_state_round_trip_is_private(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "state.json"
            state = DeploymentState("home", "abc", "project", "alias", url="http://example")
            state.save(path)
            self.assertEqual(DeploymentState.load(path), state)
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_runner_executes_structured_command(self):
        completed = subprocess.CompletedProcess(("tool",), 0, "ok", "")
        with patch("deploy.process.subprocess.run", return_value=completed) as run:
            result = Runner().run(Command(("tool", "arg"), ROOT), capture=True)
        self.assertEqual(result.stdout, "ok")
        self.assertEqual(run.call_args.args[0], ("tool", "arg"))

    def test_runtime_state_and_secrets_are_ignored(self):
        target = runtime_dir(ROOT) / "test-secret.json"
        result = subprocess.run(("git", "check-ignore", "-q", str(target)), cwd=ROOT)
        self.assertEqual(result.returncode, 0)


if __name__ == "__main__":
    unittest.main()
