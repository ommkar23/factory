import assert from "node:assert/strict";
import test from "node:test";

let importId = 0;

async function loadConfigWithSharedOrigin(factoryApiUrl) {
  const previousSharedOrigin = process.env.FACTORY_SHARED_ORIGIN;
  const previousFactoryApiUrl = process.env.FACTORY_API_URL;
  process.env.FACTORY_SHARED_ORIGIN = "true";

  if (factoryApiUrl === undefined) {
    delete process.env.FACTORY_API_URL;
  } else {
    process.env.FACTORY_API_URL = factoryApiUrl;
  }

  try {
    return (await import(`../next.config.mjs?shared-origin=${importId++}`))
      .default;
  } finally {
    if (previousSharedOrigin === undefined) {
      delete process.env.FACTORY_SHARED_ORIGIN;
    } else {
      process.env.FACTORY_SHARED_ORIGIN = previousSharedOrigin;
    }
    if (previousFactoryApiUrl === undefined) {
      delete process.env.FACTORY_API_URL;
    } else {
      process.env.FACTORY_API_URL = previousFactoryApiUrl;
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

test("Live Splash externally proxies root auth and app paths in shared-origin mode", async () => {
  for (const { factoryApiUrl, destination } of [
    { factoryApiUrl: undefined, destination: "http://localhost:3004" },
    { factoryApiUrl: "", destination: "http://localhost:3004" },
    {
      factoryApiUrl: "https://factory-api.example.test",
      destination: "https://factory-api.example.test",
    },
  ]) {
    const config = await loadConfigWithSharedOrigin(factoryApiUrl);
    const rewrites = await config.rewrites();

    assert.equal(config.basePath, "/live-splash");
    assert.deepEqual(rewrites, [
      {
        source: "/auth/:path*",
        destination: `${destination}/auth/:path*`,
        basePath: false,
      },
      {
        source: "/app/:path*",
        destination: `${destination}/app/:path*`,
        basePath: false,
      },
    ]);
    assert.equal(
      rewrites.some(({ source }) => source === "/api/:path*"),
      false,
      "/api/health must remain handled by Next.js",
    );
  }
});
