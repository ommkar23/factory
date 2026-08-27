import React from "react";
import { getAuthPath, getLoginPath, getRequestBasePath } from "@factory/auth";
import { getCurrentUser } from "@factory/auth/server";
import { AppHeader } from "@factory/auth/ui";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const appBasePath = getRequestBasePath("/live-splash");
  const user = await getCurrentUser();
  if (!user) {
    redirect(getLoginPath(""));
  }
  return (
    <>
      <AppHeader
        appName="Live Splash"
        containerClassName="max-w-xl"
        loggedOutPath={getAuthPath(appBasePath, "/logged-out")}
        loginPath={getLoginPath(appBasePath)}
        user={user}
      />
      <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12 lg:px-8" />
    </>
  );
}
