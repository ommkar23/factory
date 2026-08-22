import React from "react";
import { getAuthPath, getProductionOAuthCallbackUrl } from "@factory/auth";
import { getCurrentUser } from "@factory/auth/server";
import { LoginScreen } from "@factory/auth/ui";
import { redirect } from "next/navigation";
export default async function LoginPage({ searchParams }) {
  const [{ auth_error: authError }, user] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);
  if (user) {
    redirect(getAuthPath("", "/"));
  }
  return (
    <LoginScreen
      appName="Weather"
      authError={authError}
      callbackPath={getProductionOAuthCallbackUrl("/weather")}
    />
  );
}
