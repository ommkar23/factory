import React from "react";
import {
  FactoryAppHeader,
  FactoryLogin,
  FactoryProfileMenu,
} from "./factory-auth.jsx";

const profile = {
  accountLabel: "Ada Lovelace",
  avatarUrl: null,
  email: "ada@example.com",
  initials: "AL",
  onSignOut: () => {},
};

const meta = {
  component: FactoryLogin,
  parameters: { layout: "fullscreen" },
  title: "Factory/Authentication",
};

export default meta;

export const Login = {
  args: {
    appName: "Weather",
    onSignIn: () => {},
  },
};

export const LoginPending = {
  args: {
    ...Login.args,
    pending: true,
  },
};

export const LoginError = {
  args: {
    ...Login.args,
    authError: "We couldn't complete your sign-in. Please try again.",
  },
};

export const DevelopmentBootstrap = {
  args: {
    appName: "Weather",
    isDevelopment: true,
  },
};

export const DevelopmentBootstrapError = {
  args: {
    ...DevelopmentBootstrap.args,
    bootstrapError: true,
  },
};

export const Profile = {
  render: () => (
    <div className="flex min-h-64 justify-center bg-background p-8">
      <FactoryProfileMenu {...profile} defaultOpen />
    </div>
  ),
};

export const LogoutPending = {
  render: () => (
    <div className="flex min-h-64 justify-center bg-background p-8">
      <FactoryProfileMenu {...profile} defaultOpen pending />
    </div>
  ),
};

export const LogoutError = {
  render: () => (
    <div className="flex min-h-64 justify-center bg-background p-8">
      <FactoryProfileMenu
        {...profile}
        defaultOpen
        error="Factory API logout failed."
      />
    </div>
  ),
};

export const ResponsiveHeader = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  render: () => (
    <FactoryAppHeader appName="Live Splash" className="max-w-5xl">
      <FactoryProfileMenu {...profile} />
    </FactoryAppHeader>
  ),
};
