import {
  cardinalDirection,
  type CurrentConditions,
  type Location,
  ProviderPayloadError,
  weatherCondition,
} from "../weather-domain";

export {
  cardinalDirection,
  ProviderPayloadError,
  weatherCondition,
} from "../weather-domain";
export type { CurrentConditions, Location } from "../weather-domain";

export const GEOCODING_ENDPOINT =
  "https://geocoding-api.open-meteo.com/v1/search";
export const FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast";

const CURRENT_FIELDS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "precipitation",
  "weather_code",
  "wind_speed_10m",
  "wind_direction_10m",
  "is_day",
] as const;

type UnknownRecord = Record<string, unknown>;
export type Fetcher = (input: URL, init?: RequestInit) => Promise<Response>;
export type FetchOptions = { fetcher?: Fetcher; signal?: AbortSignal };

export class UpstreamHttpError extends Error {
  override name = "UpstreamHttpError";

  constructor(readonly status: number) {
    super(`Open-Meteo request failed with HTTP ${status}.`);
  }
}

export function buildGeocodingUrl(query: string): URL {
  const url = new URL(GEOCODING_ENDPOINT);
  url.searchParams.set("name", query.trim());
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  return url;
}

export function buildCurrentConditionsUrl(
  latitude: number,
  longitude: number,
): URL {
  validateCoordinates(latitude, longitude);
  const url = new URL(FORECAST_ENDPOINT);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("precipitation_unit", "mm");
  url.searchParams.set("current", CURRENT_FIELDS.join(","));
  return url;
}

export async function fetchLocations(
  query: string,
  options: FetchOptions = {},
): Promise<Location[]> {
  return requestJson(buildGeocodingUrl(query), options).then(
    normalizeLocations,
  );
}

export async function fetchCurrentConditions(
  latitude: number,
  longitude: number,
  options: FetchOptions = {},
): Promise<CurrentConditions> {
  return requestJson(
    buildCurrentConditionsUrl(latitude, longitude),
    options,
  ).then(normalizeCurrentConditions);
}

async function requestJson(
  url: URL,
  { fetcher = fetch, signal }: FetchOptions,
): Promise<unknown> {
  const response = await fetcher(url, { signal });
  if (!response.ok) {
    throw new UpstreamHttpError(response.status);
  }
  try {
    return await response.json();
  } catch {
    throw new ProviderPayloadError("Open-Meteo returned invalid JSON.");
  }
}

export function normalizeLocations(payload: unknown): Location[] {
  const root = record(payload, "geocoding response");
  const results = root.results;
  if (results === undefined) return [];
  if (!Array.isArray(results)) fail("Geocoding results must be an array.");
  return results.map((result) =>
    normalizeLocation(record(result, "geocoding result")),
  );
}

function normalizeLocation(result: UnknownRecord): Location {
  const id = number(result, "id");
  if (!Number.isInteger(id) || id <= 0)
    fail("Location id must be a positive integer.");

  const name = text(result, "name");
  const countryCode = text(result, "country_code").toUpperCase();
  if (!/^[A-Z]{2}$/.test(countryCode))
    fail("Location country code must be ISO alpha-2.");

  const latitude = number(result, "latitude");
  const longitude = number(result, "longitude");
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    fail("Location coordinates are out of range.");
  }

  const timezone = text(result, "timezone");
  if (!isIanaTimeZone(timezone))
    fail("Location timezone must be a valid IANA timezone.");

  const regionParts = ["admin1", "admin2", "admin3", "admin4", "country"]
    .map((key) => optionalText(result[key]))
    .filter((part): part is string => part !== undefined);
  const region = uniqueParts(regionParts).join(", ") || countryCode;

  return {
    id: String(id),
    name,
    region,
    countryCode,
    latitude,
    longitude,
    timezone,
  };
}

export function normalizeCurrentConditions(
  payload: unknown,
): CurrentConditions {
  const root = record(payload, "forecast response");
  const timezone = text(root, "timezone");
  if (!isIanaTimeZone(timezone))
    fail("Forecast timezone must be a valid IANA timezone.");
  const current = record(root.current, "current conditions");
  const units = record(root.current_units, "current condition units");
  validateCurrentUnits(units);

  const observedAt = text(current, "time");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(observedAt)) {
    fail("Current observation time must be local ISO 8601.");
  }

  const weatherCode = number(current, "weather_code");
  const humidityPercent = number(current, "relative_humidity_2m");
  const precipitationMm = number(current, "precipitation");
  const windSpeedKmh = number(current, "wind_speed_10m");
  const windDirectionDegrees = number(current, "wind_direction_10m");
  const isDayValue = number(current, "is_day");
  if (humidityPercent < 0 || humidityPercent > 100)
    fail("Humidity must be between 0 and 100.");
  if (precipitationMm < 0 || windSpeedKmh < 0)
    fail("Precipitation and wind speed cannot be negative.");
  if (isDayValue !== 0 && isDayValue !== 1) fail("is_day must be 0 or 1.");

  return {
    observedAt,
    timezone,
    weatherCode,
    condition: weatherCondition(weatherCode),
    isDay: isDayValue === 1,
    temperatureC: number(current, "temperature_2m"),
    apparentTemperatureC: number(current, "apparent_temperature"),
    humidityPercent,
    precipitationMm,
    windSpeedKmh,
    windDirectionDegrees,
    windDirectionLabel: cardinalDirection(windDirectionDegrees),
  };
}

function validateCurrentUnits(units: UnknownRecord): void {
  const expected: Readonly<Record<string, string>> = {
    time: "iso8601",
    temperature_2m: "°C",
    apparent_temperature: "°C",
    relative_humidity_2m: "%",
    precipitation: "mm",
    weather_code: "wmo code",
    wind_speed_10m: "km/h",
    wind_direction_10m: "°",
    is_day: "",
  };
  for (const [key, unit] of Object.entries(expected)) {
    if (units[key] !== unit) fail(`Unexpected Open-Meteo unit for ${key}.`);
  }
}

function record(value: unknown, context: string): UnknownRecord {
  if (!isUnknownRecord(value)) {
    fail(`Malformed ${context} payload.`);
  }
  return value;
}

function isUnknownRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: UnknownRecord, key: string): string {
  const candidate = optionalText(value[key]);
  if (candidate === undefined) fail(`${key} must be a non-empty string.`);
  return candidate;
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function number(value: UnknownRecord, key: string): number {
  const candidate = value[key];
  if (typeof candidate !== "number" || !Number.isFinite(candidate)) {
    fail(`${key} must be a finite number.`);
  }
  return candidate;
}

function validateCoordinates(latitude: number, longitude: number): void {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    fail("Coordinates must be finite WGS84 latitude/longitude values.");
  }
}

function uniqueParts(parts: readonly string[]): string[] {
  const seen = new Set<string>();
  return parts.filter((part) => {
    const key = part.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isIanaTimeZone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

function fail(message: string): never {
  throw new ProviderPayloadError(message);
}
