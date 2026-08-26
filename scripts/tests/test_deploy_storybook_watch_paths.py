from pathlib import Path
import unittest


class DeployStorybookWatchPathsTest(unittest.TestCase):
    def test_watches_only_storybook_sources(self):
        workflow = Path(".github/workflows/deploy-storybook.yml").read_text()
        for stale_path in (
            "apps/live-splash/app/page.jsx",
            "apps/weather/components/**",
            "apps/weather/fixtures/**",
            "apps/weather/hooks/**",
            "apps/weather/lib/**",
        ):
            self.assertNotIn(stale_path, workflow)


if __name__ == "__main__":
    unittest.main()
