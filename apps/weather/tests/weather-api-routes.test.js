import { describe, expect, it, vi } from "vitest";
import {
  createLocationsGetHandler,
  createWeatherGetHandler,
} from "../lib/weather-api";
import {
  ProviderPayloadError,
  UpstreamHttpError,
} from "../lib/open-meteo/provider";
const location = {
  countryCode: "US",
  id: "1",
  latitude: 45.5234,
  longitude: -122.6762,
  name: "Portland",
  region: "Oregon, United States",
  timezone: "America/Los_Angeles",
};
const conditions = {
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
};
function request(path, signal) {
  if (signal) return { signal, url: `http://localhost${path}` };
  return new Request(`http://localhost${path}`);
}
async function responseJson(response) {
  return response.json();
}
describe("weather API routes", () => {
  it("returns the locations envelope with the long shared cache policy", async () => {
    const fetchLocations = vi.fn().mockResolvedValue([location]);
    const handler = createLocationsGetHandler({ fetchLocations });
    const response = await handler(request("/api/locations?q=%20Portland%20"));
    expect(fetchLocations).toHaveBeenCalledWith("Portland", expect.any(Object));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
    );
    await expect(responseJson(response)).resolves.toEqual({
      locations: [location],
    });
  });
  it("returns at most five normalized locations", async () => {
    const handler = createLocationsGetHandler({
      fetchLocations: async () =>
        Array.from({ length: 6 }, (_, id) => ({ ...location, id: String(id) })),
    });
    const response = await handler(request("/api/locations?q=Portland"));
    await expect(responseJson(response)).resolves.toEqual({
      locations: Array.from({ length: 5 }, (_, id) => ({
        ...location,
        id: String(id),
      })),
    });
  });
  it.each([
    ["ab", "ab"],
    [` ${"a".repeat(100)} `, "a".repeat(100)],
  ])("accepts a boundary location query", async (query, expected) => {
    const fetchLocations = vi.fn().mockResolvedValue([]);
    const handler = createLocationsGetHandler({ fetchLocations });
    const response = await handler(
      request(`/api/locations?q=${encodeURIComponent(query)}`),
    );
    expect(response.status).toBe(200);
    expect(fetchLocations).toHaveBeenCalledWith(expected, expect.any(Object));
  });
  it.each([
    "/api/locations",
    "/api/locations?q=",
    "/api/locations?q=%20%20",
    "/api/locations?q=a",
    `/api/locations?q=${"a".repeat(101)}`,
    "/api/locations?q=Portland&q=Maine",
  ])("rejects invalid location query values without caching", async (path) => {
    const fetchLocations = vi.fn();
    const response = await createLocationsGetHandler({ fetchLocations })(
      request(path),
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(responseJson(response)).resolves.toEqual({
      error: {
        code: "INVALID_REQUEST",
        message: "Request parameters are invalid.",
      },
    });
    expect(fetchLocations).not.toHaveBeenCalled();
  });
  it("returns the conditions envelope with the short shared cache policy", async () => {
    const fetchCurrentConditions = vi.fn().mockResolvedValue(conditions);
    const handler = createWeatherGetHandler({ fetchCurrentConditions });
    const response = await handler(
      request("/api/weather?latitude=90&longitude=-180"),
    );
    expect(fetchCurrentConditions).toHaveBeenCalledWith(
      90,
      -180,
      expect.any(Object),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=60, s-maxage=600, stale-while-revalidate=300",
    );
    await expect(responseJson(response)).resolves.toEqual({ conditions });
  });
  it.each([
    ["-90", "-180"],
    ["90", "180"],
    ["0", "0"],
    ["-0", "0"],
  ])("accepts coordinate boundaries", async (latitude, longitude) => {
    const fetchCurrentConditions = vi.fn().mockResolvedValue(conditions);
    const response = await createWeatherGetHandler({ fetchCurrentConditions })(
      request(`/api/weather?latitude=${latitude}&longitude=${longitude}`),
    );
    expect(response.status).toBe(200);
  });
  it.each([
    "/api/weather",
    "/api/weather?latitude=&longitude=0",
    "/api/weather?latitude=0&longitude=",
    "/api/weather?latitude=91&longitude=0",
    "/api/weather?latitude=-90.1&longitude=0",
    "/api/weather?latitude=0&longitude=180.1",
    "/api/weather?latitude=0&longitude=-180.1",
    "/api/weather?latitude=1e2&longitude=0",
    "/api/weather?latitude=+1&longitude=0",
    "/api/weather?latitude=.1&longitude=0",
    "/api/weather?latitude=1.&longitude=0",
    "/api/weather?latitude=Infinity&longitude=0",
    "/api/weather?latitude=NaN&longitude=0",
    "/api/weather?latitude=0x10&longitude=0",
    "/api/weather?latitude=0&longitude=0&longitude=1",
    "/api/weather?latitude=0&latitude=1&longitude=0",
  ])("rejects malformed weather parameters without caching", async (path) => {
    const fetchCurrentConditions = vi.fn();
    const response = await createWeatherGetHandler({ fetchCurrentConditions })(
      request(path),
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(responseJson(response)).resolves.toEqual({
      error: {
        code: "INVALID_REQUEST",
        message: "Request parameters are invalid.",
      },
    });
    expect(fetchCurrentConditions).not.toHaveBeenCalled();
  });
  it.each([
    [new UpstreamHttpError(429), 429, "UPSTREAM_RATE_LIMITED"],
    [new UpstreamHttpError(503), 502, "UPSTREAM_UNAVAILABLE"],
    [
      new Error("network secret https://provider.example/?q=Portland"),
      502,
      "UPSTREAM_UNAVAILABLE",
    ],
    [
      new ProviderPayloadError("provider JSON secret"),
      502,
      "UPSTREAM_INVALID_RESPONSE",
    ],
  ])(
    "maps upstream failures to safe stable errors",
    async (failure, status, code) => {
      const handler = createWeatherGetHandler({
        fetchCurrentConditions: async () => Promise.reject(failure),
      });
      const response = await handler(
        request("/api/weather?latitude=0&longitude=0"),
      );
      const body = await responseJson(response);
      expect(response.status).toBe(status);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(body).toEqual({ error: { code, message: expect.any(String) } });
      expect(JSON.stringify(body)).not.toContain("secret");
      expect(JSON.stringify(body)).not.toContain("provider.example");
      expect(JSON.stringify(body)).not.toContain("latitude");
    },
  );
  it("maps a route-owned five second abort to an upstream timeout", async () => {
    vi.useFakeTimers();
    try {
      const handler = createLocationsGetHandler({
        fetchLocations: async (_query, { signal }) =>
          new Promise((_, reject) => {
            signal?.addEventListener(
              "abort",
              () => reject(new DOMException("aborted", "AbortError")),
              { once: true },
            );
          }),
      });
      const pending = handler(request("/api/locations?q=Portland"));
      await vi.advanceTimersByTimeAsync(5_000);
      const response = await pending;
      expect(response.status).toBe(504);
      await expect(responseJson(response)).resolves.toEqual({
        error: {
          code: "UPSTREAM_TIMEOUT",
          message: "The upstream service timed out.",
        },
      });
    } finally {
      vi.useRealTimers();
    }
  });
  it("does not mislabel an incoming request abort as an upstream timeout", async () => {
    const controller = new AbortController();
    const handler = createWeatherGetHandler({
      fetchCurrentConditions: async (_latitude, _longitude, { signal }) =>
        new Promise((_, reject) => {
          signal?.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
            { once: true },
          );
        }),
    });
    const pending = handler(
      request("/api/weather?latitude=0&longitude=0", controller.signal),
    );
    controller.abort();
    const response = await pending;
    expect(response.status).toBe(502);
    await expect(responseJson(response)).resolves.toEqual({
      error: {
        code: "UPSTREAM_UNAVAILABLE",
        message: "The upstream service is unavailable.",
      },
    });
  });
  it("does not map a delayed post-cancellation rejection to a route timeout", async () => {
    vi.useFakeTimers();
    try {
      const controller = new AbortController();
      const handler = createWeatherGetHandler({
        fetchCurrentConditions: async (_latitude, _longitude, { signal }) =>
          new Promise((_, reject) => {
            signal?.addEventListener(
              "abort",
              () => {
                setTimeout(
                  () => reject(new DOMException("aborted", "AbortError")),
                  5_001,
                );
              },
              { once: true },
            );
          }),
      });
      const pending = handler(
        request("/api/weather?latitude=0&longitude=0", controller.signal),
      );
      controller.abort();
      await vi.advanceTimersByTimeAsync(5_001);
      const response = await pending;
      expect(response.status).toBe(502);
      await expect(responseJson(response)).resolves.toEqual({
        error: {
          code: "UPSTREAM_UNAVAILABLE",
          message: "The upstream service is unavailable.",
        },
      });
    } finally {
      vi.useRealTimers();
    }
  });
});
