import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const { exchangeCodeForSession } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { exchangeCodeForSession },
  })),
}));

import * as routes from "../src/routes";
import { handleAuthCallback } from "../src/routes";

const originalSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const originalSupabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function restoreEnvironmentVariable(name: string, value: string | undefined) {
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
  exchangeCodeForSession.mockReset();
});

describe("authentication routes", () => {
  it("does not export development mock sign-in or sign-out responses", () => {
    expect(routes).not.toHaveProperty("createMockSignInResponse");
    expect(routes).not.toHaveProperty("createMockSignOutResponse");
  });

  it("exchanges a PKCE code before redirecting to an allow-listed path", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
    exchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await handleAuthCallback(
      new NextRequest(
        "https://factory.markagen.ai/auth/callback?code=pkce-code&next=/weather",
      ),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(response.headers.get("location")).toBe(
      "https://factory.markagen.ai/weather",
    );
  });

  it("redirects a missing OAuth code safely to home with an error", async () => {
    const response = await handleAuthCallback(
      new NextRequest("https://factory.markagen.ai/auth/callback"),
    );

    expect(response.headers.get("location")).toBe(
      "https://factory.markagen.ai/?auth_error=oauth_callback_failed",
    );
  });
});
