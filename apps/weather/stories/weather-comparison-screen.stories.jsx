import React from "react";
import { WeatherComparisonScreen } from "../components/weather-comparison-screen";
import {
  comparisonLocations,
  readyComparisonEntries,
} from "../fixtures/weather-fixtures";
const callbacks = {
  onQueryChange: () => {},
  onRemoveLocation: () => {},
  onRetryLocation: () => {},
  onSelectLocation: () => {},
};
const longLocation = {
  ...comparisonLocations[0],
  id: "long-comparison-location",
  name: "Llanfairpwllgwyngyll",
  region: "Isle of Anglesey, Wales, United Kingdom",
};
const meta = {
  component: WeatherComparisonScreen,
  parameters: { a11y: { test: "error" }, layout: "fullscreen" },
  title: "Weather/ComparisonScreen",
};
export default meta;
export const Empty = {
  args: {
    ...callbacks,
    comparisonCount: 0,
    comparisonLimit: 5,
    entries: [],
    searchQuery: "",
    searchResults: [],
    searchState: "default",
  },
};
export const OneReady = {
  args: {
    ...callbacks,
    comparisonCount: 1,
    comparisonLimit: 5,
    entries: readyComparisonEntries.slice(0, 1),
    searchQuery: "",
    searchResults: [],
    searchState: "default",
  },
};
export const MixedLoadingError = {
  args: {
    ...callbacks,
    comparisonCount: 3,
    comparisonLimit: 5,
    entries: [
      readyComparisonEntries[0],
      { location: comparisonLocations[1], status: "loading" },
      {
        error: new Error("Fixture request failed"),
        location: comparisonLocations[2],
        status: "error",
      },
    ],
    searchQuery: "",
    searchResults: [],
    searchState: "default",
  },
};
export const FullFiveLocations = {
  args: {
    ...callbacks,
    comparisonCount: 5,
    comparisonLimit: 5,
    entries: readyComparisonEntries,
    searchAnnouncement:
      "Comparison limit reached. Remove a location before adding another.",
    searchQuery: "",
    searchResults: [],
    searchState: "default",
  },
};
export const DuplicateAndLimitResults = {
  args: {
    ...callbacks,
    comparisonCount: 5,
    comparisonLimit: 5,
    entries: readyComparisonEntries,
    searchAnnouncement:
      "Comparison limit reached. Remove a location before adding another.",
    searchQuery: "Portland",
    searchResults: [
      {
        eligibility: "already-added",
        location: comparisonLocations[0],
      },
      { eligibility: "available", location: comparisonLocations[1] },
      {
        eligibility: "limit-reached",
        location: comparisonLocations[2],
      },
    ],
    searchState: "results",
  },
};
export const LongLocationName = {
  args: {
    ...callbacks,
    comparisonCount: 1,
    comparisonLimit: 5,
    entries: [
      {
        conditions: readyComparisonEntries[0].conditions,
        location: longLocation,
        status: "ready",
      },
    ],
    searchQuery: "Llanfair",
    searchResults: [{ eligibility: "available", location: longLocation }],
    searchState: "results",
  },
};
export const Mobile375 = {
  args: LongLocationName.args,
  parameters: { viewport: { defaultViewport: "mobile" } },
};
export const Tablet768 = {
  args: FullFiveLocations.args,
  parameters: { viewport: { defaultViewport: "tablet" } },
};
export const Desktop1280 = {
  args: FullFiveLocations.args,
  parameters: { viewport: { defaultViewport: "desktop" } },
};
