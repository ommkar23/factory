import assert from "node:assert/strict";
import test from "node:test";

let importId = 0;

async function loadConfigWithFactoryApiUrl(factoryApiUrl) {
  const previous = process.env.FACTORY_API_URL;

  if (factoryApiUrl === undefined) {
    delete process.env.FACTORY_API_URL;
  } else {
    process.env.FACTORY_API_URL = factoryApiUrl;
  }

  try {
    return (await import(`../next.config.mjs?factory-api-url=${importId++}`))
      .default;
  } finally {
    if (previous === undefined) {
      delete process.env.FACTORY_API_URL;
    } else {
      process.env.FACTORY_API_URL = previous;
    }
  }
}

test("production home config emits a standalone server", async () => {
  const { default: config } = await import("../next.config.mjs");

  assert.equal(config.output, "standalone");
});

test("home externally proxies root auth and app paths with fallback and custom API origins", async () => {
  for (const { factoryApiUrl, destination } of [
    { factoryApiUrl: undefined, destination: "http://localhost:3004" },
    { factoryApiUrl: "", destination: "http://localhost:3004" },
    {
      factoryApiUrl: "https://factory-api.example.test",
      destination: "https://factory-api.example.test",
    },
  ]) {
    const config = await loadConfigWithFactoryApiUrl(factoryApiUrl);
    const rewrites = await config.rewrites();

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
