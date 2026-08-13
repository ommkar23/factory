import type { Meta, StoryObj } from "@storybook/react-vite";

import { StatusMessage } from "./status-message";

const meta = {
  component: StatusMessage,
  title: "Components/StatusMessage",
} satisfies Meta<typeof StatusMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Information: Story = {
  args: { children: "Your changes are saved." },
};

export const Success: Story = {
  args: { children: "Photo Feed is ready.", tone: "success" },
};
