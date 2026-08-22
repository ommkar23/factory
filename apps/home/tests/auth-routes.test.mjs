import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const mockRoutePaths = [
  "app/auth/mock/sign-in/route.ts",
  "app/auth/mock/sign-out/route.ts",
];

test("does not expose development mock authentication routes", () => {
  for (const routePath of mockRoutePaths) {
    assert.equal(
      existsSync(path.join(appRoot, routePath)),
      false,
      `${routePath} must not be present`,
    );
  }
});
