import React from "react";
import { StatusMessage } from "./status-message";
const meta = {
  component: StatusMessage,
  title: "Components/StatusMessage",
  parameters: { a11y: { test: "error" } },
};
export default meta;
export const Information = {
  args: { children: "Your changes are saved." },
};
export const Success = {
  args: { children: "Live Splash is ready.", tone: "success" },
};
export const Warning = {
  args: { children: "Weather data may be out of date.", tone: "warning" },
};
export const Error = {
  args: { children: "Unable to load the latest conditions.", tone: "error" },
};
export const LongContentInNarrowContainer = {
  args: {
    children:
      "A long but actionable message remains readable in narrow weather and photo feed layouts without introducing horizontal overflow.",
    tone: "warning",
  },
  decorators: [
    (Story) => (
      <div className="w-56">
        <Story />
      </div>
    ),
  ],
};
