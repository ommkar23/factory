import { describe, expect, it } from "vitest";

import {
  MAX_COMPARISON_LOCATIONS,
  type ComparisonEntry,
  type WeatherComparisonDataSource,
} from "../lib/weather-comparison";
import {
  clearDayConditions,
  selectedLocation,
} from "../fixtures/weather-fixtures";

describe("weather comparison contract", () => {
  it("models loading, ready, and error entries without stale conditions", () => {
    const entries: readonly ComparisonEntry[] = [
      { status: "loading", location: selectedLocation },
      {
        status: "ready",
        location: selectedLocation,
        conditions: clearDayConditions,
      },
      {
        status: "error",
        location: selectedLocation,
        error: new Error("Current conditions are unavailable."),
      },
    ];

    expect(MAX_COMPARISON_LOCATIONS).toBe(5);
    expect(entries.map((entry) => entry.status)).toEqual([
      "loading",
      "ready",
      "error",
    ]);
  });

  it("accepts a data source limited to current-condition retrieval", async () => {
    const dataSource: WeatherComparisonDataSource = {
      getCurrentConditions: async () => clearDayConditions,
    };

    await expect(
      dataSource.getCurrentConditions(selectedLocation),
    ).resolves.toEqual(clearDayConditions);
  });
});

// @ts-expect-error Loading comparison entries must not retain stale conditions.
const loadingEntryWithConditions: ComparisonEntry = {
  status: "loading",
  location: selectedLocation,
  conditions: clearDayConditions,
};

void loadingEntryWithConditions;
