import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@factory/auth/server", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({
    id: "dev-user-0001",
    email: "dev-user@factory.local",
    name: "Factory Developer",
    avatarUrl: null,
  }),
}));
import HomePage from "../app/page";
afterEach(cleanup);
describe("Factory Home route", () => {
  it("renders the configured local app directory for an authenticated user", async () => {
    render(await HomePage());
    expect(screen.getByRole("heading", { name: "Factory Home" })).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Open Live Splash" })
        .getAttribute("href"),
    ).toBe("http://localhost:3000");
    expect(
      screen.getByRole("link", { name: "Open Weather" }).getAttribute("href"),
    ).toBe("http://localhost:3001");
  });
});
