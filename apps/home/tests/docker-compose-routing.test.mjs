import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

function serviceBlock(compose, service) {
  return compose.match(
    new RegExp(
      `^  ${service}:\\n([\\s\\S]*?)(?=^  [a-z-]+:\\n|^volumes:)`,
      "m",
    ),
  )?.[1];
}

test("Docker development runs all Next.js apps in one Home container", async () => {
  const compose = await readFile(path.join(repoRoot, "compose.yml"), "utf8");
  const home = serviceBlock(compose, "home");

  assert.ok(home, "home service must be present");
  assert.match(home, /node scripts\/unified-web\.mjs/);
  assert.match(home, /LIVE_SPLASH_URL:.*FACTORY_PUBLIC_URL.*live-splash/);
  assert.match(home, /WEATHER_URL:.*FACTORY_PUBLIC_URL.*weather/);
  assert.match(home, /FACTORY_SHARED_ORIGIN: "true"/);
  assert.equal(serviceBlock(compose, "weather"), undefined);
  assert.equal(serviceBlock(compose, "live-splash"), undefined);
  assert.doesNotMatch(compose, /weather-node-modules|live-splash-node-modules/);
});

test("the local gateway has one web upstream and an independent API upstream", async () => {
  const nginx = await readFile(
    path.join(repoRoot, "infra/dev/nginx.conf"),
    "utf8",
  );

  assert.match(nginx, /proxy_pass http:\/\/home:8080/);
  assert.match(nginx, /proxy_pass http:\/\/api:8000/);
  assert.doesNotMatch(nginx, /http:\/\/(weather|live-splash):/);
});

test("Docker development installs dependencies noninteractively", async () => {
  const compose = await readFile(path.join(repoRoot, "compose.yml"), "utf8");
  for (const service of ["home", "storybook"]) {
    const block = serviceBlock(compose, service);
    assert.ok(block, `${service} service must be present`);
    assert.match(block, /CI: "true"/);
  }
});

test("Docker development publishes Storybook on a random loopback port", async () => {
  const [compose, setup, lifecycle] = await Promise.all([
    readFile(path.join(repoRoot, "compose.yml"), "utf8"),
    readFile(path.join(repoRoot, "scripts/setup-factory-dev.sh"), "utf8"),
    readFile(path.join(repoRoot, "scripts/worktree-dev"), "utf8"),
  ]);
  const storybook = serviceBlock(compose, "storybook");

  assert.match(storybook, /pnpm --filter @factory\/ui/);
  assert.match(storybook, /127\.0\.0\.1::6006/);
  assert.match(setup, /worktree-dev" up/);
  assert.match(lifecycle, /portless alias/);
  assert.match(lifecycle, /published_port storybook 6006/);
});
