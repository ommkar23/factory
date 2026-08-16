import assert from "node:assert/strict";
import test from "node:test";

async function loadConfigWithSharedOrigin() {
  const previous = process.env.FACTORY_SHARED_ORIGIN;
  process.env.FACTORY_SHARED_ORIGIN = "true";

  try {
    return (await import(`../next.config.mjs?shared-origin=${Date.now()}`))
      .default;
  } finally {
    if (previous === undefined) {
      delete process.env.FACTORY_SHARED_ORIGIN;
    } else {
      process.env.FACTORY_SHARED_ORIGIN = previous;
    }
  }
}

test("production Live Splash config emits a standalone server", async () => {
  const { default: config } = await import("../next.config.mjs");

  assert.equal(config.output, "standalone");
});

test("Live Splash config scopes routes to /live-splash on a shared origin", async () => {
  const config = await loadConfigWithSharedOrigin();

  assert.equal(config.basePath, "/live-splash");
  assert.equal(config.env.FACTORY_SHARED_ORIGIN, "true");
});
