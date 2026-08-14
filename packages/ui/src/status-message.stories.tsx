import type { Meta, StoryObj } from "@storybook/react-vite";

import { StatusMessage } from "./status-message";

const meta = {
  component: StatusMessage,
  title: "Components/StatusMessage",
  parameters: { a11y: { test: "error" } },
} satisfies Meta<typeof StatusMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Information: Story = {
  args: { children: "Your changes are saved." },
};
export const Success: Story = {
  args: { children: "Photo Feed is ready.", tone: "success" },
};
export const Warning: Story = {
  args: { children: "Weather data may be out of date.", tone: "warning" },
};
export const Error: Story = {
  args: { children: "Unable to load the latest conditions.", tone: "error" },
};
export const LongContentInNarrowContainer: Story = {
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
