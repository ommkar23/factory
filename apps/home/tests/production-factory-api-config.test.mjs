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
  const [workflow, dockerfile, bootstrap] = await Promise.all([
    readRepositoryFile(".github/workflows/deploy-cloud-run.yml"),
    readRepositoryFile("Dockerfile"),
    readRepositoryFile("cloudbuild.bootstrap.yaml"),
  ]);

  assert.ok(workflow.includes(productionApiOrigin));
  assert.match(dockerfile, /ARG FACTORY_API_URL/);
  assert.match(dockerfile, /ENV FACTORY_API_URL=\$FACTORY_API_URL/);
  assert.match(
    workflow,
    /for app in home weather live-splash; do[\s\S]*?--build-arg "FACTORY_API_URL=\$FACTORY_API_URL"/,
    "production image builds must configure Next rewrites with the API origin",
  );

  for (const app of ["home", "live-splash", "weather"]) {
    assert.match(
      workflow,
      new RegExp(
        "service: factory-" +
          app +
          "[\\s\\S]*?FACTORY_API_URL=\\$\\{\\{ env\\.FACTORY_API_URL \\}\\}",
      ),
      app + " must receive FACTORY_API_URL at runtime",
    );
    assert.match(
      bootstrap,
      new RegExp(
        "APP=" + app + "[\\s\\S]*?FACTORY_API_URL=" + productionApiOrigin,
      ),
      app + " bootstrap image must not bake in the localhost fallback",
    );
  }

  assert.doesNotMatch(workflow, /NEXT_PUBLIC_FACTORY_API_URL/);
  assert.doesNotMatch(dockerfile, /NEXT_PUBLIC_FACTORY_API_URL/);
});
