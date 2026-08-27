// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnvironment = process.env.NODE_ENV;
const originalApiUrl = process.env.FACTORY_API_URL;
const originalSecret = process.env.DEV_AUTH_SECRET;
const originalBootstrap = process.env.FACTORY_DEV_AUTH_BOOTSTRAP;

afterEach(() => {
  vi.unstubAllGlobals();
  process.env.NODE_ENV = originalEnvironment;
  if (originalApiUrl === undefined) delete process.env.FACTORY_API_URL;
  else process.env.FACTORY_API_URL = originalApiUrl;
  if (originalBootstrap === undefined)
    delete process.env.FACTORY_DEV_AUTH_BOOTSTRAP;
  else process.env.FACTORY_DEV_AUTH_BOOTSTRAP = originalBootstrap;
  if (originalSecret === undefined) delete process.env.DEV_AUTH_SECRET;
  else process.env.DEV_AUTH_SECRET = originalSecret;
});

describe("weather development auth bootstrap", () => {
  it("forwards the server-held secret upstream and relays only Factory cookies", async () => {
    process.env.NODE_ENV = "development";
    process.env.FACTORY_API_URL = "http://factory-api.test/";
    process.env.DEV_AUTH_SECRET = "server-held-secret";
    const fetch = vi.fn().mockResolvedValue({
      headers: {
        getSetCookie: () => [
          "Factory-Access-Token=issued; HttpOnly; Path=/; SameSite=Lax",
        ],
      },
      status: 204,
    });
    vi.stubGlobal("fetch", fetch);

    const { POST } = await import("../app/api/auth/dev/bootstrap/route.js");
    const response = await POST();

    expect(fetch).toHaveBeenCalledWith(
      "http://factory-api.test/auth/dev/session",
      {
        cache: "no-store",
        headers: { "X-Dev-Auth-Secret": "server-held-secret" },
        method: "POST",
      },
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain(
      "Factory-Access-Token=issued",
    );
    expect(response.headers.get("X-Dev-Auth-Secret")).toBeNull();
    expect([...response.headers.keys()]).toEqual(["set-cookie"]);
  });

  it("allows an explicitly isolated production-style deployment", async () => {
    process.env.NODE_ENV = "production";
    process.env.FACTORY_DEV_AUTH_BOOTSTRAP = "true";
    process.env.FACTORY_API_URL = "http://factory-api.test/";
    process.env.DEV_AUTH_SECRET = "server-held-secret";
    const fetch = vi.fn().mockResolvedValue({
      headers: { getSetCookie: () => [] },
      status: 204,
    });
    vi.stubGlobal("fetch", fetch);

    const { POST } = await import("../app/api/auth/dev/bootstrap/route.js");
    const response = await POST();

    expect(response.status).toBe(204);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("is absent outside development without contacting the Factory API", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.FACTORY_DEV_AUTH_BOOTSTRAP;
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const { POST } = await import("../app/api/auth/dev/bootstrap/route.js");
    const response = await POST();

    expect(response.status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
  });
});
