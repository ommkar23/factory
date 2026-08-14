import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appFile = (path) => new URL(`../${path}`, import.meta.url);

test("Weather app presents the app-local comparison screen without integrations", async () => {
  const [layout, page, styles, screen, comparisonScreen] = await Promise.all([
    readFile(appFile("app/layout.tsx"), "utf8"),
    readFile(appFile("app/page.tsx"), "utf8"),
    readFile(appFile("app/globals.css"), "utf8"),
    readFile(appFile("components/weather-screen.tsx"), "utf8"),
    readFile(appFile("components/weather-comparison-screen.tsx"), "utf8"),
  ]);

  assert.match(layout, /title:\s*"Weather"/);
  assert.match(layout, /<html lang="en">/);
  assert.match(page, /WeatherScreen/);
  assert.match(screen, /WeatherComparisonScreen/);
  assert.match(comparisonScreen, /<main[^>]*>/);
  assert.match(comparisonScreen, /<h1>Compare the air around you\.<\/h1>/);
  assert.doesNotMatch(
    `${page}\n${screen}\n${comparisonScreen}`,
    /fetch\s*\(|openweathermap|geolocation|forecast|localStorage|sessionStorage/i,
  );
  assert.match(styles, /min-width: 20rem/);
});
