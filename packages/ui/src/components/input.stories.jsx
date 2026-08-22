import React from "react";
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
};
export default meta;
export const Default = { args: { placeholder: "Search a city" } };
export const Disabled = {
  args: { disabled: true, placeholder: "Unavailable" },
};
export const NarrowContainer = {
  args: { placeholder: "A very long location name still fits its container" },
  decorators: [
    (Story) => (
      <div className="w-56">
        <Story />
      </div>
    ),
  ],
};
