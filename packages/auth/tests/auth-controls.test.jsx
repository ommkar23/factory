import React from "react";
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LoginScreen, ProfileMenu } from "../src/auth-controls";
const originalNodeEnv = process.env.NODE_ENV;
afterEach(() => {
  cleanup();
  process.env.NODE_ENV = originalNodeEnv;
});
const user = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada Lovelace",
  avatarUrl: null,
};
describe("authentication UI", () => {
  it("presents only Google OAuth when passed the legacy mock mode", () => {
    render(
      <LoginScreen
        {...{
          appName: "Weather",
          callbackPath: "/auth/callback",
          mode: "mock",
          returnTo: "/",
        }}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeTruthy();
    expect(screen.queryByText("Local development")).toBeNull();
    expect(screen.queryByText(/mock session/i)).toBeNull();
  });
  it("shows an OAuth callback error", () => {
    render(
      <LoginScreen
        {...{
          appName: "Factory",
          authError: "oauth_callback_failed",
          callbackPath: "/auth/callback",
          mode: "mock",
          returnTo: "/",
        }}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "We couldn't complete your sign-in.",
    );
  });
  it("does not expose sign-out while development authentication is bypassed", () => {
    process.env.NODE_ENV = "development";
    render(<ProfileMenu loginPath="/login" user={user} />);
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    expect(screen.queryByRole("menuitem", { name: "Sign out" })).toBeNull();
  });
  it("uses a profile trigger and exposes the logout action", () => {
    render(<ProfileMenu {...{ loginPath: "/login", mode: "mock", user }} />);
    const trigger = screen.getByRole("button", { name: "Open account menu" });
    expect(trigger.textContent).toBe("AL");
    fireEvent.click(trigger);
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
  });
});
