import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { getCurrentUser } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@factory/auth", () => ({
  getAuthPath: (_basePath, path) => path,
  getLoginPath: () => "/login",
  getRequestBasePath: () => "/weather",
}));
vi.mock("@factory/auth/server", () => ({ getCurrentUser }));
vi.mock("@factory/auth/ui", () => ({
  AppHeader: ({ appName, containerClassName, user }) => (
    <header
      data-app-name={appName}
      data-container-class={containerClassName}
      data-user-email={user.email}
    />
  ),
}));

import HomePage from "../app/page";

describe("Weather authenticated shell", () => {
  it("retains the app header and content without Home navigation", async () => {
    getCurrentUser.mockResolvedValue({ email: "ada@example.com" });

    const markup = renderToStaticMarkup(await HomePage());

    expect(markup).toContain('data-app-name="Weather"');
    expect(markup).toContain(`data-container-class=\"max-w-[76rem]\"`);
    expect(markup).toContain("<main");
    expect(markup).not.toContain("Go to Home");
    expect(markup).not.toContain("Compare the air around you.");
  });
});
