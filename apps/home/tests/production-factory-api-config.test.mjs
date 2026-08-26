import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const productionApiOrigin = "https://factory.markagen.ai";

async function readRepositoryFile(file) {
  return readFile(path.join(repoRoot, file), "utf8");
}

test("the unified production image receives the reachable server-only Factory API origin", async () => {
  const apps = ["home", "live-splash", "weather"];
  const [deployment, dockerfile] = await Promise.all([
    readRepositoryFile(".github/workflows/deploy-home-cloud-run.yml"),
    readRepositoryFile("Dockerfile"),
  ]);

  assert.ok(deployment.includes(productionApiOrigin));
  assert.match(dockerfile, /ARG FACTORY_API_URL/);
  assert.match(dockerfile, /ENV FACTORY_API_URL=\$FACTORY_API_URL/);
  assert.match(
    deployment,
    /--build-arg "FACTORY_API_URL=\$FACTORY_API_URL"/,
    "the production image must configure Next rewrites with the API origin",
  );
  assert.match(
    deployment,
    /FACTORY_API_URL=\$\{\{ env\.FACTORY_API_URL \}\}/,
    "the unified runtime must receive FACTORY_API_URL",
  );

  for (const app of apps) {
    assert.match(deployment, new RegExp(`- "apps/${app}/\\*\\*"`));
  }
  assert.match(deployment, /workflow_dispatch:/);
  assert.match(deployment, /runs-on: ubuntu-latest/);
  assert.match(deployment, /service: factory-home/);
  assert.doesNotMatch(deployment, /factory-(weather|live-splash)/);
  assert.doesNotMatch(deployment, /NEXT_PUBLIC_FACTORY_API_URL/);
  assert.doesNotMatch(dockerfile, /NEXT_PUBLIC_FACTORY_API_URL/);
});

test("API and Storybook deployments use relevant paths and remain manual", async () => {
  const [apiWorkflow, storybookWorkflow] = await Promise.all([
    readRepositoryFile(".github/workflows/deploy-api-cloud-run.yml"),
    readRepositoryFile(".github/workflows/deploy-storybook.yml"),
  ]);

  assert.match(apiWorkflow, /- "services\/api\/src\/\*\*"/);
  assert.doesNotMatch(apiWorkflow, /services\/api\/tests/);
  assert.doesNotMatch(apiWorkflow, /infra\/gcp/);
  assert.match(apiWorkflow, /workflow_dispatch:/);

  assert.match(storybookWorkflow, /branches: \[main\]/);
  assert.match(storybookWorkflow, /- "packages\/ui\/src\/\*\*"/);
  assert.match(storybookWorkflow, /- "apps\/home\/stories\/\*\*"/);
  assert.match(storybookWorkflow, /workflow_dispatch:/);
});
