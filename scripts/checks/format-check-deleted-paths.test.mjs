import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { existingPrettierTrackedFiles } from "./prettier-tracked.mjs";
import test from "node:test";

test("format check ignores tracked files deleted from the working tree", () => {
  const result = spawnSync("pnpm", ["format:check"], {
    cwd: new URL("../..", import.meta.url),
    encoding: "utf8",
  });

  assert.equal(
    result.status,
    0,
    `pnpm format:check failed:\n${result.stdout}\n${result.stderr}`,
  );
});

test("filters deleted tracked paths before invoking Prettier", () => {
  const files = existingPrettierTrackedFiles(
    ["scripts/checks/format-check-deleted-paths.test.mjs", "deleted/route.js"],
    (file) =>
      file === "scripts/checks/format-check-deleted-paths.test.mjs" ||
      existsSync(file),
  );

  assert.deepEqual(files, [
    "scripts/checks/format-check-deleted-paths.test.mjs",
  ]);
});
