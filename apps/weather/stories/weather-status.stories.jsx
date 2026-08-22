import React from "react";
import { WeatherStatus } from "../components/weather-status";
const visuallyHidden = {
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  width: "1px",
};
const meta = {
  component: WeatherStatus,
  decorators: [
    (Story) => (
      <main aria-label="Weather status preview">
        <h1 style={visuallyHidden}>Weather status</h1>
        <Story />
      </main>
    ),
  ],
  parameters: { a11y: { test: "error" } },
  title: "Weather/Status",
};
export default meta;
export const Loading = {
  args: { kind: "loading", message: "Searching locations…" },
};
export const Empty = {
  args: { kind: "empty", message: "No locations matched “North Pole”." },
};
export const Error = {
  args: {
    kind: "error",
    message: "Location search is temporarily unavailable.",
  },
};
