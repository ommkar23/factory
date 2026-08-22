import { afterEach, describe, expect, it, vi } from "vitest";
const { signInWithOAuth } = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
}));
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({
    auth: { signInWithOAuth },
  })),
}));
import * as auth from "../src/core";
import { signIn } from "../src/client";
const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
function restoreEnvironmentVariable(name, value) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
afterEach(() => {
  restoreEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL", originalSupabaseUrl);
  restoreEnvironmentVariable(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    originalSupabaseKey,
  );
  signInWithOAuth.mockReset();
});
describe("Google authentication", () => {
  it("bypasses authentication only in development", () => {
    expect(auth.isDevelopmentAuthBypass("development")).toBe(true);
    expect(auth.isDevelopmentAuthBypass("production")).toBe(false);
    expect(auth.isDevelopmentAuthBypass("test")).toBe(false);
  });
  it("does not expose development mock authentication APIs", () => {
    expect(auth).not.toHaveProperty("getAuthMode");
    expect(auth).not.toHaveProperty("getMockUser");
    expect(auth).not.toHaveProperty("createMockToken");
    expect(auth).not.toHaveProperty("isMockToken");
  });
  it("starts Google OAuth even when called with the legacy mock mode", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
    signInWithOAuth.mockResolvedValue({ data: { url: null }, error: null });
    await expect(
      signIn({
        mode: "mock",
        redirectTo: "https://factory.markagen.ai/auth/callback?next=/",
      }),
    ).rejects.toThrow("Supabase did not return an OAuth redirect URL.");
    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: "https://factory.markagen.ai/auth/callback?next=/",
      },
    });
  });
});
