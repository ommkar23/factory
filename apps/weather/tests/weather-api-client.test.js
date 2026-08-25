import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WeatherApiResponseError,
  createSameOriginClient,
} from "../lib/weather-api-client";
import {
  clearDayConditions,
  cloudyNightConditions,
  locations,
  selectedLocation,
} from "../fixtures/weather-fixtures";
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status,
  });
}
describe("same-origin weather API client", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("URL-encodes a trimmed location query and returns validated normalized locations", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(jsonResponse({ locations: [selectedLocation] }));
    const client = createSameOriginClient(fetcher);
    await expect(
      client.searchLocations("  Portland & Maine  "),
    ).resolves.toEqual([selectedLocation]);
    expect(fetcher).toHaveBeenCalledWith(
      "/app/weather/v1/locations?q=Portland+%26+Maine",
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
      "/app/weather/v1/current-conditions?latitude=45.5234&longitude=-122.6762",
      expect.objectContaining({ method: "GET" }),
    );
  });
  it("keeps Factory API requests root-relative when served beneath the shared-origin weather path", async () => {
    vi.stubEnv("FACTORY_SHARED_ORIGIN", "true");
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ locations: [selectedLocation] }))
      .mockResolvedValueOnce(jsonResponse({ conditions: clearDayConditions }));
    const client = createSameOriginClient(fetcher);
    await client.searchLocations("Portland");
    await client.getCurrentConditions(selectedLocation);
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "/app/weather/v1/locations?q=Portland",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "/app/weather/v1/current-conditions?latitude=45.5234&longitude=-122.6762",
      expect.objectContaining({ method: "GET" }),
    );
  });
  it("structurally satisfies the comparison data source contract", () => {
    const client = createSameOriginClient(vi.fn());
    const dataSource = client;
    expect(dataSource.getCurrentConditions).toBe(client.getCurrentConditions);
  });
  it("starts independent current-condition requests concurrently with location-specific URLs", async () => {
    let resolveFirst;
    let resolveSecond;
    const fetcher = vi.fn((input) => {
      const url = String(input);
      return new Promise((resolve) => {
        if (url.includes("latitude=45.5234")) {
          resolveFirst = resolve;
          return;
        }
        resolveSecond = resolve;
      });
    });
    const client = createSameOriginClient(fetcher);
    const first = client.getCurrentConditions(selectedLocation);
    const second = client.getCurrentConditions(locations[1]);
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "/app/weather/v1/current-conditions?latitude=45.5234&longitude=-122.6762",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "/app/weather/v1/current-conditions?latitude=43.6574&longitude=-70.2589",
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
    const fetcher = vi.fn((_input, init) => {
      if (init?.signal === firstController.signal) {
        return new Promise((_, reject) => {
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
    const unaffected = client.getCurrentConditions(locations[1], {
      signal: secondController.signal,
    });
    firstController.abort();
    await expect(aborted).rejects.toBe(abortFailure);
    await expect(unaffected).resolves.toEqual(cloudyNightConditions);
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "/app/weather/v1/current-conditions?latitude=43.6574&longitude=-70.2589",
      expect.objectContaining({ signal: secondController.signal }),
    );
  });
  it.each([
    ["INVALID_CREDENTIALS", 401],
    ["INVALID_REQUEST", 400],
    ["UPSTREAM_RATE_LIMITED", 429],
    ["UPSTREAM_TIMEOUT", 504],
    ["UPSTREAM_UNAVAILABLE", 502],
    ["UPSTREAM_INVALID_RESPONSE", 502],
  ])(
    "accepts the %s error code without exposing the server message",
    async (code, status) => {
      const serverMessage = "provider diagnostic that must not reach the UI";
      const fetcher = vi.fn().mockResolvedValue(
        jsonResponse(
          {
            error: {
              code,
              message: serverMessage,
            },
          },
          status,
        ),
      );
      const client = createSameOriginClient(fetcher);
      await expect(
        client.getCurrentConditions(selectedLocation),
      ).rejects.toEqual(
        expect.objectContaining({
          code,
          message: "The weather service returned an unexpected response.",
          name: "WeatherApiResponseError",
        }),
      );
    },
  );
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
