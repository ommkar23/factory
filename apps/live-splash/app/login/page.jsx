import React from "react";
import { getAuthPath, getSafeReturnPath } from "@factory/auth";
import { getCurrentUser } from "@factory/auth/server";
import { LoginScreen } from "@factory/auth/ui";
import { redirect } from "next/navigation";

export default async function LoginPage({ searchParams }) {
  const [{ auth_error: authError, next }, user] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);
  const returnTo = getSafeReturnPath(next, ["/", "/live-splash"], "/");
  if (user) {
    redirect(getAuthPath("", returnTo));
  }
  return (
    <LoginScreen
      appName="Live Splash"
      authError={authError}
      autoBootstrap={process.env.FACTORY_DEV_AUTH_BOOTSTRAP === "true"}
      returnTo={returnTo}
    />
  );
}
