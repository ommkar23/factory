import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";

const repositoryRoot = resolve(import.meta.dirname, "../..");

function renderCompose(project) {
  const result = spawnSync(
    "docker",
    [
      "compose",
      "--file",
      "compose.yml",
      "--project-name",
      project,
      "--env-file",
      "supabase/.env.example",
      "config",
      "--format",
      "json",
    ],
    {
      cwd: repositoryRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        COMPOSE_PROJECT_NAME: project,
        DEV_AUTH_SECRET: "validation-only",
        FACTORY_PUBLIC_URL: "https://factory.localhost",
        HOST_GID: String(process.getgid?.() ?? 1000),
        HOST_UID: String(process.getuid?.() ?? 1000),
        SUPABASE_PUBLIC_URL: "https://supabase.factory.localhost",
      },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("Compose resources and random host bindings are isolated by project", () => {
  const first = renderCompose("factory-worktree-a");
  const second = renderCompose("factory-worktree-b");

  assert.notEqual(first.name, second.name);
  for (const service of ["auth", "db", "api-gw", "realtime"]) {
    assert.match(first.services[service].container_name, /^factory-worktree-a-/);
    assert.match(second.services[service].container_name, /^factory-worktree-b-/);
  }
  for (const [service, target] of [
    ["gateway", 8080],
    ["storybook", 6006],
    ["api-gw", 8000],
  ]) {
    const port = first.services[service].ports.find(
      (candidate) => candidate.target === target,
    );
    assert.equal(port.host_ip, "127.0.0.1");
    assert.equal(port.published, undefined);
  }
  assert.equal(
    first.services.db.volumes.find(
      (volume) => volume.target === "/var/lib/postgresql/data",
    ).type,
    "volume",
  );
});
