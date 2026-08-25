// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "../proxy.js";

describe("home auth proxy", () => {
  it("leaves login, health, and Factory auth routes public", async () => {
    for (const path of [
      "/login",
      "/logged-out",
      "/api/health",
      "/api/auth/dev/bootstrap",
      "/auth/login",
    ]) {
      const response = await proxy(
        new NextRequest(`http://localhost:3002${path}`),
      );
      expect(response.status, `${path} must remain public`).toBe(200);
    }
  });

  it("redirects an unauthenticated root request to its local login route", async () => {
    const response = await proxy(new NextRequest("http://localhost:3002/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3002/login?next=%2F",
    );
  });
});

describe("home Factory API boundary", () => {
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
          new NextRequest("http://localhost:3002/app/home/v1/widgets", {
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
