import React from "react";
import { expect } from "storybook/test";
import LiveSplashHome from "../app/page";
const meta = {
  component: LiveSplashHome,
  parameters: { a11y: { test: "error" }, layout: "fullscreen" },
  tags: ["ai-generated", "needs-work"],
  title: "Live Splash/Home",
};
export default meta;
export const Default = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Live Splash" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("region", { name: "Current state" }),
    ).toBeVisible();
  },
};
export const CssCheck = {
  play: async ({ canvas }) => {
    await expect(getComputedStyle(canvas.getByRole("main")).minHeight).toBe(
      "100vh",
    );
  },
};
