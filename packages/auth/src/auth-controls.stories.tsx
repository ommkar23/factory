import type { Meta, StoryObj } from "@storybook/react-vite";

import { LoginScreen, ProfileMenu } from "./auth-controls";

const developmentUser = {
  id: "dev-user-0001",
  email: "dev-user@factory.local",
  name: "Factory Developer",
  avatarUrl: null,
};

const meta = {
  component: LoginScreen,
  title: "Authentication/Login",
} satisfies Meta<typeof LoginScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LocalDevelopment: Story = {
  args: {
    appName: "Weather",
    callbackPath: "/auth/callback",
    mode: "mock",
    returnTo: "/",
  },
};

export const GoogleOAuth: Story = {
  args: {
    appName: "Factory",
    callbackPath: "/auth/callback",
    mode: "supabase",
    returnTo: "/",
  },
};

export const AccountMenu: Story = {
  args: {
    appName: "Factory",
    callbackPath: "/auth/callback",
    mode: "mock",
    returnTo: "/",
  },
  render: () => (
    <div className="flex justify-end p-8">
      <ProfileMenu loginPath="/login" mode="mock" user={developmentUser} />
    </div>
  ),
};
