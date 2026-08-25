import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
const { getCurrentUser } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@factory/auth/server", () => ({ getCurrentUser }));
import LoginPage from "../app/login/page";
describe("Live Splash login page", () => {
  it("renders Google OAuth without a development-login option", async () => {
    getCurrentUser.mockResolvedValue(null);
    const markup = renderToStaticMarkup(
      await LoginPage({ searchParams: Promise.resolve({}) }),
    );
    expect(markup).toContain("Continue with Google");
    expect(markup).not.toContain("Continue as development user");
    expect(markup).not.toContain("Local development");
    expect(markup).not.toContain("mock session");
  });
  it("redirects an authenticated user to Factory home", async () => {
    getCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "ada@example.com",
      name: "Ada Lovelace",
      avatarUrl: null,
    });
    await expect(
      LoginPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toMatchObject({ digest: "NEXT_REDIRECT;replace;/;307;" });
  });

  it("preserves a validated local protected return path for OAuth", async () => {
    getCurrentUser.mockResolvedValue(null);

    const page = await LoginPage({
      searchParams: Promise.resolve({ next: "/" }),
    });

    expect(page.props.returnTo).toBe("/");
  });

  it("rejects an external OAuth return path", async () => {
    getCurrentUser.mockResolvedValue(null);

    const page = await LoginPage({
      searchParams: Promise.resolve({ next: "https://evil.example" }),
    });

    expect(page.props.returnTo).toBe("/");
  });

  it("passes only validated protected return paths to OAuth", async () => {
    getCurrentUser.mockResolvedValue(null);

    for (const [next, returnTo] of [
      ["/", "/"],
      ["/live-splash", "/live-splash"],
      ["https://evil.example", "/"],
    ]) {
      const page = await LoginPage({ searchParams: Promise.resolve({ next }) });
      expect(page.props.returnTo).toBe(returnTo);
    }
  });
});
