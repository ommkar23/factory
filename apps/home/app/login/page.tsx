import {
  getAuthMode,
  getAuthPath,
  getProductionOAuthCallbackUrl,
} from "@factory/auth";
import { getCurrentUser } from "@factory/auth/server";
import { LoginScreen } from "@factory/auth/ui";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams: Promise<{ auth_error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [{ auth_error: authError }, user] = await Promise.all([
    searchParams,
    getCurrentUser(),
  ]);

  if (user) {
    redirect(getAuthPath("", "/"));
  }

  return (
    <LoginScreen
      appName="Factory"
      authError={authError}
      callbackPath={getProductionOAuthCallbackUrl("/")}
      mode={getAuthMode()}
      returnTo={getAuthPath("", "/")}
    />
  );
}
