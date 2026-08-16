import {
  getAuthMode,
  getAuthPath,
  getProductionOAuthCallbackUrl,
  getRequestBasePath,
} from "@factory/auth";
import { getCurrentUser } from "@factory/auth/server";
import { LoginScreen } from "@factory/auth/ui";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams: Promise<{ auth_error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const appBasePath = getRequestBasePath("/live-splash");
  const [{ auth_error: authError }, user] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);

  if (user) {
    redirect(getAuthPath("", "/"));
  }

  return (
    <LoginScreen
      appName="Live Splash"
      authError={authError}
      callbackPath={getProductionOAuthCallbackUrl("/live-splash")}
      mode={getAuthMode()}
      returnTo={getAuthPath(appBasePath, "/")}
    />
  );
}
