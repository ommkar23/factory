import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { MOCK_AUTH_COOKIE } from "../src/server";
import {
  createMockSignInResponse,
  createMockSignOutResponse,
  handleAuthCallback,
} from "../src/routes";

const originalAuthMode = process.env.AUTH_MODE;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.AUTH_MODE = originalAuthMode;
  process.env.NODE_ENV = originalNodeEnv;
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

  it("redirects a missing OAuth code to the app login with an error", async () => {
    process.env.AUTH_MODE = "supabase";
    process.env.NODE_ENV = "production";

    const response = await handleAuthCallback(
      new NextRequest("https://factory.markagen.ai/weather/auth/callback"),
      { basePath: "/weather" },
    );

    expect(response.headers.get("location")).toBe(
      "https://factory.markagen.ai/weather/login?auth_error=oauth_callback_failed",
    );
  });
});
