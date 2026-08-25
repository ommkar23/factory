import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { existingPrettierTrackedFiles } from "./prettier-tracked.mjs";
import test from "node:test";

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
