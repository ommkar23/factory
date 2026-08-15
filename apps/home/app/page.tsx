import { getAuthMode, getLoginPath } from "@factory/auth";
import { getCurrentUser } from "@factory/auth/server";
import { AppHeader } from "@factory/auth/ui";
import { redirect } from "next/navigation";

import { AppDirectory } from "../components/app-directory";
import { getAppDirectory } from "../lib/app-directory";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(getLoginPath(""));
  }

  return (
    <>
      <AppHeader
        appName="Factory"
        containerClassName="max-w-5xl"
        loginPath={getLoginPath("")}
        mode={getAuthMode()}
        user={user}
      />
      <AppDirectory apps={getAppDirectory()} />
    </>
  );
}
