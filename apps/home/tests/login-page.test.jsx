import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
const { getCurrentUser } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("@factory/auth/server", () => ({ getCurrentUser }));
import LoginPage from "../app/login/page";
describe("Factory login page", () => {
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
});
