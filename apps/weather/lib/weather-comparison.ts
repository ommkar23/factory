import type { WeatherApiClient } from "./weather-api-client";
import type { CurrentConditions, Location } from "./weather-domain";

export const MAX_COMPARISON_LOCATIONS = 5;

export type ComparisonEntryStatus = "loading" | "ready" | "error";

export type ComparisonEntry =
  | {
      status: "loading";
      location: Location;
      conditions?: never;
      error?: never;
    }
  | {
      status: "ready";
      location: Location;
      conditions: CurrentConditions;
      error?: never;
    }
  | {
      status: "error";
      location: Location;
      conditions?: never;
      error: Error;
    };

export type AddLocationOutcome = "added" | "duplicate" | "limit";

export type WeatherComparisonDataSource = Pick<
  WeatherApiClient,
  "getCurrentConditions"
>;
