import type { Meta, StoryObj } from "@storybook/react-vite";

import { LoginScreen, ProfileMenu } from "./auth-controls";

const user = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada Lovelace",
  avatarUrl: null,
};

const meta = {
  component: LoginScreen,
  title: "Authentication/Login",
} satisfies Meta<typeof LoginScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GoogleOAuth: Story = {
  args: {
    appName: "Factory",
    callbackPath: "/auth/callback",
  },
};

export const AccountMenu: Story = {
  args: {
    appName: "Factory",
    callbackPath: "/auth/callback",
  },
  render: () => (
    <div className="flex justify-end p-8">
      <ProfileMenu loginPath="/login" user={user} />
    </div>
  ),
};
