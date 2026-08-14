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

async function search(query: string) {
  fireEvent.change(screen.getByRole("combobox"), { target: { value: query } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}

function availableOptions() {
  return screen
    .getAllByRole("option")
    .filter((option) => !(option as HTMLButtonElement).disabled);
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("WeatherScreen comparison integration", () => {
  it("starts empty and preserves debounced location search", async () => {
    vi.useFakeTimers();
    const apiClient = client({
      searchLocations: vi.fn().mockResolvedValue([]),
    });
    render(<WeatherScreen apiClient={apiClient} />);

    expect(screen.getByText("0 of 5 locations compared")).toBeTruthy();
    expect(
      screen.getByText("Search for a location to begin your comparison."),
    ).toBeTruthy();

    await search(" p ");
    expect(apiClient.searchLocations).not.toHaveBeenCalled();

    await search("  Portland  ");
    expect(apiClient.searchLocations).toHaveBeenCalledWith(
      "Portland",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(screen.getByText("No locations matched “Portland”.")).toBeTruthy();
  });

  it("keeps entries in insertion order when location requests settle out of order", async () => {
    vi.useFakeTimers();
    const first = deferred<typeof clearDayConditions>();
    const second = deferred<typeof clearDayConditions>();
    const getCurrentConditions = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    render(<WeatherScreen apiClient={client({ getCurrentConditions })} />);

    await search("Portland");
    fireEvent.click(availableOptions()[0]!);
    fireEvent.click(availableOptions()[0]!);

    expect(screen.getByText("2 of 5 locations compared")).toBeTruthy();
    expect(
      screen.getAllByText(`Loading conditions for ${locations[0]!.name}…`),
    ).toHaveLength(2);

    await act(async () => {
      second.resolve({ ...clearDayConditions, temperatureC: 7.2 });
      await Promise.resolve();
    });
    await act(async () => {
      first.resolve({ ...clearDayConditions, temperatureC: 20.4 });
      await Promise.resolve();
    });

    const firstRemove = screen.getByRole("button", {
      name: `Remove ${locations[0]!.name}, ${locations[0]!.region}`,
    });
    const secondRemove = screen.getByRole("button", {
      name: `Remove ${locations[1]!.name}, ${locations[1]!.region}`,
    });
    expect(
      firstRemove.compareDocumentPosition(secondRemove) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("20.4°C")).toBeTruthy();
    expect(screen.getByText("7.2°C")).toBeTruthy();
  });

  it("does not fetch or mutate for duplicate and sixth results and exposes their eligibility", async () => {
    vi.useFakeTimers();
    const comparisonLocations = Array.from({ length: 6 }, (_, index) => ({
      ...locations[index % locations.length]!,
      id: `comparison-${index}`,
      name: `Location ${index + 1}`,
    }));
    const getCurrentConditions = vi.fn().mockResolvedValue(clearDayConditions);
    render(
      <WeatherScreen
        apiClient={client({
          getCurrentConditions,
          searchLocations: vi.fn().mockResolvedValue(comparisonLocations),
        })}
      />,
    );

    await search("Location");
    fireEvent.click(availableOptions()[0]!);
    expect(screen.getByText("Already added")).toBeTruthy();
    expect(
      (screen.getAllByRole("option")[0] as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getAllByRole("option")[0]!);
    expect(getCurrentConditions).toHaveBeenCalledTimes(1);

    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(availableOptions()[0]!);
    }

    expect(screen.getByText("5 of 5 locations compared")).toBeTruthy();
    expect(getCurrentConditions).toHaveBeenCalledTimes(5);
    const sixth = screen.getByRole("option", { name: /Location 6/ });
    expect((sixth as HTMLButtonElement).disabled).toBe(true);
    expect(sixth.textContent).toContain("Limit reached");
    fireEvent.click(sixth);
    expect(getCurrentConditions).toHaveBeenCalledTimes(5);
  });

  it("aborts active comparison requests on unmount without stale UI updates", async () => {
    vi.useFakeTimers();
    const pending = deferred<typeof clearDayConditions>();
    const getCurrentConditions = vi.fn().mockReturnValue(pending.promise);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const view = render(
      <WeatherScreen apiClient={client({ getCurrentConditions })} />,
    );

    await search("Portland");
    fireEvent.click(availableOptions()[0]!);
    const signal = (
      getCurrentConditions.mock.calls[0]?.[1] as { signal: AbortSignal }
    ).signal;

    view.unmount();
    expect(signal.aborted).toBe(true);

    await act(async () => {
      pending.resolve(clearDayConditions);
      await Promise.resolve();
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("renders safe failure feedback and retries or removes only the affected location", async () => {
    vi.useFakeTimers();
    const failed = deferred<typeof clearDayConditions>();
    const retried = deferred<typeof clearDayConditions>();
    const getCurrentConditions = vi
      .fn()
      .mockReturnValueOnce(failed.promise)
      .mockReturnValueOnce(retried.promise);
    render(<WeatherScreen apiClient={client({ getCurrentConditions })} />);

    await search("Portland");
    fireEvent.click(availableOptions()[0]!);
    await act(async () => {
      failed.reject(new Error("provider secret"));
      await Promise.resolve();
    });

    expect(screen.getByRole("alert").textContent).toContain(
      `Could not load conditions for ${locations[0]!.name}.`,
    );
    expect(screen.queryByText("provider secret")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", {
        name: `Retry ${locations[0]!.name}, ${locations[0]!.region}`,
      }),
    );
    expect(getCurrentConditions).toHaveBeenCalledTimes(2);

    fireEvent.click(
      screen.getByRole("button", {
        name: `Remove ${locations[0]!.name}, ${locations[0]!.region}`,
      }),
    );
    expect(screen.getByText("0 of 5 locations compared")).toBeTruthy();

    await act(async () => {
      retried.resolve(clearDayConditions);
      await Promise.resolve();
    });
    expect(screen.queryByText("20.4°C")).toBeNull();
  });
});
