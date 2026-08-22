import React from "react";
import { LoginScreen, ProfileMenu } from "./auth-controls.jsx";
const user = {
  id: "user-1",
  email: "ada@example.com",
  name: "Ada Lovelace",
  avatarUrl: null,
};
const meta = {
  component: LoginScreen,
  title: "Authentication/Login",
};
export default meta;
export const GoogleOAuth = {
  args: {
    appName: "Factory",
    callbackPath: "/auth/callback",
  },
};
export const AccountMenu = {
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
