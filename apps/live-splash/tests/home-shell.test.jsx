import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { getCurrentUser } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@factory/auth", () => ({
  getAuthPath: (_basePath, path) => path,
  getLoginPath: () => "/login",
  getRequestBasePath: () => "/live-splash",
}));
vi.mock("@factory/auth/server", () => ({ getCurrentUser }));
vi.mock("@factory/auth/ui", () => ({
  AppHeader: ({ appName, user }) => (
    <header data-app-name={appName} data-user-email={user.email} />
  ),
}));

import HomePage from "../app/page";

describe("Live Splash authenticated shell", () => {
  it("retains the app header and content without Home navigation", async () => {
    getCurrentUser.mockResolvedValue({ email: "ada@example.com" });

    const markup = renderToStaticMarkup(await HomePage());

    expect(markup).toContain('data-app-name="Live Splash"');
    expect(markup).toContain("<main");
    expect(markup).not.toContain("Go to Home");
    expect(markup).not.toContain("Development baseline");
    expect(markup).not.toContain("Current state");
    expect(markup).not.toContain("No Live Splash feed is connected yet.");
  });
});
