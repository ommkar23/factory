import type { CurrentConditions, Location } from "./weather-domain";

export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "UPSTREAM_RATE_LIMITED"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_UNAVAILABLE"
  | "UPSTREAM_INVALID_RESPONSE";

type Fetcher = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type RequestOptions = {
  signal?: AbortSignal;
};

export type WeatherApiClient = {
  getCurrentConditions: (
    location: Location,
    options?: RequestOptions,
  ) => Promise<CurrentConditions>;
  searchLocations: (
    query: string,
    options?: RequestOptions,
  ) => Promise<readonly Location[]>;
};

export class WeatherApiResponseError extends Error {
  override name = "WeatherApiResponseError";

  constructor(
    message = "The weather service returned an unexpected response.",
    readonly code?: ApiErrorCode,
  ) {
    super(message);
  }
}

const apiErrorCodes = new Set<string>([
  "INVALID_REQUEST",
  "UPSTREAM_RATE_LIMITED",
  "UPSTREAM_TIMEOUT",
  "UPSTREAM_UNAVAILABLE",
  "UPSTREAM_INVALID_RESPONSE",
]);

const conditionKinds = new Set<string>([
  "clear",
  "partly-cloudy",
  "fog",
  "drizzle",
  "freezing-drizzle",
  "rain",
  "freezing-rain",
  "snow",
  "snow-grains",
  "rain-showers",
  "snow-showers",
  "thunderstorm",
  "thunderstorm-hail",
  "unknown",
]);

const cardinalDirections = new Set<string>([
  "N",
  "NE",
  "E",
  "SE",
  "S",
  "SW",
  "W",
  "NW",
]);

function isApiErrorCode(value: string): value is ApiErrorCode {
  return apiErrorCodes.has(value);
}

function isConditionKind(
  value: string,
): value is CurrentConditions["condition"]["kind"] {
  return conditionKinds.has(value);
}

function isCardinalDirection(
  value: string,
): value is CurrentConditions["windDirectionLabel"] {
  return cardinalDirections.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberField(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function locationFromUnknown(value: unknown): Location | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = stringField(value.id);
  const name = stringField(value.name);
  const region = stringField(value.region);
  const countryCode = stringField(value.countryCode);
  const latitude = numberField(value.latitude);
  const longitude = numberField(value.longitude);
  const timezone = stringField(value.timezone);
  if (
    !id ||
    !name ||
    !region ||
    !countryCode ||
    latitude === undefined ||
    longitude === undefined ||
    !timezone
  ) {
    return undefined;
  }

  return { countryCode, id, latitude, longitude, name, region, timezone };
}

function conditionsFromUnknown(value: unknown): CurrentConditions | undefined {
  if (!isRecord(value) || !isRecord(value.condition)) {
    return undefined;
  }

  const conditionKind = stringField(value.condition.kind);
  const conditionLabel = stringField(value.condition.label);
  const observedAt = stringField(value.observedAt);
  const timezone = stringField(value.timezone);
  const weatherCode = numberField(value.weatherCode);
  const temperatureC = numberField(value.temperatureC);
  const apparentTemperatureC = numberField(value.apparentTemperatureC);
  const humidityPercent = numberField(value.humidityPercent);
  const precipitationMm = numberField(value.precipitationMm);
  const windSpeedKmh = numberField(value.windSpeedKmh);
  const windDirectionDegrees = numberField(value.windDirectionDegrees);
  const windDirectionLabel = stringField(value.windDirectionLabel);
  if (
    !observedAt ||
    !timezone ||
    weatherCode === undefined ||
    !conditionKind ||
    !isConditionKind(conditionKind) ||
    !conditionLabel ||
    typeof value.isDay !== "boolean" ||
    temperatureC === undefined ||
    apparentTemperatureC === undefined ||
    humidityPercent === undefined ||
    precipitationMm === undefined ||
    windSpeedKmh === undefined ||
    windDirectionDegrees === undefined ||
    !windDirectionLabel ||
    !isCardinalDirection(windDirectionLabel)
  ) {
    return undefined;
  }

  return {
    apparentTemperatureC,
    condition: { kind: conditionKind, label: conditionLabel },
    humidityPercent,
    isDay: value.isDay,
    observedAt,
    precipitationMm,
    temperatureC,
    timezone,
    weatherCode,
    windDirectionDegrees,
    windDirectionLabel,
    windSpeedKmh,
  };
}

async function responseBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function responseError(body: unknown): WeatherApiResponseError {
  if (
    isRecord(body) &&
    isRecord(body.error) &&
    typeof body.error.code === "string" &&
    isApiErrorCode(body.error.code) &&
    typeof body.error.message === "string"
  ) {
    return new WeatherApiResponseError(undefined, body.error.code);
  }

  return new WeatherApiResponseError();
}

async function getJson(fetcher: Fetcher, url: string, signal?: AbortSignal) {
  const response = await fetcher(url, { method: "GET", signal });
  const body = await responseBody(response);
  if (response.status !== 200) {
    throw responseError(body);
  }
  return body;
}

export function createSameOriginClient(
  fetcher: Fetcher = fetch,
  basePath = process.env.FACTORY_SHARED_ORIGIN === "true" ? "/weather" : "",
): WeatherApiClient {
  return {
    async searchLocations(query, options) {
      const body = await getJson(
        fetcher,
        `${basePath}/api/locations?${new URLSearchParams({ q: query.trim() })}`,
        options?.signal,
      );
      if (!isRecord(body) || !Array.isArray(body.locations)) {
        throw new WeatherApiResponseError();
      }

      const locations: Location[] = [];
      for (const value of body.locations) {
        const location = locationFromUnknown(value);
        if (!location) {
          throw new WeatherApiResponseError();
        }
        locations.push(location);
      }
      return locations;
    },
    async getCurrentConditions(location, options) {
      const body = await getJson(
        fetcher,
        `${basePath}/api/weather?${new URLSearchParams({
          latitude: String(location.latitude),
          longitude: String(location.longitude),
        })}`,
        options?.signal,
      );
      if (!isRecord(body)) {
        throw new WeatherApiResponseError();
      }

      const conditions = conditionsFromUnknown(body.conditions);
      if (!conditions) {
        throw new WeatherApiResponseError();
      }
      return conditions;
    },
  };
}

export const sameOriginClient = createSameOriginClient();
