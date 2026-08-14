import { describe, expect, it, vi } from "vitest";

import {
  WeatherApiResponseError,
  createSameOriginClient,
} from "../lib/weather-api-client";
import {
  createLocationsGetHandler,
  createWeatherGetHandler,
} from "../lib/weather-api";
import {
  clearDayConditions,
  cloudyNightConditions,
  locations,
  selectedLocation,
} from "../fixtures/weather-fixtures";
import type { WeatherComparisonDataSource } from "../lib/weather-comparison";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}

describe("same-origin weather API client", () => {
  it("URL-encodes a trimmed location query and returns validated normalized locations", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ locations: [selectedLocation] }));
    const client = createSameOriginClient(fetcher);

    await expect(
      client.searchLocations("  Portland & Maine  "),
    ).resolves.toEqual([selectedLocation]);

    expect(fetcher).toHaveBeenCalledWith(
      "/api/locations?q=Portland+%26+Maine",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("returns validated normalized conditions", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ conditions: clearDayConditions }));
    const client = createSameOriginClient(fetcher);

    await expect(
      client.getCurrentConditions(selectedLocation),
    ).resolves.toEqual(clearDayConditions);

    expect(fetcher).toHaveBeenCalledWith(
      "/api/weather?latitude=45.5234&longitude=-122.6762",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("structurally satisfies the comparison data source contract", () => {
    const client = createSameOriginClient(vi.fn());
    const dataSource: WeatherComparisonDataSource = client;

    expect(dataSource.getCurrentConditions).toBe(client.getCurrentConditions);
  });

  it("starts independent current-condition requests concurrently with location-specific URLs", async () => {
    let resolveFirst: ((response: Response) => void) | undefined;
    let resolveSecond: ((response: Response) => void) | undefined;
    const fetcher = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      return new Promise<Response>((resolve) => {
        if (url.includes("latitude=45.5234")) {
          resolveFirst = resolve;
          return;
        }
        resolveSecond = resolve;
      });
    });
    const client = createSameOriginClient(fetcher);

    const first = client.getCurrentConditions(selectedLocation);
    const second = client.getCurrentConditions(locations[1]!);

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "/api/weather?latitude=45.5234&longitude=-122.6762",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "/api/weather?latitude=43.6574&longitude=-70.2589",
      expect.objectContaining({ method: "GET" }),
    );

    resolveSecond?.(jsonResponse({ conditions: cloudyNightConditions }));
    resolveFirst?.(jsonResponse({ conditions: clearDayConditions }));

    await expect(Promise.all([first, second])).resolves.toEqual([
      clearDayConditions,
      cloudyNightConditions,
    ]);
  });

  it("keeps an unaffected location valid when another request is aborted", async () => {
    const firstController = new AbortController();
    const secondController = new AbortController();
    const abortFailure = new DOMException("request cancelled", "AbortError");
    const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.signal === firstController.signal) {
        return new Promise<Response>((_, reject) => {
          firstController.signal.addEventListener(
            "abort",
            () => reject(abortFailure),
            {
              once: true,
            },
          );
        });
      }
      return Promise.resolve(
        jsonResponse({ conditions: cloudyNightConditions }),
      );
    });
    const client = createSameOriginClient(fetcher);

    const aborted = client.getCurrentConditions(selectedLocation, {
      signal: firstController.signal,
    });
    const unaffected = client.getCurrentConditions(locations[1]!, {
      signal: secondController.signal,
    });
    firstController.abort();

    await expect(aborted).rejects.toBe(abortFailure);
    await expect(unaffected).resolves.toEqual(cloudyNightConditions);
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "/api/weather?latitude=43.6574&longitude=-70.2589",
      expect.objectContaining({ signal: secondController.signal }),
    );
  });

  it("validates conditions and does not expose a server error message", async () => {
    const serverMessage = "provider diagnostic that must not reach the UI";
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "UPSTREAM_UNAVAILABLE",
            message: serverMessage,
          },
        },
        503,
      ),
    );
    const client = createSameOriginClient(fetcher);

    await expect(client.getCurrentConditions(selectedLocation)).rejects.toEqual(
      expect.objectContaining({
        code: "UPSTREAM_UNAVAILABLE",
        message: "The weather service returned an unexpected response.",
        name: "WeatherApiResponseError",
      }),
    );
  });

  it("accepts a valid success envelope only with status 200", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ locations: [selectedLocation] }, 200));
    const client = createSameOriginClient(fetcher);

    await expect(client.searchLocations("Portland")).resolves.toEqual([
      selectedLocation,
    ]);
  });

  it("rejects a valid success envelope with status 201", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ locations: [selectedLocation] }, 201));
    const client = createSameOriginClient(fetcher);

    await expect(client.searchLocations("Portland")).rejects.toBeInstanceOf(
      WeatherApiResponseError,
    );
  });

  it("rejects a no-content status 204 without attempting a success parse", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = createSameOriginClient(fetcher);

    await expect(client.searchLocations("Portland")).rejects.toBeInstanceOf(
      WeatherApiResponseError,
    );
  });

  it("round-trips route handler responses through the same-origin client without a network call", async () => {
    const locationsHandler = createLocationsGetHandler({
      fetchLocations: vi.fn().mockResolvedValue([selectedLocation]),
    });
    const weatherHandler = createWeatherGetHandler({
      fetchCurrentConditions: vi.fn().mockResolvedValue(clearDayConditions),
    });
    const fetcher = async (input: RequestInfo | URL): Promise<Response> => {
      const url = new URL(String(input), "http://weather.test");
      const request = new Request(url);
      if (url.pathname === "/api/locations") return locationsHandler(request);
      if (url.pathname === "/api/weather") return weatherHandler(request);
      return new Response(null, { status: 404 });
    };
    const client = createSameOriginClient(fetcher);

    await expect(client.searchLocations(" Portland ")).resolves.toEqual([
      selectedLocation,
    ]);
    await expect(
      client.getCurrentConditions(selectedLocation),
    ).resolves.toEqual(clearDayConditions);
  });

  it("fails safely for malformed success and error envelopes", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ locations: [{ name: "Portland" }] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ error: { code: "NOT_SAFE" } }, 502),
      );
    const client = createSameOriginClient(fetcher);

    await expect(client.searchLocations("Portland")).rejects.toBeInstanceOf(
      WeatherApiResponseError,
    );
    await expect(client.searchLocations("Portland")).rejects.toBeInstanceOf(
      WeatherApiResponseError,
    );
  });
});
