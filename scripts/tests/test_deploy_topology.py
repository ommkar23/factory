import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


class DeployTopologyTests(unittest.TestCase):
    def test_topology_is_app_selectable_and_fully_scoped_by_compose(self):
        compose = (ROOT / "scripts/deploy/compose.yml").read_text()
        self.assertIn("../../supabase/docker-compose.yml", compose)
        self.assertIn("target: ${DEPLOY_WEB_TARGET", compose)
        self.assertIn("api-sessions:/data/factory-api", compose)
        self.assertIn('FACTORY_DEV_AUTH_BOOTSTRAP: "true"', compose)
        self.assertEqual(compose.count("FACTORY_SHARED_ORIGIN: ${DEPLOY_SHARED_ORIGIN"), 2)
        self.assertNotRegex(compose, re.compile(r"^name:", re.MULTILINE))
        self.assertNotIn("container_name:", compose)

    def test_home_uses_shared_origin_while_child_deployments_stay_rooted(self):
        config = (ROOT / "scripts/deploy/config.py").read_text()
        self.assertIn('"DEPLOY_SHARED_ORIGIN": "true" if identity.app == "home" else "false"', config)
        self.assertIn('"DEPLOY_WEB_TARGET": "runner" if identity.app == "home" else f"{identity.app}-local"', config)

    def test_home_and_child_targets_have_expected_process_models(self):
        dockerfile = (ROOT / "Dockerfile").read_text()
        self.assertIn("FROM standalone-base AS runner", dockerfile)
        self.assertIn('CMD ["node", "/app/scripts/unified-web.mjs"]', dockerfile)
        self.assertIn("FROM standalone-base AS weather-local", dockerfile)
        self.assertIn('CMD ["node", "/app/apps/weather/server.js"]', dockerfile)
        self.assertIn("FROM standalone-base AS live-splash-local", dockerfile)
        self.assertIn('CMD ["node", "/app/apps/live-splash/server.js"]', dockerfile)

    def test_production_workflow_still_builds_default_runner(self):
        workflow = (ROOT / ".github/workflows/deploy-home-cloud-run.yml").read_text()
        self.assertNotIn("weather-local", workflow)
        self.assertNotIn("live-splash-local", workflow)


if __name__ == "__main__":
    unittest.main()
