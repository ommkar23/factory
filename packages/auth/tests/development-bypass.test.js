import { afterEach, describe, expect, it, vi } from "vitest";

const { cookies } = vi.hoisted(() => ({ cookies: vi.fn() }));
vi.mock("next/headers", () => ({ cookies }));

import { getCurrentUser, requireCurrentUser } from "../src/server.js";

afterEach(() => {
  vi.unstubAllGlobals();
  cookies.mockReset();
});

describe("Factory API server authentication", () => {
  it("reads the current user from the Factory session endpoint using request cookies", async () => {
    cookies.mockResolvedValue({
      getAll: () => [
        { name: "Factory-Access-Token", value: "browser-token" },
        { name: "Factory-Refresh-Token", value: "browser-refresh" },
      ],
    });
    const fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        user: { email: "ada@example.com", id: "user-1" },
      }),
      ok: true,
    });
    vi.stubGlobal("fetch", fetch);

    await expect(getCurrentUser()).resolves.toEqual({
      avatarUrl: null,
      email: "ada@example.com",
      id: "user-1",
      name: null,
    });
    expect(fetch).toHaveBeenCalledWith("http://localhost:3004/auth/session", {
      cache: "no-store",
      headers: {
        cookie:
          "Factory-Access-Token=browser-token; Factory-Refresh-Token=browser-refresh",
      },
    });
  });

  it("treats an unauthenticated Factory session as no current user", async () => {
    cookies.mockResolvedValue({ getAll: () => [] });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );

    await expect(getCurrentUser()).resolves.toBeNull();
    await expect(requireCurrentUser()).rejects.toThrow(
      "Authentication is required.",
    );
  });
});
