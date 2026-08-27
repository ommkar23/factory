import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");

async function text(file) {
  return readFile(path.join(root, file), "utf8");
}

test("the production image builds and copies all three standalone runtimes", async () => {
  const dockerfile = await text("Dockerfile");
  for (const app of ["home", "live-splash", "weather"]) {
    assert.match(dockerfile, new RegExp(`pnpm --filter @factory/${app} build`));
  }
  assert.match(
    dockerfile,
    /COPY --chown=nextjs:nextjs --from=builder \/runtimes \/runtimes/,
  );
  assert.match(
    dockerfile,
    /CMD \["node", "\/app\/scripts\/unified-web\.mjs"\]/,
  );
  assert.doesNotMatch(dockerfile, /ARG APP/);
});

test("local-only targets can package Weather and Live Splash independently", async () => {
  const dockerfile = await text("Dockerfile");
  assert.match(dockerfile, /FROM standalone-base AS weather-local/);
  assert.match(dockerfile, /FROM standalone-base AS live-splash-local/);
  assert.match(dockerfile, /\/app\/apps\/weather\/server\.js/);
  assert.match(dockerfile, /\/app\/apps\/live-splash\/server\.js/);

  const deployment = await text("scripts/local-app-deploy.py");
  assert.match(deployment, /APPS = \{"weather", "live-splash"\}/);
  assert.match(deployment, /FACTORY_SHARED_ORIGIN=false/);
  assert.match(deployment, /host\.docker\.internal:host-gateway/);
  assert.match(deployment, /127\.0\.0\.1::8080/);
  assert.match(deployment, /portless/);
  assert.match(deployment, /"tailscale", "serve"/);
  assert.match(deployment, /tailscale_url/);
});

test("all web changes trigger only the unified Home deployment", async () => {
  const workflow = await text(".github/workflows/deploy-home-cloud-run.yml");

  for (const watched of [
    "apps/home/**",
    "apps/live-splash/**",
    "apps/weather/**",
    "packages/auth/**",
    "packages/ui/**",
    "scripts/unified-web.mjs",
    "Dockerfile",
  ]) {
    assert.ok(workflow.includes(`- "${watched}"`), watched);
  }
  assert.match(workflow, /runs-on: ubuntu-latest/);
  assert.match(workflow, /docker build/);
  assert.match(workflow, /service: factory-home/);
  assert.doesNotMatch(workflow, /factory-(weather|live-splash)/);
  await assert.rejects(
    access(path.join(root, ".github/workflows/deploy-app-cloud-run.yml")),
  );
  await assert.rejects(
    access(path.join(root, ".github/workflows/deploy-weather-cloud-run.yml")),
  );
  await assert.rejects(
    access(
      path.join(root, ".github/workflows/deploy-live-splash-cloud-run.yml"),
    ),
  );
});

test("Terraform declares one web service and keeps the API independent", async () => {
  const [main, variables] = await Promise.all([
    text("infra/gcp/main.tf"),
    text("infra/gcp/variables.tf"),
  ]);
  assert.match(main, /name\s+= "factory-home"/);
  assert.match(main, /name\s+= "factory-api"/);
  assert.doesNotMatch(main, /factory-(weather|live-splash)/);
  assert.match(variables, /\["api", "home"\]/);
  assert.doesNotMatch(
    variables,
    /service_images.*live-splash|service_images.*weather/,
  );
});
