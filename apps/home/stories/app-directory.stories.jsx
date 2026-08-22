import React from "react";
import { AppDirectory } from "../components/app-directory";
const apps = [
  {
    description: "Browse the Live Splash photo feed.",
    href: "http://localhost:3000",
    id: "live-splash",
    name: "Live Splash",
  },
  {
    description: "Compare current weather across locations.",
    href: "http://localhost:3001",
    id: "weather",
    name: "Weather",
  },
];
const meta = {
  component: AppDirectory,
  parameters: { a11y: { test: "error" }, layout: "fullscreen" },
  title: "Home/AppDirectory",
};
export default meta;
export const Default = {
  args: { apps },
};
export const LongCopy = {
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
export const Mobile375 = {
  args: Default.args,
  parameters: { viewport: { defaultViewport: "mobile" } },
};
export const Desktop1280 = {
  args: Default.args,
  parameters: { viewport: { defaultViewport: "desktop" } },
};
