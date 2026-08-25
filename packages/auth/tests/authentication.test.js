import { afterEach, describe, expect, it, vi } from "vitest";
import { signIn, signOut } from "../src/client.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Factory API browser authentication", () => {
  it("starts same-origin login with the requested return path", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });

    await signIn({ next: "/weather" });

    expect(assign).toHaveBeenCalledWith("/auth/login?next=%2Fweather");
  });

  it("posts same-origin logout with browser credentials", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetch);

    await signOut();

    expect(fetch).toHaveBeenCalledWith("/auth/logout", {
      credentials: "include",
      method: "POST",
    });
  });

  it("reports a failed Factory API logout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    await expect(signOut()).rejects.toThrow("Unable to sign out.");
  });
});
