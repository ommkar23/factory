// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoginScreen, ProfileMenu } from "../src/auth-controls";

const developmentUser = {
  id: "dev-user-0001",
  email: "dev-user@factory.local",
  name: "Factory Developer",
  avatarUrl: null,
};

describe("authentication UI", () => {
  it("presents the local development sign-in action", () => {
    render(
      <LoginScreen
        appName="Weather"
        callbackPath="/auth/callback"
        mode="mock"
        returnTo="/"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Continue as development user" }),
    ).toBeTruthy();
    expect(screen.getByText("Local development")).toBeTruthy();
  });

  it("presents Google OAuth outside development", () => {
    render(
      <LoginScreen
        appName="Factory"
        callbackPath="/auth/callback"
        mode="supabase"
        returnTo="/"
      />,
    );

    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeTruthy();
  });

  it("shows an OAuth callback error", () => {
    render(
      <LoginScreen
        appName="Factory"
        authError="oauth_callback_failed"
        callbackPath="/auth/callback"
        mode="supabase"
        returnTo="/"
      />,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "We couldn't complete your sign-in.",
    );
  });

  it("uses a profile trigger and exposes the logout action", () => {
    render(
      <ProfileMenu loginPath="/login" mode="mock" user={developmentUser} />,
    );

    const trigger = screen.getByRole("button", { name: "Open account menu" });
    expect(trigger.textContent).toBe("FD");
    fireEvent.click(trigger);
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeTruthy();
    expect(screen.getByText("dev-user@factory.local")).toBeTruthy();
  });
});
