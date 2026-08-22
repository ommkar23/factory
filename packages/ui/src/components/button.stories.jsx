import React from "react";
import { Spinner } from "./spinner.jsx";
import { Button } from "./button.jsx";
const meta = {
  component: Button,
  title: "Components/Button",
  parameters: { a11y: { test: "error" } },
  args: { children: "Save location" },
};
export default meta;
export const Default = {};
export const Disabled = {
  args: { children: "Save location", disabled: true },
};
export const Loading = {
  args: {
    "aria-busy": true,
    children: (
      <>
        <Spinner data-icon="inline-start" />
        Saving location
      </>
    ),
    disabled: true,
  },
};
export const HoverFocusVisibleAndActive = {
  args: {
    children: "Inspect interaction states",
    className: "focus-visible:ring-3 hover:bg-primary/80 active:translate-y-px",
  },
};
