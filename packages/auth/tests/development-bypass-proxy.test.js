import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { updateAuthSession } from "../src/proxy.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Factory API session proxy", () => {
  it("refreshes the Factory session and relays refreshed browser cookies", async () => {
    const fetch = vi.fn().mockResolvedValue({
      headers: {
        getSetCookie: () => [
          "Factory-Access-Token=rotated; HttpOnly; Path=/; SameSite=Lax",
        ],
      },
    });
    vi.stubGlobal("fetch", fetch);
    const request = new NextRequest("http://localhost:3001/weather", {
      headers: { cookie: "Factory-Access-Token=expired" },
    });

    const response = await updateAuthSession(request);

    expect(fetch).toHaveBeenCalledWith("http://localhost:3004/auth/session", {
      cache: "no-store",
      headers: { cookie: "Factory-Access-Token=expired" },
    });
    expect(response.headers.get("set-cookie")).toContain(
      "Factory-Access-Token=rotated",
    );
  });

  it("forwards refreshed Factory cookies to the downstream request during the same request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        headers: {
          getSetCookie: () => [
            "Factory-Access-Token=rotated; HttpOnly; Path=/; SameSite=Lax",
          ],
        },
      }),
    );
    const request = new NextRequest("http://localhost:3001/weather", {
      headers: { cookie: "Factory-Access-Token=expired" },
    });

    const response = await updateAuthSession(request);

    expect(response.headers.get("x-middleware-request-cookie")).toBe(
      "Factory-Access-Token=rotated",
    );
  });

  it("does not bypass unauthenticated requests or contact the session endpoint without Factory cookies", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    const response = await updateAuthSession(
      new NextRequest("http://localhost:3001/login"),
    );

    expect(response.status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  });
});
