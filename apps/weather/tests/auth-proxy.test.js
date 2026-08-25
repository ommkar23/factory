// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "../proxy.js";

describe("weather auth proxy", () => {
  it("leaves shared-origin login and health routes plus Factory auth routes public", async () => {
    for (const path of [
      "/weather/login",
      "/weather/logged-out",
      "/logged-out",
      "/weather/api/health",
      "/weather/api/auth/dev/bootstrap",
      "/api/auth/dev/bootstrap",
      "/auth/login",
    ]) {
      const response = await proxy(
        new NextRequest(`http://localhost:3001${path}`),
      );
      expect(response.status, `${path} must remain public`).toBe(200);
    }
  });

  it("redirects unauthenticated shared-origin and local protected requests to their login route", async () => {
    for (const [url, loginUrl] of [
      [
        "http://localhost:3001/weather",
        "http://localhost:3001/weather/login?next=%2Fweather",
      ],
      ["http://localhost:3001/", "http://localhost:3001/login?next=%2F"],
    ]) {
      const response = await proxy(new NextRequest(url));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(loginUrl);
    }
  });
});

describe("weather Factory API boundary", () => {
  it("passes missing and invalid API credentials through without a login redirect", async () => {
    const originalFetch = globalThis.fetch;
    const fetch = async () => new Response(null, { status: 401 });
    globalThis.fetch = fetch;

    try {
      for (const headers of [
        {},
        { authorization: "Bearer malformed" },
        { cookie: "Factory-Access-Token=first; Factory-Access-Token=second" },
        {
          authorization: "Bearer malformed",
          cookie: "Factory-Access-Token=malformed",
        },
      ]) {
        const response = await proxy(
          new NextRequest("http://localhost:3001/app/weather/v1/widgets", {
            headers,
          }),
        );
        expect(response.status).toBe(200);
        expect(response.headers.get("location")).toBeNull();
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
