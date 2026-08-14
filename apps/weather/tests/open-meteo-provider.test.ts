import { describe, expect, it } from "vitest";

import {
  ProviderPayloadError,
  UpstreamHttpError,
  buildCurrentConditionsUrl,
  buildGeocodingUrl,
  cardinalDirection,
  fetchCurrentConditions,
  fetchLocations,
  normalizeCurrentConditions,
  normalizeLocations,
  weatherCondition,
} from "../lib/open-meteo/provider";

const locationPayload = {
  results: [
    {
      admin1: "Oregon",
      admin2: "Multnomah County",
      country: "United States",
      country_code: "US",
      id: 5746545,
      latitude: 45.5234,
      longitude: -122.6762,
      name: "Portland",
      timezone: "America/Los_Angeles",
    },
  ],
};

const currentPayload = {
  current: {
    apparent_temperature: 19.4,
    is_day: 1,
    precipitation: 0.2,
    relative_humidity_2m: 54,
    temperature_2m: 20.1,
    time: "2026-08-14T10:42",
    weather_code: 2,
    wind_direction_10m: 337.5,
    wind_speed_10m: 11.5,
  },
  current_units: {
    apparent_temperature: "°C",
    is_day: "",
    precipitation: "mm",
    relative_humidity_2m: "%",
    temperature_2m: "°C",
    time: "iso8601",
    weather_code: "wmo code",
    wind_direction_10m: "°",
    wind_speed_10m: "km/h",
  },
  timezone: "America/Los_Angeles",
};

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
    status,
  });
}

describe("Open-Meteo provider", () => {
  it("builds a trimmed, bounded English JSON geocoding request", () => {
    expect(buildGeocodingUrl("  Portland, Maine  ").toString()).toBe(
      "https://geocoding-api.open-meteo.com/v1/search?name=Portland%2C+Maine&count=5&language=en&format=json",
    );
  });

  it("builds a metric current-conditions request with only requested current fields", () => {
    const url = buildCurrentConditionsUrl(45.5234, -122.6762);
    expect(url.origin + url.pathname).toBe(
      "https://api.open-meteo.com/v1/forecast",
    );
    expect(Object.fromEntries(url.searchParams)).toEqual({
      current:
        "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,is_day",
      latitude: "45.5234",
      longitude: "-122.6762",
      precipitation_unit: "mm",
      temperature_unit: "celsius",
      timezone: "auto",
      wind_speed_unit: "kmh",
    });
    expect(url.searchParams.has("hourly")).toBe(false);
    expect(url.searchParams.has("daily")).toBe(false);
  });

  it.each([
    [Number.NaN, -122.6762],
    [Number.POSITIVE_INFINITY, -122.6762],
    [90.0001, -122.6762],
    [45.5234, -180.0001],
  ])(
    "rejects invalid current-condition coordinates before requesting upstream",
    (latitude, longitude) => {
      expect(() => buildCurrentConditionsUrl(latitude, longitude)).toThrow(
        ProviderPayloadError,
      );
    },
  );

  it("normalizes valid geocoding results into stable location values", () => {
    expect(normalizeLocations(locationPayload)).toEqual([
      {
        countryCode: "US",
        id: "5746545",
        latitude: 45.5234,
        longitude: -122.6762,
        name: "Portland",
        region: "Oregon, Multnomah County, United States",
        timezone: "America/Los_Angeles",
      },
    ]);
  });

  it("normalizes missing and repeated optional administrative fields without separators or duplicate parts", () => {
    expect(
      normalizeLocations({
        results: [
          {
            admin1: " ",
            admin2: "Quebec",
            admin3: "Quebec",
            country: "Quebec",
            country_code: "CA",
            id: 1,
            latitude: 46.8139,
            longitude: -71.208,
            name: "Quebec City",
            timezone: "America/Toronto",
          },
        ],
      }),
    ).toEqual([expect.objectContaining({ region: "Quebec" })]);
  });

  it("returns no locations for Open-Meteo's omitted empty result list", () => {
    expect(normalizeLocations({})).toEqual([]);
  });

  it("normalizes metric current conditions and provider-local observation time", () => {
    expect(normalizeCurrentConditions(currentPayload)).toEqual({
      apparentTemperatureC: 19.4,
      condition: { kind: "partly-cloudy", label: "Partly cloudy" },
      humidityPercent: 54,
      isDay: true,
      observedAt: "2026-08-14T10:42",
      precipitationMm: 0.2,
      temperatureC: 20.1,
      timezone: "America/Los_Angeles",
      weatherCode: 2,
      windDirectionDegrees: 337.5,
      windDirectionLabel: "N",
      windSpeedKmh: 11.5,
    });
  });

  it.each([
    [0, "clear", "Clear sky"],
    [1, "partly-cloudy", "Mainly clear"],
    [2, "partly-cloudy", "Partly cloudy"],
    [3, "partly-cloudy", "Overcast"],
    [45, "fog", "Fog"],
    [48, "fog", "Rime fog"],
    [51, "drizzle", "Light drizzle"],
    [53, "drizzle", "Moderate drizzle"],
    [55, "drizzle", "Dense drizzle"],
    [56, "freezing-drizzle", "Light freezing drizzle"],
    [57, "freezing-drizzle", "Dense freezing drizzle"],
    [61, "rain", "Slight rain"],
    [63, "rain", "Moderate rain"],
    [65, "rain", "Heavy rain"],
    [66, "freezing-rain", "Light freezing rain"],
    [67, "freezing-rain", "Heavy freezing rain"],
    [71, "snow", "Slight snow fall"],
    [73, "snow", "Moderate snow fall"],
    [75, "snow", "Heavy snow fall"],
    [77, "snow-grains", "Snow grains"],
    [80, "rain-showers", "Slight rain showers"],
    [81, "rain-showers", "Moderate rain showers"],
    [82, "rain-showers", "Violent rain showers"],
    [85, "snow-showers", "Slight snow showers"],
    [86, "snow-showers", "Heavy snow showers"],
    [95, "thunderstorm", "Thunderstorm"],
    [96, "thunderstorm-hail", "Thunderstorm with slight hail"],
    [99, "thunderstorm-hail", "Thunderstorm with heavy hail"],
  ])("maps WMO %i deterministically", (code, kind, label) => {
    expect(weatherCondition(code)).toEqual({ kind, label });
  });

  it("degrades unknown finite integer WMO codes to an explicit unknown condition", () => {
    expect(weatherCondition(999)).toEqual({
      kind: "unknown",
      label: "Unknown conditions",
    });
  });

  it.each([
    [0, "N"],
    [22.499, "N"],
    [22.5, "NE"],
    [67.499, "NE"],
    [67.5, "E"],
    [112.5, "SE"],
    [157.5, "S"],
    [202.5, "SW"],
    [247.5, "W"],
    [292.5, "NW"],
    [337.5, "N"],
    [360, "N"],
  ])("maps %f° to cardinal %s", (degrees, direction) => {
    expect(cardinalDirection(degrees)).toBe(direction);
  });

  it.each([
    [{ results: {} }, "locations"],
    [
      { results: [{ ...locationPayload.results[0], country_code: undefined }] },
      "locations",
    ],
    [
      { results: [{ ...locationPayload.results[0], latitude: 91 }] },
      "locations",
    ],
    [{ results: [{ ...locationPayload.results[0], id: 0 }] }, "locations"],
    [
      {
        ...currentPayload,
        current: { ...currentPayload.current, relative_humidity_2m: 101 },
      },
      "current conditions",
    ],
    [
      {
        ...currentPayload,
        current: { ...currentPayload.current, wind_speed_10m: -1 },
      },
      "current conditions",
    ],
    [
      {
        ...currentPayload,
        current: { ...currentPayload.current, wind_direction_10m: 361 },
      },
      "current conditions",
    ],
    [
      {
        ...currentPayload,
        current: { ...currentPayload.current, weather_code: 2.5 },
      },
      "current conditions",
    ],
  ])("rejects malformed %s payloads", (payload, target) => {
    const normalize =
      target === "locations" ? normalizeLocations : normalizeCurrentConditions;
    expect(() => normalize(payload)).toThrow(ProviderPayloadError);
  });

  it("rejects current payloads with a unit mismatch", () => {
    expect(() =>
      normalizeCurrentConditions({
        ...currentPayload,
        current_units: {
          ...currentPayload.current_units,
          wind_speed_10m: "mph",
        },
      }),
    ).toThrow(ProviderPayloadError);
  });

  it("uses an injected fetcher, passes the abort signal, and normalizes locations", async () => {
    const controller = new AbortController();
    const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toContain("geocoding-api.open-meteo.com");
      expect(init?.signal).toBe(controller.signal);
      return response(locationPayload);
    };
    await expect(
      fetchLocations("Portland", { fetcher, signal: controller.signal }),
    ).resolves.toEqual(normalizeLocations(locationPayload));
  });

  it("uses an injected fetcher and normalizes current conditions", async () => {
    await expect(
      fetchCurrentConditions(45.5234, -122.6762, {
        fetcher: async () => response(currentPayload),
      }),
    ).resolves.toEqual(normalizeCurrentConditions(currentPayload));
  });

  it("throws an HTTP error without parsing or exposing the upstream response body", async () => {
    await expect(
      fetchLocations("Portland", {
        fetcher: async () => response({ secret: "do-not-expose" }, 429),
      }),
    ).rejects.toMatchObject({ name: "UpstreamHttpError", status: 429 });

    await expect(
      fetchLocations("Portland", {
        fetcher: async () => response({ secret: "do-not-expose" }, 500),
      }),
    ).rejects.toBeInstanceOf(UpstreamHttpError);
  });
});
