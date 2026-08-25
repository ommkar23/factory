import { expect, test } from "@playwright/test";
import {
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
