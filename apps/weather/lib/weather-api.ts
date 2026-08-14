import type { CurrentConditions, Location } from "./weather-domain";
import {
  fetchCurrentConditions,
  fetchLocations,
  ProviderPayloadError,
  UpstreamHttpError,
} from "./open-meteo/provider";

export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "UPSTREAM_RATE_LIMITED"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_UNAVAILABLE"
  | "UPSTREAM_INVALID_RESPONSE";

type ProviderOptions = { signal?: AbortSignal };
type LocationsService = (
  query: string,
  options: ProviderOptions,
) => Promise<Location[]>;
type ConditionsService = (
  latitude: number,
  longitude: number,
  options: ProviderOptions,
) => Promise<CurrentConditions>;

type LocationsDependencies = {
  fetchLocations?: LocationsService;
  timeoutMs?: number;
};
type WeatherDependencies = {
  fetchCurrentConditions?: ConditionsService;
  timeoutMs?: number;
};

const LOCATION_CACHE_CONTROL =
  "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800";
const WEATHER_CACHE_CONTROL =
  "public, max-age=60, s-maxage=600, stale-while-revalidate=300";
const NO_STORE_CACHE_CONTROL = "no-store";
const UPSTREAM_TIMEOUT_MS = 5_000;

export function createLocationsGetHandler({
  fetchLocations: getLocations = fetchLocations,
  timeoutMs = UPSTREAM_TIMEOUT_MS,
}: LocationsDependencies = {}) {
  return async function GET(request: Request): Promise<Response> {
    const query = validLocationQuery(new URL(request.url).searchParams);
    if (query === undefined) return invalidRequest();

    const upstream = upstreamSignal(request.signal, timeoutMs);
    try {
      const locations = await getLocations(query, { signal: upstream.signal });
      return json({ locations: locations.slice(0, 5) }, LOCATION_CACHE_CONTROL);
    } catch (error) {
      return upstreamError(error, upstream.timedOut());
    } finally {
      upstream.cleanup();
    }
  };
}

export function createWeatherGetHandler({
  fetchCurrentConditions: getCurrentConditions = fetchCurrentConditions,
  timeoutMs = UPSTREAM_TIMEOUT_MS,
}: WeatherDependencies = {}) {
  return async function GET(request: Request): Promise<Response> {
    const coordinates = validCoordinates(new URL(request.url).searchParams);
    if (coordinates === undefined) return invalidRequest();

    const upstream = upstreamSignal(request.signal, timeoutMs);
    try {
      const conditions = await getCurrentConditions(
        coordinates.latitude,
        coordinates.longitude,
        { signal: upstream.signal },
      );
      return json({ conditions }, WEATHER_CACHE_CONTROL);
    } catch (error) {
      return upstreamError(error, upstream.timedOut());
    } finally {
      upstream.cleanup();
    }
  };
}

function validLocationQuery(params: URLSearchParams): string | undefined {
  const values = params.getAll("q");
  if (values.length !== 1) return undefined;
  const query = values[0]?.trim();
  return query !== undefined && query.length >= 2 && query.length <= 100
    ? query
    : undefined;
}

function validCoordinates(
  params: URLSearchParams,
): { latitude: number; longitude: number } | undefined {
  const latitude = canonicalNumber(params.getAll("latitude"));
  const longitude = canonicalNumber(params.getAll("longitude"));
  if (latitude === undefined || longitude === undefined) return undefined;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return undefined;
  }
  return { latitude, longitude };
}

function canonicalNumber(values: string[]): number | undefined {
  if (values.length !== 1) return undefined;
  const value = values[0];
  if (value === undefined || !/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    return undefined;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function upstreamSignal(requestSignal: AbortSignal, timeoutMs: number) {
  const controller = new AbortController();
  let requestAborted = false;
  let timedOut = false;
  let cleanedUp = false;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const clearRouteTimeout = () => {
    if (timeout === undefined) return;
    clearTimeout(timeout);
    timeout = undefined;
  };
  const abortForRequest = () => {
    requestAborted = true;
    clearRouteTimeout();
    controller.abort();
  };

  requestSignal.addEventListener("abort", abortForRequest, { once: true });
  if (requestSignal.aborted) abortForRequest();
  if (!requestAborted) {
    timeout = setTimeout(() => {
      timeout = undefined;
      if (requestAborted) return;
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  }

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup: () => {
      if (cleanedUp) return;
      cleanedUp = true;
      clearRouteTimeout();
      requestSignal.removeEventListener("abort", abortForRequest);
    },
  };
}

function invalidRequest(): Response {
  return errorResponse(
    "INVALID_REQUEST",
    "Request parameters are invalid.",
    400,
  );
}

function upstreamError(error: unknown, timedOut: boolean): Response {
  if (timedOut) {
    return errorResponse(
      "UPSTREAM_TIMEOUT",
      "The upstream service timed out.",
      504,
    );
  }
  if (error instanceof ProviderPayloadError) {
    return errorResponse(
      "UPSTREAM_INVALID_RESPONSE",
      "The upstream service returned an invalid response.",
      502,
    );
  }
  if (error instanceof UpstreamHttpError && error.status === 429) {
    return errorResponse(
      "UPSTREAM_RATE_LIMITED",
      "The upstream service is rate limited.",
      429,
    );
  }
  return errorResponse(
    "UPSTREAM_UNAVAILABLE",
    "The upstream service is unavailable.",
    502,
  );
}

function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
): Response {
  return json({ error: { code, message } }, NO_STORE_CACHE_CONTROL, status);
}

function json(body: unknown, cacheControl: string, status = 200): Response {
  return Response.json(body, {
    headers: { "Cache-Control": cacheControl },
    status,
  });
}
