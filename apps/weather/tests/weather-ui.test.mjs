import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appFile = (path) => new URL(`../${path}`, import.meta.url);

async function readWeatherUi() {
  const paths = [
    "components/location-search.tsx",
    "components/current-conditions-card.tsx",
    "components/weather-status.tsx",
    "components/weather-screen.tsx",
    "components/weather-ui.module.css",
    "fixtures/weather-fixtures.ts",
    "stories/location-search.stories.tsx",
    "stories/current-conditions-card.stories.tsx",
    "stories/weather-status.stories.tsx",
    "stories/weather-screen.stories.tsx",
  ];

  return Promise.all(paths.map((path) => readFile(appFile(path), "utf8")));
}

test("Weather UI keeps deterministic accessible components and stories app-local", async () => {
  const [
    locationSearch,
    currentConditions,
    weatherStatus,
    weatherScreen,
    styles,
    fixtures,
    locationStories,
    conditionsStories,
    statusStories,
    screenStories,
  ] = await readWeatherUi();

  assert.match(locationSearch, /^"use client";/);
  assert.match(weatherScreen, /^"use client";/);
  assert.match(locationSearch, /export type LocationSearchProps/);
  assert.match(locationSearch, /useId/);
  assert.doesNotMatch(locationSearch, /weather-location-results/);
  assert.match(locationSearch, /<label/);
  assert.match(locationSearch, /role="listbox"/);
  assert.match(locationSearch, /role="option"/);
  assert.match(locationSearch, /onSelect/);
  assert.match(locationSearch, /onKeyDown={handleInputKeyDown}/);
  assert.match(locationSearch, /aria-activedescendant/);
  assert.match(locationSearch, /aria-autocomplete="list"/);
  assert.match(locationSearch, /autoComplete="off"/);
  assert.match(locationSearch, /name="location-search"/);
  assert.match(locationSearch, /placeholder="Try Portland, Maine…"/);
  assert.match(locationSearch, /Search city or postal code/);
  assert.doesNotMatch(locationSearch, /airport/i);
  assert.match(locationSearch, /event.key === "ArrowDown"/);
  assert.match(locationSearch, /event.key === "Enter"/);
  assert.match(locationSearch, /tabIndex={-1}/);
  assert.match(locationSearch, /const isActive = index === safeActiveIndex/);
  assert.match(locationSearch, /aria-selected={isActive}/);
  assert.match(
    locationSearch,
    /onClick=\{\(\) => \{\s*setActiveIndex\(index\);\s*onSelect\(location\);/,
  );
  assert.match(styles, /\.resultButton\[data-active="true"\]/);

  assert.match(currentConditions, /export type CurrentConditions/);
  assert.match(currentConditions, /observedAt/);
  assert.match(currentConditions, /temperatureC/);
  assert.match(currentConditions, /condition\.label/);
  assert.match(currentConditions, /km\/h/);
  assert.match(currentConditions, /mm/);
  assert.match(currentConditions, /Feels like/);
  assert.match(currentConditions, /Humidity/);
  assert.match(currentConditions, /Precipitation/);
  assert.match(currentConditions, /Wind/);

  assert.match(
    weatherStatus,
    /role=\{kind === "error" \? "alert" : "status"\}/,
  );
  assert.match(weatherStatus, /aria-live="polite"/);
  assert.match(weatherScreen, /LocationSearch/);
  assert.match(weatherScreen, /CurrentConditionsCard/);
  assert.match(weatherScreen, /selectionAnnouncement/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@media \(max-width: 30rem\)/);

  assert.match(fixtures, /selectedLocation/);
  assert.match(locationStories, /Default/);
  assert.match(locationStories, /Loading/);
  assert.match(locationStories, /Results/);
  assert.match(locationStories, /NoResults/);
  assert.match(locationStories, /Error/);
  assert.match(locationStories, /Selected/);
  assert.match(conditionsStories, /Daytime/);
  assert.match(conditionsStories, /Nighttime/);
  assert.match(conditionsStories, /Unknown/);
  assert.match(statusStories, /Loading/);
  assert.match(statusStories, /Empty/);
  assert.match(statusStories, /Error/);
  assert.match(screenStories, /Composed/);
  assert.match(screenStories, /apiClient: storyApiClient/);

  const source = [
    locationSearch,
    currentConditions,
    weatherStatus,
    weatherScreen,
    fixtures,
    locationStories,
    conditionsStories,
    statusStories,
    screenStories,
  ].join("\n");
  assert.doesNotMatch(
    source,
    /fetch\s*\(|open-meteo|openweathermap|geolocation|forecast|localStorage|sessionStorage|auth/i,
  );
});
