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

test("production weather config emits a standalone server", async () => {
  const { default: config } = await import("../next.config.mjs");

  assert.equal(config.output, "standalone");
});

test("weather config scopes routes to /weather on a shared origin", async () => {
  const config = await loadConfigWithSharedOrigin();

  assert.equal(config.basePath, "/weather");
  assert.equal(config.env.FACTORY_SHARED_ORIGIN, "true");
});
