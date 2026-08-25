import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

test("Docker development Home links target the tunnelled app ports", async () => {
  const compose = await readFile(path.join(repoRoot, "compose.yml"), "utf8");
  const homeService = compose.match(
    /^  home:\n([\s\S]*?)(?=^  [a-z-]+:\n|^volumes:)/m,
  )?.[1];

  assert.ok(homeService, "home service must be present");
  assert.match(homeService, /LIVE_SPLASH_URL: http:\/\/localhost:3002/);
  assert.match(homeService, /WEATHER_URL: http:\/\/localhost:3003/);
});

test("Docker development app services install dependencies noninteractively", async () => {
  const compose = await readFile(path.join(repoRoot, "compose.yml"), "utf8");

  for (const service of ["home", "live-splash", "weather", "storybook"]) {
    const serviceBlock = compose.match(
      new RegExp(
        `^  ${service}:\\n([\\s\\S]*?)(?=^  [a-z-]+:\\n|^volumes:)`,
        "m",
      ),
    )?.[1];

    assert.ok(serviceBlock, `${service} service must be present`);
    assert.match(serviceBlock, /CI: "true"/);
  }
});

test("Docker development publishes Storybook and waits for readiness", async () => {
  const [compose, setup] = await Promise.all([
    readFile(path.join(repoRoot, "compose.yml"), "utf8"),
    readFile(path.join(repoRoot, "scripts/setup-factory-dev.sh"), "utf8"),
  ]);
  const storybookService = compose.match(
    /^  storybook:\n([\s\S]*?)(?=^  [a-z-]+:\n|^volumes:)/m,
  )?.[1];

  assert.ok(storybookService, "storybook service must be present");
  assert.match(storybookService, /pnpm --filter @factory\/ui/);
  assert.match(storybookService, /127\.0\.0\.1:6006:6006/);
  assert.match(setup, /docker compose up[^\n]*storybook/);
  assert.match(setup, /http:\/\/127\.0\.0\.1:6006\//);
});
