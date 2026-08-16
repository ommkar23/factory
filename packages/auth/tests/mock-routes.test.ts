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

import { MOCK_AUTH_COOKIE } from "../src/server";
import {
  createMockSignInResponse,
  createMockSignOutResponse,
  handleAuthCallback,
} from "../src/routes";

const originalAuthMode = process.env.AUTH_MODE;
const originalNodeEnv = process.env.NODE_ENV;
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
  restoreEnvironmentVariable("AUTH_MODE", originalAuthMode);
  restoreEnvironmentVariable("NODE_ENV", originalNodeEnv);
  restoreEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL", originalSupabaseUrl);
  restoreEnvironmentVariable(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    originalSupabaseKey,
  );
  exchangeCodeForSession.mockReset();
});

describe("mock auth routes", () => {
  it("rejects mock authentication in production", () => {
    process.env.AUTH_MODE = "mock";
    process.env.NODE_ENV = "production";

    expect(() => createMockSignInResponse()).toThrow(
      "AUTH_MODE=mock is only allowed when NODE_ENV=development.",
    );
  });

  it("does not expose mock sign-out in Supabase mode", () => {
    process.env.AUTH_MODE = "supabase";
    process.env.NODE_ENV = "production";

    expect(createMockSignOutResponse().status).toBe(404);
  });

  it("redirects an allowed callback next path in mock mode", async () => {
    process.env.AUTH_MODE = "mock";
    process.env.NODE_ENV = "development";

    const response = await handleAuthCallback(
      new NextRequest(
        "https://factory.markagen.ai/auth/callback?next=/live-splash",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://factory.markagen.ai/live-splash",
    );
  });

  it("rejects external and unrecognized callback next paths", async () => {
    process.env.AUTH_MODE = "mock";
    process.env.NODE_ENV = "development";

    for (const next of ["https://attacker.example", "/admin"]) {
      const response = await handleAuthCallback(
        new NextRequest(
          `https://factory.markagen.ai/auth/callback?next=${encodeURIComponent(next)}`,
        ),
      );

      expect(response.headers.get("location")).toBe(
        "https://factory.markagen.ai/",
      );
    }
  });

  it("exchanges a PKCE code before redirecting to an allow-listed path", async () => {
    process.env.AUTH_MODE = "supabase";
    process.env.NODE_ENV = "production";
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

  it("uses the canonical Factory origin rather than an internal proxy host", async () => {
    process.env.AUTH_MODE = "supabase";
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
    exchangeCodeForSession.mockResolvedValue({ error: null });

    const response = await handleAuthCallback(
      new NextRequest(
        "http://0.0.0.0:8080/auth/callback?code=pkce-code&next=/",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://factory.markagen.ai/",
    );
  });

  it("redirects a missing OAuth code safely to home with an error", async () => {
    process.env.AUTH_MODE = "supabase";
    process.env.NODE_ENV = "production";

    const response = await handleAuthCallback(
      new NextRequest("https://factory.markagen.ai/auth/callback"),
    );

    expect(response.headers.get("location")).toBe(
      "https://factory.markagen.ai/?auth_error=oauth_callback_failed",
    );
  });
});
