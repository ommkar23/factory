import { expect, test } from "@playwright/test";
import {
  browserApiContractViolations,
  parseLocalProxyApps,
  sharedOriginConfiguration,
  sharedOriginRuntimeConfiguration,
} from "./support/live-config.mjs";

test("reports every missing shared-origin prerequisite", () => {
  expect(sharedOriginConfiguration({})).toEqual({
    ready: false,
    reason: expect.stringContaining("FACTORY_E2E_SHARED_ORIGIN_URL"),
  });
});

test("requires a checked-in-free shared-origin identity-provider state file", () => {
  const result = sharedOriginRuntimeConfiguration({
    FACTORY_E2E_SHARED_ORIGIN_URL: "https://factory.example.test",
    FACTORY_E2E_SHARED_ORIGIN_PROTECTED_PATH:
      "/app/weather/v1/locations?q=Portland",
    FACTORY_E2E_SHARED_ORIGIN_STORAGE_STATE: "/path/that/does/not/exist.json",
  });

  expect(result).toEqual({
    ready: false,
    reason: expect.stringContaining("does not exist"),
  });
});

test("requires all three local app origins and server-only bootstrap paths", () => {
  expect(parseLocalProxyApps("[]")).toEqual({
    ready: false,
    reason: expect.stringContaining("home"),
  });
});

test("accepts the local route contract without contacting a service", () => {
  const result = parseLocalProxyApps(
    JSON.stringify([
      {
        name: "home",
        origin: "http://localhost:3001",
        bootstrapPath: "/api/auth/dev/bootstrap",
        protectedApiPath: "/app/weather/v1/locations?q=Portland",
      },
      {
        name: "live-splash",
        origin: "http://localhost:3002",
        bootstrapPath: "/api/auth/dev/bootstrap",
        protectedApiPath: "/app/weather/v1/locations?q=Portland",
      },
      {
        name: "weather",
        origin: "http://localhost:3003",
        bootstrapPath: "/api/auth/dev/bootstrap",
        protectedApiPath: "/app/weather/v1/locations?q=Portland",
      },
    ]),
  );

  expect(result).toEqual({
    ready: true,
    apps: expect.arrayContaining([
      expect.objectContaining({
        name: "home",
        publicPath: "/api/health",
        protectedPagePath: "/",
        loginPath: "/login",
      }),
    ]),
  });
});

test("rejects protected requests outside Factory app routes", () => {
  const result = parseLocalProxyApps(
    JSON.stringify(
      ["home", "live-splash", "weather"].map((name) => ({
        name,
        origin: "http://localhost:3001",
        bootstrapPath: "/api/auth/dev/bootstrap",
        protectedApiPath: "/api/weather?q=Portland",
      })),
    ),
  );

  expect(result).toEqual({
    ready: false,
    reason: expect.stringContaining("must be a Factory /app/* route"),
  });
});

test("reports cross-origin browser API traffic only for fetch and XHR", () => {
  const origin = "http://localhost:3001";
  const protectedApiPath = "/app/weather/v1/locations?q=Portland";
  const violations = browserApiContractViolations({
    origin,
    protectedApiPath,
    requests: [
      {
        resourceType: "fetch",
        url: new URL(protectedApiPath, origin).toString(),
      },
      {
        resourceType: "fetch",
        url: "https://data.example.test/v1/items",
      },
      {
        resourceType: "xhr",
        url: "https://api.open-meteo.com/v1/forecast",
      },
      {
        resourceType: "image",
        url: "https://images.example.test/weather.png",
      },
    ],
  });

  expect(violations).toEqual([
    "cross-origin browser fetch request: https://data.example.test/v1/items",
    "cross-origin browser xhr request: https://api.open-meteo.com/v1/forecast",
  ]);
});

test("ignores same-origin Next framework fetches", () => {
  const origin = "http://localhost:3001";
  const protectedApiPath = "/app/weather/v1/locations?q=Portland";

  expect(
    browserApiContractViolations({
      origin,
      protectedApiPath,
      requests: [
        {
          resourceType: "fetch",
          url: new URL("/login?next=%2F&_rsc=abc123", origin).toString(),
        },
        {
          resourceType: "fetch",
          url: new URL(
            "/_next/static/webpack/app.hot-update.json",
            origin,
          ).toString(),
        },
        {
          resourceType: "fetch",
          url: new URL(protectedApiPath, origin).toString(),
        },
      ],
    }),
  ).toEqual([]);
});

test("rejects removed same-origin API routes even when Factory traffic is observed", () => {
  const origin = "http://localhost:3001";
  const protectedApiPath = "/app/weather/v1/locations?q=Portland";
  const removedApiUrl = new URL("/api/weather?q=Portland", origin).toString();

  expect(
    browserApiContractViolations({
      origin,
      protectedApiPath,
      requests: [
        {
          resourceType: "fetch",
          url: new URL(protectedApiPath, origin).toString(),
        },
        {
          resourceType: "fetch",
          url: removedApiUrl,
        },
      ],
    }),
  ).toEqual([`disallowed same-origin browser fetch request: ${removedApiUrl}`]);
});

test("requires the protected Factory app request to be observed", () => {
  const origin = "http://localhost:3001";
  const protectedApiPath = "/app/weather/v1/locations?q=Portland";

  expect(
    browserApiContractViolations({
      origin,
      protectedApiPath,
      requests: [
        {
          resourceType: "fetch",
          url: new URL("/auth/session", origin).toString(),
        },
      ],
    }),
  ).toEqual([
    `protected Factory request was not observed: ${new URL(
      protectedApiPath,
      origin,
    ).toString()}`,
  ]);
});

test("rejects paths that could leave the local app origin", () => {
  const result = parseLocalProxyApps(
    JSON.stringify(
      ["home", "live-splash", "weather"].map((name) => ({
        name,
        origin: "http://localhost:3001",
        bootstrapPath: "//api.example.test/auth/dev/session",
        protectedApiPath: "/app/weather/v1/locations?q=Portland",
      })),
    ),
  );

  expect(result).toEqual({
    ready: false,
    reason: expect.stringContaining("root-relative"),
  });
});

test("rejects the protected API development issuer as a browser bootstrap path", () => {
  const result = parseLocalProxyApps(
    JSON.stringify(
      ["home", "live-splash", "weather"].map((name) => ({
        name,
        origin: "http://localhost:3001",
        bootstrapPath: "/auth/dev/session",
        protectedApiPath: "/app/weather/v1/locations?q=Portland",
      })),
    ),
  );

  expect(result).toEqual({
    ready: false,
    reason: expect.stringContaining("/api/auth/dev/bootstrap"),
  });
});
