// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "../proxy.js";

describe("Live Splash auth proxy", () => {
  it("leaves shared-origin login and health routes plus Factory auth routes public", async () => {
    for (const path of [
      "/live-splash/login",
      "/live-splash/logged-out",
      "/logged-out",
      "/live-splash/api/health",
      "/live-splash/api/auth/dev/bootstrap",
      "/api/auth/dev/bootstrap",
      "/auth/login",
    ]) {
      const response = await proxy(
        new NextRequest(`http://localhost:3000${path}`),
      );
      expect(response.status, `${path} must remain public`).toBe(200);
    }
  });

  it("redirects unauthenticated shared-origin and local protected requests to their login route", async () => {
    for (const [url, loginUrl] of [
      [
        "http://localhost:3000/live-splash",
        "http://localhost:3000/live-splash/login?next=%2Flive-splash",
      ],
      ["http://localhost:3000/", "http://localhost:3000/login?next=%2F"],
    ]) {
      const response = await proxy(new NextRequest(url));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(loginUrl);
    }
  });
});

describe("Live Splash Factory API boundary", () => {
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
          new NextRequest("http://localhost:3000/app/live-splash/v1/widgets", {
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
