import { describe, expect, it } from "vitest";

import {
  DEV_USER_ID,
  createMockToken,
  getAuthMode,
  getAuthPath,
  getLoginPath,
  getProductionOAuthCallbackUrl,
  getRequestBasePath,
  getMockUser,
  getUserInitials,
  isMockToken,
} from "../src/core";

describe("mock authentication", () => {
  it("uses the fixed development-only user", () => {
    expect(getMockUser()).toMatchObject({ id: DEV_USER_ID });
  });

  it("creates opaque mock-only tokens", () => {
    const token = createMockToken(() => "test-token");

    expect(token).toBe("factory-mock.test-token");
    expect(token.split(".")).toHaveLength(2);
    expect(isMockToken(token)).toBe(true);
    expect(
      isMockToken(
        "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJkZXYtdXNlci0wMDAxIn0.signature",
      ),
    ).toBe(false);
  });

  it("defaults to mock only in development and rejects unsupported auth modes", () => {
    expect(getAuthMode(undefined, "development")).toBe("mock");
    expect(getAuthMode(undefined, "production")).toBe("supabase");
    expect(() => getAuthMode("mock", "production")).toThrow(
      "AUTH_MODE=mock is only allowed when NODE_ENV=development.",
    );
    expect(getAuthMode("supabase", "development")).toBe("supabase");
    expect(() => getAuthMode("unknown")).toThrow("AUTH_MODE");
  });

  it("builds the fixed production OAuth callback URLs", () => {
    expect(getProductionOAuthCallbackUrl("/")).toBe(
      "https://factory.markagen.ai/auth/callback?next=/",
    );
    expect(getProductionOAuthCallbackUrl("/live-splash")).toBe(
      "https://factory.markagen.ai/auth/callback?next=/live-splash",
    );
    expect(getProductionOAuthCallbackUrl("/weather")).toBe(
      "https://factory.markagen.ai/auth/callback?next=/weather",
    );
  });

  it("builds callback paths for local ports and shared-origin deployments", () => {
    expect(getAuthPath("", "/auth/callback")).toBe("/auth/callback");
    expect(getAuthPath("/weather", "/auth/callback")).toBe(
      "/weather/auth/callback",
    );
    expect(getAuthPath("/live-splash/", "auth/callback")).toBe(
      "/live-splash/auth/callback",
    );
  });

  it("builds app-local login destinations and accessible avatar initials", () => {
    expect(getLoginPath("")).toBe("/login");
    expect(getLoginPath("/weather")).toBe("/weather/login");
    expect(getRequestBasePath("/weather", false)).toBe("");
    expect(getRequestBasePath("/weather", true)).toBe("/weather");
    expect(
      getUserInitials({
        id: "user-1",
        name: "Ada Lovelace",
        email: "ada@example.com",
        avatarUrl: null,
      }),
    ).toBe("AL");
    expect(
      getUserInitials({
        id: "user-2",
        name: null,
        email: "grace.hopper@example.com",
        avatarUrl: null,
      }),
    ).toBe("GH");
  });
});
