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

test("production client images receive the reachable server-only Factory API origin", async () => {
  const apps = ["home", "live-splash", "weather"];
  const [deployment, dockerfile, ...workflows] = await Promise.all([
    readRepositoryFile(".github/workflows/deploy-app-cloud-run.yml"),
    readRepositoryFile("Dockerfile"),
    ...apps.map((app) =>
      readRepositoryFile(`.github/workflows/deploy-${app}-cloud-run.yml`),
    ),
  ]);

  assert.ok(deployment.includes(productionApiOrigin));
  assert.match(dockerfile, /ARG FACTORY_API_URL/);
  assert.match(dockerfile, /ENV FACTORY_API_URL=\$FACTORY_API_URL/);
  assert.match(
    deployment,
    /--build-arg "FACTORY_API_URL=\$FACTORY_API_URL"/,
    "production image builds must configure Next rewrites with the API origin",
  );
  assert.match(
    deployment,
    /FACTORY_API_URL=\$\{\{ env\.FACTORY_API_URL \}\}/,
    "applications must receive FACTORY_API_URL at runtime",
  );

  for (const [index, app] of apps.entries()) {
    const workflow = workflows[index];
    assert.match(workflow, new RegExp(`- "apps/${app}/app/\\*\\*"`));
    assert.doesNotMatch(workflow, new RegExp(`apps/${app}/(?:tests|stories)/`));
    assert.doesNotMatch(workflow, new RegExp(`apps/${app}/\\*\\*`));
    assert.match(workflow, /workflow_dispatch:/);
    assert.match(
      workflow,
      /uses: \.\/\.github\/workflows\/deploy-app-cloud-run\.yml/,
    );
    assert.match(workflow, new RegExp(`app: ${app}`));
    assert.match(workflow, new RegExp(`service: factory-${app}`));

    for (const otherApp of apps.filter((candidate) => candidate !== app)) {
      assert.doesNotMatch(workflow, new RegExp(`apps/${otherApp}/`));
    }
  }

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
  assert.match(storybookWorkflow, /- "apps\/weather\/stories\/\*\*"/);
  assert.match(storybookWorkflow, /workflow_dispatch:/);
});
