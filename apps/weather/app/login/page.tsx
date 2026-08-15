import { getAuthMode, getAuthPath, getRequestBasePath } from "@factory/auth";
import { getCurrentUser } from "@factory/auth/server";
import { LoginScreen } from "@factory/auth/ui";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams: Promise<{ auth_error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const appBasePath = getRequestBasePath("/weather");
  const [{ auth_error: authError }, user] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);

  if (user) {
    redirect(getAuthPath(appBasePath, "/"));
  }

  return (
    <LoginScreen
      appName="Weather"
      authError={authError}
      callbackPath={getAuthPath(appBasePath, "/auth/callback")}
      mode={getAuthMode()}
      returnTo={getAuthPath(appBasePath, "/")}
    />
  );
}
