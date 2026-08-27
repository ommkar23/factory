import unittest
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch
import sys

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))
from deploy import auth
from deploy.config import ensure_environment, read_env
from deploy.identity import DeploymentIdentity

ROOT = Path(__file__).resolve().parents[2]


class DeployAuthTests(unittest.TestCase):
    def test_find_user_pages_until_match(self):
        responses = [{"users": [{"email": "other"}] * 1000}, {"users": [{"id": "expected", "email": "dev@example.test"}]}]
        with patch.object(auth, "api_request", side_effect=responses):
            self.assertEqual(auth.find_user("http://auth/admin/users", {}, "dev@example.test")["id"], "expected")

    def test_provision_updates_existing_user(self):
        existing = {"id": "expected", "email": "dev@example.test"}
        with patch.object(auth, "find_user", return_value=existing), patch.object(auth, "api_request", return_value={"user": existing}) as request:
            self.assertEqual(auth.provision("http://auth", "key", existing["email"], "password"), "expected")
        self.assertEqual(request.call_args.kwargs["method"], "PUT")

    def test_each_app_has_distinct_credentials_and_database_project(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "supabase").mkdir()
            shutil.copy(ROOT / "supabase/.env.example", root / "supabase/.env.example")
            home = DeploymentIdentity.create(root, "home")
            weather = DeploymentIdentity.create(root, "weather")
            home_env, home_api = ensure_environment(home, "http://home.localhost")
            weather_env, weather_api = ensure_environment(weather, "http://weather.localhost")
            self.assertNotEqual(read_env(home_api)["DEV_AUTH_EMAIL"], read_env(weather_api)["DEV_AUTH_EMAIL"])
            self.assertNotEqual(home.project, weather.project)
            self.assertNotEqual(home_env["POSTGRES_PASSWORD"], weather_env["POSTGRES_PASSWORD"])


if __name__ == "__main__": unittest.main()
