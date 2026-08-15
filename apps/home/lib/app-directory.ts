export type AppDirectoryEntry = Readonly<{
  description: string;
  href: string;
  id: "live-splash" | "weather";
  name: "Live Splash" | "Weather";
}>;

type AppDirectoryEnvironment = Readonly<Record<string, string | undefined>>;

const DEFAULT_LIVE_SPLASH_URL = "http://localhost:3000";
const DEFAULT_WEATHER_URL = "http://localhost:3001";

export function getAppDirectory(
  environment: AppDirectoryEnvironment = process.env,
): readonly AppDirectoryEntry[] {
  return [
    {
      description: "Browse the Live Splash photo feed.",
      href: resolveAppUrl(
        "LIVE_SPLASH_URL",
        environment.LIVE_SPLASH_URL,
        DEFAULT_LIVE_SPLASH_URL,
      ),
      id: "live-splash",
      name: "Live Splash",
    },
    {
      description: "Compare current weather across locations.",
      href: resolveAppUrl(
        "WEATHER_URL",
        environment.WEATHER_URL,
        DEFAULT_WEATHER_URL,
      ),
      id: "weather",
      name: "Weather",
    },
  ];
}

function resolveAppUrl(
  name: "LIVE_SPLASH_URL" | "WEATHER_URL",
  value: string | undefined,
  defaultValue: string,
) {
  if (value === undefined) {
    return defaultValue;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute HTTP(S) URL.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${name} must be an absolute HTTP(S) URL.`);
  }

  return value;
}
