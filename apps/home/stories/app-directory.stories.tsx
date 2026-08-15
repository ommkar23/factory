import type { Meta, StoryObj } from "@storybook/react-vite";

import { AppDirectory } from "../components/app-directory";

const apps = [
  {
    description: "Browse the Live Splash photo feed.",
    href: "http://localhost:3000",
    id: "live-splash" as const,
    name: "Live Splash" as const,
  },
  {
    description: "Compare current weather across locations.",
    href: "http://localhost:3001",
    id: "weather" as const,
    name: "Weather" as const,
  },
];

const meta = {
  component: AppDirectory,
  parameters: { a11y: { test: "error" }, layout: "fullscreen" },
  title: "Home/AppDirectory",
} satisfies Meta<typeof AppDirectory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { apps },
};

export const LongCopy: Story = {
  args: {
    apps: [
      {
        ...apps[0],
        description:
          "Browse the Live Splash photo feed and see the latest imagery from the collection.",
      },
      {
        ...apps[1],
        description:
          "Compare current weather conditions across locations with names and regional descriptions of any length.",
      },
    ],
  },
};

export const Mobile375: Story = {
  args: Default.args,
  parameters: { viewport: { defaultViewport: "mobile" } },
};

export const Desktop1280: Story = {
  args: Default.args,
  parameters: { viewport: { defaultViewport: "desktop" } },
};
