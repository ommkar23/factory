import { getAuthMode, getLoginPath, getRequestBasePath } from "@factory/auth";
import { getCurrentUser } from "@factory/auth/server";
import { AppHeader } from "@factory/auth/ui";
import { redirect } from "next/navigation";

import { WeatherScreen } from "../components/weather-screen";

export default async function HomePage() {
  const appBasePath = getRequestBasePath("/weather");
  const user = await getCurrentUser();

  if (!user) {
    redirect(getLoginPath(appBasePath));
  }

  return (
    <>
      <AppHeader
        appName="Weather"
        containerClassName="max-w-[76rem]"
        loginPath={getLoginPath(appBasePath)}
        mode={getAuthMode()}
        user={user}
      />
      <WeatherScreen />
    </>
  );
}
