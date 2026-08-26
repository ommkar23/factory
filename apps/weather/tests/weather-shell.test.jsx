import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

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

const originalSharedOrigin = process.env.FACTORY_SHARED_ORIGIN;
const originalHomeUrl = process.env.FACTORY_HOME_URL;

afterEach(() => {
  getCurrentUser.mockReset();
  if (originalSharedOrigin === undefined)
    delete process.env.FACTORY_SHARED_ORIGIN;
  else process.env.FACTORY_SHARED_ORIGIN = originalSharedOrigin;
  if (originalHomeUrl === undefined) delete process.env.FACTORY_HOME_URL;
  else process.env.FACTORY_HOME_URL = originalHomeUrl;
});

describe("Weather authenticated shell", () => {
  it.each([
    ["true", undefined, "/"],
    [undefined, undefined, "http://localhost:3002"],
    [undefined, "https://home.example.test", "https://home.example.test"],
  ])(
    "renders the shared Go to Home link to %s-origin target %s",
    async (sharedOrigin, homeUrl, expectedHref) => {
      if (sharedOrigin === undefined) delete process.env.FACTORY_SHARED_ORIGIN;
      else process.env.FACTORY_SHARED_ORIGIN = sharedOrigin;
      if (homeUrl === undefined) delete process.env.FACTORY_HOME_URL;
      else process.env.FACTORY_HOME_URL = homeUrl;
      getCurrentUser.mockResolvedValue({ email: "ada@example.com" });

      const markup = renderToStaticMarkup(await HomePage());

      expect(markup).toContain('data-app-name="Weather"');
      expect(markup).toContain(`data-container-class=\"max-w-[76rem]\"`);
      expect(markup).toContain(`href="${expectedHref}"`);
      expect(markup).toContain("Go to Home");
      expect(markup).not.toContain("Compare the air around you.");
    },
  );
});
