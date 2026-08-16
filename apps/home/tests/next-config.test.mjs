import assert from "node:assert/strict";
import test from "node:test";

test("production home config emits a standalone server", async () => {
  const { default: config } = await import("../next.config.mjs");

  assert.equal(config.output, "standalone");
});
