import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AppDirectory } from "../components/app-directory";
import type { AppDirectoryEntry } from "../lib/app-directory";

const apps: readonly AppDirectoryEntry[] = [
  {
    description: "Browse the Live Splash photo feed.",
    href: "https://live-splash.example.test",
    id: "live-splash",
    name: "Live Splash",
  },
  {
    description: "Compare current weather across locations.",
    href: "https://weather.example.test",
    id: "weather",
    name: "Weather",
  },
];

afterEach(cleanup);

describe("AppDirectory", () => {
  it("renders a named app navigation list with configured links", () => {
    render(<AppDirectory apps={apps} />);

    expect(screen.getByRole("heading", { name: "Factory Home" })).toBeTruthy();
    expect(
      screen.getByRole("navigation", { name: "Applications" }),
    ).toBeTruthy();
    expect(screen.getByRole("list").children).toHaveLength(2);
    expect(
      screen
        .getByRole("link", { name: "Open Live Splash" })
        .getAttribute("href"),
    ).toBe("https://live-splash.example.test");
    expect(
      screen.getByRole("link", { name: "Open Weather" }).getAttribute("href"),
    ).toBe("https://weather.example.test");
  });

  it("keeps long app names and descriptions available to readers", () => {
    const longApp: AppDirectoryEntry = {
      description:
        "A longer description that confirms the app selection card keeps its complete content available to readers.",
      href: "https://example.test",
      id: "weather",
      name: "Weather",
    };

    render(<AppDirectory apps={[longApp]} />);

    expect(screen.getByText(longApp.description)).toBeTruthy();
  });
});
