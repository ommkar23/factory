// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoginScreen, ProfileMenu } from "../src/auth-controls";

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
        {...({
          appName: "Weather",
          callbackPath: "/auth/callback",
          mode: "mock",
          returnTo: "/",
        } as never)}
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
        {...({
          appName: "Factory",
          authError: "oauth_callback_failed",
          callbackPath: "/auth/callback",
          mode: "mock",
          returnTo: "/",
        } as never)}
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "We couldn't complete your sign-in.",
    );
  });

  it("uses a profile trigger and exposes the logout action", () => {
    render(
      <ProfileMenu
        {...({ loginPath: "/login", mode: "mock", user } as never)}
      />,
    );

    const trigger = screen.getByRole("button", { name: "Open account menu" });
    expect(trigger.textContent).toBe("AL");
    fireEvent.click(trigger);
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
  });
});
