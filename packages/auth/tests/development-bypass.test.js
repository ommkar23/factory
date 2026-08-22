import { afterEach, describe, expect, it, vi } from "vitest";
const { createServerClient, getClaims } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getClaims: vi.fn(),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClient.mockImplementation(() => ({
    auth: { getClaims },
  })),
}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
import { getCurrentUser } from "../src/server";
const originalNodeEnv = process.env.NODE_ENV;
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
  restoreEnvironmentVariable("NODE_ENV", originalNodeEnv);
  restoreEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL", originalSupabaseUrl);
  restoreEnvironmentVariable(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    originalSupabaseKey,
  );
  createServerClient.mockClear();
  getClaims.mockReset();
});
describe("development authentication bypass", () => {
  it("returns a local user without contacting Supabase in development", async () => {
    process.env.NODE_ENV = "development";
    await expect(getCurrentUser()).resolves.toEqual({
      id: "development-bypass",
      email: "developer@factory.local",
      name: "Factory Developer",
      avatarUrl: null,
    });
    expect(createServerClient).not.toHaveBeenCalled();
  });
  it("uses Supabase claims in production", async () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
    getClaims.mockResolvedValue({
      data: { claims: { email: "ada@example.com", sub: "production-user" } },
      error: null,
    });
    await expect(getCurrentUser()).resolves.toEqual({
      id: "production-user",
      email: "ada@example.com",
      name: null,
      avatarUrl: null,
    });
    expect(createServerClient).toHaveBeenCalledOnce();
    expect(getClaims).toHaveBeenCalledOnce();
  });
});
