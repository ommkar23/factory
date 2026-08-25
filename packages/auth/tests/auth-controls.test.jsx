import React from "react";
// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginScreen, ProfileMenu } from "../src/auth-controls";
const originalNodeEnv = process.env.NODE_ENV;
afterEach(() => {
  cleanup();
  process.env.NODE_ENV = originalNodeEnv;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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
  it("automatically bootstraps one same-origin local session before navigating in development", async () => {
    process.env.NODE_ENV = "development";
    const replace = vi.fn();
    const originalWindow = window;
    vi.stubGlobal(
      "window",
      new Proxy(originalWindow, {
        get(target, property) {
          if (property === "location") return { replace };
          return Reflect.get(target, property);
        },
      }),
    );
    let resolveBootstrap;
    const bootstrap = new Promise((resolve) => {
      resolveBootstrap = resolve;
    });
    const fetch = vi.fn(() => bootstrap);
    vi.stubGlobal("fetch", fetch);

    render(<LoginScreen appName="Weather" returnTo="/weather" />);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/auth/dev/bootstrap", {
      credentials: "same-origin",
      method: "POST",
    });
    expect(
      screen.getByText("Preparing your local development session…"),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Continue with Google" }),
    ).toBeNull();

    resolveBootstrap({ ok: true });

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/weather");
    });
  });
  it("keeps Google OAuth available and never bootstraps in production", () => {
    process.env.NODE_ENV = "production";
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    render(<LoginScreen appName="Weather" returnTo="/weather" />);

    expect(fetch).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeTruthy();
  });
  it("shows a safe actionable local error without redirecting after bootstrap failure", async () => {
    process.env.NODE_ENV = "development";
    const replace = vi.fn();
    const originalWindow = window;
    vi.stubGlobal(
      "window",
      new Proxy(originalWindow, {
        get(target, property) {
          if (property === "location") return { replace };
          return Reflect.get(target, property);
        },
      }),
    );
    const fetch = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetch);

    render(<LoginScreen appName="Weather" returnTo="/weather" />);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Unable to start your local development session.",
      );
    });
    expect(screen.getByRole("alert").textContent).toContain(
      "Check that the local development services are running, then refresh.",
    );
    expect(replace).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("button", { name: "Continue with Google" }),
    ).toBeNull();
  });
  it("shows an OAuth callback error", () => {
    render(
      <LoginScreen
        {...{
          appName: "Factory",
          authError: "oauth_callback_failed",
          returnTo: "/",
        }}
      />,
    );
    expect(screen.getByRole("alert").textContent).toContain(
      "We couldn't complete your sign-in.",
    );
  });
  it("exposes sign-out in development because browser authentication is never bypassed", () => {
    process.env.NODE_ENV = "development";
    render(<ProfileMenu loginPath="/login" user={user} />);
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeTruthy();
  });
  it("uses a profile trigger and exposes the logout action", () => {
    render(<ProfileMenu loginPath="/login" user={user} />);
    const trigger = screen.getByRole("button", { name: "Open account menu" });
    expect(trigger.textContent).toBe("AL");
    fireEvent.click(trigger);
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeTruthy();
    expect(screen.getByText("ada@example.com")).toBeTruthy();
  });
  it("redirects to the app logged-out page after a successful logout", async () => {
    const replace = vi.fn();
    const originalWindow = window;
    vi.stubGlobal(
      "window",
      new Proxy(originalWindow, {
        get(target, property) {
          if (property === "location") return { replace };
          return Reflect.get(target, property);
        },
      }),
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    render(
      <ProfileMenu
        loggedOutPath="/weather/logged-out"
        loginPath="/weather/login"
        user={user}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open account menu" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/weather/logged-out");
    });
  });
});
