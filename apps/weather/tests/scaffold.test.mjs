import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appFile = (path) => new URL(`../${path}`, import.meta.url);

test("Weather app presents a named, accessible placeholder without weather integrations", async () => {
  const [layout, page, styles] = await Promise.all([
    readFile(appFile("app/layout.tsx"), "utf8"),
    readFile(appFile("app/page.tsx"), "utf8"),
    readFile(appFile("app/globals.css"), "utf8"),
  ]);

  assert.match(layout, /title:\s*"Weather"/);
  assert.match(layout, /description:\s*"A weather app is coming soon\."/);
  assert.match(layout, /<html lang="en">/);
  assert.match(page, /<main[^>]*>/);
  assert.match(page, /<h1[^>]*>Weather<\/h1>/);
  assert.match(page, /Weather forecasts will appear here soon\./);
  assert.doesNotMatch(
    page,
    /fetch\s*\(|weatherapi|openweathermap|geolocation|location search/i,
  );
  assert.match(styles, /@media \(max-width: 40rem\)/);
});
