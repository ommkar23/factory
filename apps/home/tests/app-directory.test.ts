import { describe, expect, it } from "vitest";

import { getAppDirectory } from "../lib/app-directory";

describe("getAppDirectory", () => {
  it("lists Live Splash and Weather at their local development URLs", () => {
    expect(getAppDirectory({})).toEqual([
      {
        description: "Browse the Live Splash photo feed.",
        href: "http://localhost:3000",
        id: "live-splash",
        name: "Live Splash",
      },
      {
        description: "Compare current weather across locations.",
        href: "http://localhost:3001",
        id: "weather",
        name: "Weather",
      },
    ]);
  });

  it("uses valid configured URLs without changing the app identities", () => {
    expect(
      getAppDirectory({
        LIVE_SPLASH_URL: "https://live-splash.example.test",
        WEATHER_URL: "https://weather.example.test/compare",
      }),
    ).toMatchObject([
      {
        href: "https://live-splash.example.test",
        id: "live-splash",
        name: "Live Splash",
      },
      {
        href: "https://weather.example.test/compare",
        id: "weather",
        name: "Weather",
      },
    ]);
  });

  it("rejects configured URLs that are not absolute HTTP(S) URLs", () => {
    expect(() => getAppDirectory({ LIVE_SPLASH_URL: "/live-splash" })).toThrow(
      "LIVE_SPLASH_URL must be an absolute HTTP(S) URL.",
    );
  });
});
