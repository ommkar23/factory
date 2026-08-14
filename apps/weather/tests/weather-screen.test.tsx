import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WeatherScreen } from "../components/weather-screen";
import type { WeatherApiClient } from "../lib/weather-api-client";
import { clearDayConditions, locations } from "../fixtures/weather-fixtures";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function client(overrides: Partial<WeatherApiClient> = {}): WeatherApiClient {
  return {
    getCurrentConditions: vi.fn().mockResolvedValue(clearDayConditions),
    searchLocations: vi.fn().mockResolvedValue(locations),
    ...overrides,
  };
}

async function elapseSearchDebounce() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}

function query(value: string) {
  fireEvent.change(screen.getByRole("combobox"), { target: { value } });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("WeatherScreen client orchestration", () => {
  it("starts without fixture conditions and skips API work for queries shorter than two trimmed characters", async () => {
    vi.useFakeTimers();
    const apiClient = client();
    render(<WeatherScreen apiClient={apiClient} />);

    expect(
      screen.getByText("Search for a location to see current conditions."),
    ).toBeTruthy();
    expect(screen.queryByText("20.4°C")).toBeNull();

    query(" p ");
    await elapseSearchDebounce();

    expect(apiClient.searchLocations).not.toHaveBeenCalled();
  });

  it("debounces searches and renders no results", async () => {
    vi.useFakeTimers();
    const apiClient = client({
      searchLocations: vi.fn().mockResolvedValue([]),
    });
    render(<WeatherScreen apiClient={apiClient} />);

    query("  Portland  ");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(299);
    });
    expect(apiClient.searchLocations).not.toHaveBeenCalled();

    await elapseSearchDebounce();
    expect(apiClient.searchLocations).toHaveBeenCalledWith(
      "Portland",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByText("No locations matched “Portland”.")).toBeTruthy();
  });

  it("suppresses stale search responses even when the client ignores abort", async () => {
    vi.useFakeTimers();
    const first = deferred<readonly (typeof locations)[number][]>();
    const second = deferred<readonly (typeof locations)[number][]>();
    const searchLocations = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const apiClient = client({ searchLocations });
    render(<WeatherScreen apiClient={apiClient} />);

    query("Portland");
    await elapseSearchDebounce();
    const firstSignal = (
      searchLocations.mock.calls[0]?.[1] as { signal: AbortSignal }
    ).signal;

    query("Boston");
    expect(firstSignal.aborted).toBe(true);
    await elapseSearchDebounce();

    await act(async () => {
      first.resolve([locations[0]!]);
      await Promise.resolve();
    });
    expect(screen.queryByRole("option", { name: /Portland/ })).toBeNull();

    await act(async () => {
      second.resolve([locations[1]!]);
      await Promise.resolve();
    });
    expect(screen.getByRole("option", { name: /Maine/ })).toBeTruthy();
  });

  it("aborts pending search work on unmount", async () => {
    vi.useFakeTimers();
    const pending = deferred<readonly (typeof locations)[number][]>();
    const searchLocations = vi.fn().mockReturnValue(pending.promise);
    const apiClient = client({ searchLocations });
    const view = render(<WeatherScreen apiClient={apiClient} />);

    query("Portland");
    await elapseSearchDebounce();
    const signal = (
      searchLocations.mock.calls[0]?.[1] as { signal: AbortSignal }
    ).signal;
    view.unmount();

    expect(signal.aborted).toBe(true);
  });

  it("uses safe search failure copy instead of server-provided error text", async () => {
    vi.useFakeTimers();
    const apiClient = client({
      searchLocations: vi
        .fn()
        .mockRejectedValue(new Error("internal hostname")),
    });
    render(<WeatherScreen apiClient={apiClient} />);

    query("Portland");
    await elapseSearchDebounce();

    expect(screen.getByRole("alert").textContent).toContain(
      "Location search is temporarily unavailable.",
    );
    expect(screen.queryByText("internal hostname")).toBeNull();
  });

  it("selects a result, loads conditions, and renders them for the selected location", async () => {
    vi.useFakeTimers();
    const weather = deferred<typeof clearDayConditions>();
    const getCurrentConditions = vi.fn().mockReturnValue(weather.promise);
    const apiClient = client({ getCurrentConditions });
    render(<WeatherScreen apiClient={apiClient} />);

    query("Portland");
    await elapseSearchDebounce();
    fireEvent.click(screen.getAllByRole("option")[0]!);

    expect(getCurrentConditions).toHaveBeenCalledWith(
      locations[0],
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByText("Loading current conditions…")).toBeTruthy();

    await act(async () => {
      weather.resolve(clearDayConditions);
      await Promise.resolve();
    });
    expect(screen.getByText("20.4°C")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Portland" })).toBeTruthy();
  });

  it("suppresses stale weather responses after a quick reselection and aborts the old request", async () => {
    vi.useFakeTimers();
    const first = deferred<typeof clearDayConditions>();
    const second = deferred<typeof clearDayConditions>();
    const getCurrentConditions = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const apiClient = client({ getCurrentConditions });
    render(<WeatherScreen apiClient={apiClient} />);

    query("Portland");
    await elapseSearchDebounce();
    const options = screen.getAllByRole("option");
    fireEvent.click(options[0]!);
    const firstSignal = (
      getCurrentConditions.mock.calls[0]?.[1] as { signal: AbortSignal }
    ).signal;
    fireEvent.click(options[1]!);

    expect(firstSignal.aborted).toBe(true);
    await act(async () => {
      first.resolve(clearDayConditions);
      await Promise.resolve();
    });
    expect(screen.queryByText("20.4°C")).toBeNull();

    await act(async () => {
      second.resolve({ ...clearDayConditions, temperatureC: 7.2 });
      await Promise.resolve();
    });
    expect(screen.getByText("7.2°C")).toBeTruthy();
  });

  it("renders safe weather failure copy", async () => {
    vi.useFakeTimers();
    const apiClient = client({
      getCurrentConditions: vi
        .fn()
        .mockRejectedValue(new Error("provider secret")),
    });
    render(<WeatherScreen apiClient={apiClient} />);

    query("Portland");
    await elapseSearchDebounce();
    fireEvent.click(screen.getAllByRole("option")[0]!);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByRole("alert").textContent).toContain(
      "Current conditions are temporarily unavailable.",
    );
    expect(screen.queryByText("provider secret")).toBeNull();
  });
});
