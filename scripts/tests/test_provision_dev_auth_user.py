import importlib.util
import os
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).parents[1] / "provision-dev-auth-user.py"
SPEC = importlib.util.spec_from_file_location("provision_dev_auth_user", SCRIPT)
assert SPEC and SPEC.loader
provision = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(provision)


class ProvisionDevAuthUserTests(unittest.TestCase):
    def test_required_rejects_missing_values(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "MISSING"):
                provision.required("MISSING")

    def test_find_user_stops_when_matching_email_is_found(self):
        responses = [
            {"users": [{"id": "other", "email": "other@example.test"}] * 1000},
            {"users": [{"id": "expected", "email": "dev@example.test"}]},
        ]

        with patch.object(provision, "api_request", side_effect=responses) as request:
            user = provision.find_user(
                "http://auth/admin/users",
                {"Authorization": "Bearer test"},
                "dev@example.test",
            )

        self.assertEqual(user["id"], "expected")
        self.assertEqual(request.call_count, 2)
        self.assertIn("page=2", request.call_args.args[0])

    def test_main_updates_an_existing_user(self):
        environment = {
            "SUPABASE_AUTH_URL": "http://auth/",
            "SUPABASE_SERVICE_ROLE_KEY": "service-role",
            "DEV_AUTH_EMAIL": "dev@example.test",
            "DEV_AUTH_PASSWORD": "password",
        }
        existing_user = {"id": "expected", "email": environment["DEV_AUTH_EMAIL"]}

        with (
            patch.dict(os.environ, environment, clear=True),
            patch.object(provision, "find_user", return_value=existing_user),
            patch.object(
                provision,
                "api_request",
                return_value={"user": existing_user},
            ) as request,
            patch("builtins.print") as output,
        ):
            provision.main()

        self.assertEqual(request.call_args.kwargs["method"], "PUT")
        self.assertEqual(request.call_args.kwargs["payload"]["password"], "password")
        output.assert_called_once_with("Local Supabase development user ready: expected")


if __name__ == "__main__":
    unittest.main()
