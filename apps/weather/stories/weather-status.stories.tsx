import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { WeatherStatus } from "../components/weather-status";

const visuallyHidden = {
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute" as const,
  width: "1px",
};

const meta = {
  component: WeatherStatus,
  decorators: [
    (Story: () => ReactNode) => (
      <main aria-label="Weather status preview">
        <h1 style={visuallyHidden}>Weather status</h1>
        <Story />
      </main>
    ),
  ],
  parameters: { a11y: { test: "error" } },
  title: "Weather/Status",
} satisfies Meta<typeof WeatherStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: { kind: "loading", message: "Searching locations…" },
};

export const Empty: Story = {
  args: { kind: "empty", message: "No locations matched “North Pole”." },
};

export const Error: Story = {
  args: {
    kind: "error",
    message: "Location search is temporarily unavailable.",
  },
};
