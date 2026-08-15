import type { Meta, StoryObj } from "@storybook/react-vite";

import { Alert, AlertDescription, AlertTitle } from "./alert";

const meta = {
  component: Alert,
  title: "Components/Alert",
  parameters: { a11y: { test: "error" } },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Information: Story = {
  render: () => (
    <Alert className="max-w-md">
      <AlertTitle>Weather data is delayed</AlertTitle>
      <AlertDescription>
        Showing the most recently available conditions.
      </AlertDescription>
    </Alert>
  ),
};

export const Error: Story = {
  render: () => (
    <Alert className="max-w-md" variant="destructive">
      <AlertTitle>Unable to update this location</AlertTitle>
      <AlertDescription>Check your connection and retry.</AlertDescription>
    </Alert>
  ),
};
