const DEFAULT_LIVE_SPLASH_URL = "http://localhost:3000";
const DEFAULT_WEATHER_URL = "http://localhost:3001";
export function getAppDirectory(environment = process.env) {
  const sharedOrigin = environment.FACTORY_SHARED_ORIGIN === "true";
  return [
    {
      description: "Browse the Live Splash photo feed.",
      href: sharedOrigin
        ? "/live-splash"
        : resolveAppUrl(
            "LIVE_SPLASH_URL",
            environment.LIVE_SPLASH_URL,
            DEFAULT_LIVE_SPLASH_URL,
          ),
      id: "live-splash",
      name: "Live Splash",
    },
    {
      description: "Compare current weather across locations.",
      href: sharedOrigin
        ? "/weather"
        : resolveAppUrl(
            "WEATHER_URL",
            environment.WEATHER_URL,
            DEFAULT_WEATHER_URL,
          ),
      id: "weather",
      name: "Weather",
    },
  ];
}
function resolveAppUrl(name, value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }
  let url;
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
