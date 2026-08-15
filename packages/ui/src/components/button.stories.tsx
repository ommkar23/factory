import type { Meta, StoryObj } from "@storybook/react-vite";

import { Spinner } from "./spinner";
import { Button } from "./button";

const meta = {
  component: Button,
  title: "Components/Button",
  parameters: { a11y: { test: "error" } },
  args: { children: "Save location" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { children: "Save location", disabled: true },
};

export const Loading: Story = {
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

export const HoverFocusVisibleAndActive: Story = {
  args: {
    children: "Inspect interaction states",
    className: "focus-visible:ring-3 hover:bg-primary/80 active:translate-y-px",
  },
};
