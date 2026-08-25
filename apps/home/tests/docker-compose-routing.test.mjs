import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

test("Docker development uses one shared-origin gateway", async () => {
  const compose = await readFile(path.join(repoRoot, "compose.yml"), "utf8");
  const homeService = compose.match(
    /^  home:\n([\s\S]*?)(?=^  [a-z-]+:\n|^volumes:)/m,
  )?.[1];

  assert.ok(homeService, "home service must be present");
  assert.match(
    homeService,
    /LIVE_SPLASH_URL:.*FACTORY_PUBLIC_URL.*live-splash/,
  );
  assert.match(homeService, /WEATHER_URL:.*FACTORY_PUBLIC_URL.*weather/);
  assert.match(homeService, /FACTORY_SHARED_ORIGIN: "true"/);
  assert.match(compose, /^  gateway:/m);
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

test("Docker development publishes Storybook on a random loopback port", async () => {
  const [compose, setup, lifecycle] = await Promise.all([
    readFile(path.join(repoRoot, "compose.yml"), "utf8"),
    readFile(path.join(repoRoot, "scripts/setup-factory-dev.sh"), "utf8"),
    readFile(path.join(repoRoot, "scripts/worktree-dev"), "utf8"),
  ]);
  const storybookService = compose.match(
    /^  storybook:\n([\s\S]*?)(?=^  [a-z-]+:\n|^volumes:)/m,
  )?.[1];

  assert.ok(storybookService, "storybook service must be present");
  assert.match(storybookService, /pnpm --filter @factory\/ui/);
  assert.match(storybookService, /127\.0\.0\.1::6006/);
  assert.match(setup, /worktree-dev" up/);
  assert.match(lifecycle, /portless alias/);
  assert.match(lifecycle, /published_port storybook 6006/);
});
