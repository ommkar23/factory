import { describe, expect, it, vi } from "vitest";

import {
  WeatherApiResponseError,
  createSameOriginClient,
} from "../lib/weather-api-client";
import {
  clearDayConditions,
  selectedLocation,
} from "../fixtures/weather-fixtures";

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
