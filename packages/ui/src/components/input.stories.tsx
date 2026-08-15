import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "./input";
import { Label } from "./label";

const meta = {
  component: Input,
  title: "Components/Input",
  parameters: { a11y: { test: "error" } },
  render: (args) => (
    <div className="flex w-full max-w-sm flex-col gap-2">
      <Label htmlFor="story-location">Location</Label>
      <Input id="story-location" {...args} />
    </div>
  ),
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { placeholder: "Search a city" } };
export const Disabled: Story = {
  args: { disabled: true, placeholder: "Unavailable" },
};
export const NarrowContainer: Story = {
  args: { placeholder: "A very long location name still fits its container" },
  decorators: [
    (Story) => (
      <div className="w-56">
        <Story />
      </div>
    ),
  ],
};
