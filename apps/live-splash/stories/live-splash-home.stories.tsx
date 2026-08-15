import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";

import LiveSplashHome from "../app/page";

const meta = {
  component: LiveSplashHome,
  parameters: { a11y: { test: "error" }, layout: "fullscreen" },
  tags: ["ai-generated", "needs-work"],
  title: "Live Splash/Home",
} satisfies Meta<typeof LiveSplashHome>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { name: "Live Splash" }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("region", { name: "Current state" }),
    ).toBeVisible();
  },
};

export const CssCheck: Story = {
  play: async ({ canvas }) => {
    await expect(getComputedStyle(canvas.getByRole("main")).minHeight).toBe(
      "100vh",
    );
  },
};
