import React from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearDayConditions,
  cloudyNightConditions,
  locations,
} from "../fixtures/weather-fixtures";
import { useWeatherComparison } from "../hooks/use-weather-comparison";
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}
function comparisonLocation(index) {
  return {
    ...locations[0],
    id: `comparison-${index}`,
    name: `Comparison ${index}`,
  };
}
function signalAt(mock, index) {
  return (mock.mock.calls[index]?.[1]).signal;
}
afterEach(cleanup);
describe("useWeatherComparison", () => {
  it("adds a location in loading state and replaces only it when its request succeeds", async () => {
    const request = deferred();
    const getCurrentConditions = vi.fn().mockReturnValue(request.promise);
    const dataSource = { getCurrentConditions };
    const { result } = renderHook(() => useWeatherComparison(dataSource));
    let outcome;
    act(() => {
      outcome = result.current.addLocation(locations[0]);
    });
    expect(outcome).toBe("added");
    expect(result.current.entries).toEqual([
      { location: locations[0], status: "loading" },
    ]);
    expect(getCurrentConditions).toHaveBeenCalledWith(
      locations[0],
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    await act(async () => {
      request.resolve(clearDayConditions);
      await request.promise;
    });
    expect(result.current.entries).toEqual([
      {
        conditions: clearDayConditions,
        location: locations[0],
        status: "ready",
      },
    ]);
  });
  it("rejects duplicate and sixth selections without fetching or changing insertion order", () => {
    const requests = Array.from({ length: 5 }, () => deferred());
    const getCurrentConditions = vi
      .fn()
      .mockImplementation(() => requests.shift().promise);
    const { result } = renderHook(() =>
      useWeatherComparison({ getCurrentConditions }),
    );
    const fiveLocations = Array.from({ length: 5 }, (_, index) =>
      comparisonLocation(index),
    );
    act(() => {
      fiveLocations.forEach((location) => {
        expect(result.current.addLocation(location)).toBe("added");
      });
    });
    const selectedIds = fiveLocations.map((location) => location.id);
    expect(result.current.count).toBe(5);
    expect(result.current.isAtLimit).toBe(true);
    expect(result.current.selectedLocationIds).toEqual(selectedIds);
    expect(getCurrentConditions).toHaveBeenCalledTimes(5);
    act(() => {
      expect(result.current.addLocation(fiveLocations[0])).toBe("duplicate");
      expect(result.current.addLocation(comparisonLocation(5))).toBe("limit");
    });
    expect(getCurrentConditions).toHaveBeenCalledTimes(5);
    expect(result.current.selectedLocationIds).toEqual(selectedIds);
  });
  it("keeps entries independent when later requests settle before earlier failures", async () => {
    const first = deferred();
    const second = deferred();
    const getCurrentConditions = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result } = renderHook(() =>
      useWeatherComparison({ getCurrentConditions }),
    );
    act(() => {
      result.current.addLocation(locations[0]);
      result.current.addLocation(locations[1]);
    });
    await act(async () => {
      second.resolve(clearDayConditions);
      await second.promise;
    });
    expect(result.current.entries).toEqual([
      { location: locations[0], status: "loading" },
      {
        conditions: clearDayConditions,
        location: locations[1],
        status: "ready",
      },
    ]);
    await act(async () => {
      first.reject(new Error("provider secret"));
      await first.promise.catch(() => undefined);
    });
    expect(result.current.entries).toEqual([
      {
        error: expect.objectContaining({
          message: "Current conditions are unavailable.",
        }),
        location: locations[0],
        status: "error",
      },
      {
        conditions: clearDayConditions,
        location: locations[1],
        status: "ready",
      },
    ]);
    expect(result.current.entries[0]).not.toHaveProperty("conditions");
  });
  it("retries only a failed location with a new request and ignores prior provider details", async () => {
    const failed = deferred();
    const second = deferred();
    const retry = deferred();
    const getCurrentConditions = vi
      .fn()
      .mockReturnValueOnce(failed.promise)
      .mockReturnValueOnce(second.promise)
      .mockReturnValueOnce(retry.promise);
    const { result } = renderHook(() =>
      useWeatherComparison({ getCurrentConditions }),
    );
    act(() => {
      result.current.addLocation(locations[0]);
      result.current.addLocation(locations[1]);
    });
    await act(async () => {
      failed.reject(new Error("provider secret"));
      await failed.promise.catch(() => undefined);
    });
    const firstSignal = signalAt(getCurrentConditions, 0);
    act(() => {
      expect(result.current.retryLocation(locations[0].id)).toBe(true);
      expect(result.current.retryLocation(locations[1].id)).toBe(false);
    });
    expect(firstSignal.aborted).toBe(false);
    expect(getCurrentConditions).toHaveBeenCalledTimes(3);
    expect(signalAt(getCurrentConditions, 2)).not.toBe(firstSignal);
    expect(result.current.entries).toEqual([
      { location: locations[0], status: "loading" },
      { location: locations[1], status: "loading" },
    ]);
    await act(async () => {
      retry.resolve(clearDayConditions);
      await retry.promise;
    });
    expect(result.current.entries[0]).toEqual({
      conditions: clearDayConditions,
      location: locations[0],
      status: "ready",
    });
    expect(result.current.entries[1]).toEqual({
      location: locations[1],
      status: "loading",
    });
  });
  it("aborts and removes an active entry without letting an abort-ignoring response resurrect it", async () => {
    const request = deferred();
    const getCurrentConditions = vi.fn().mockReturnValue(request.promise);
    const { result } = renderHook(() =>
      useWeatherComparison({ getCurrentConditions }),
    );
    act(() => {
      result.current.addLocation(locations[0]);
      result.current.removeLocation(locations[0].id);
    });
    expect(signalAt(getCurrentConditions, 0).aborted).toBe(true);
    expect(result.current.entries).toEqual([]);
    await act(async () => {
      request.resolve(clearDayConditions);
      await request.promise;
    });
    expect(result.current.entries).toEqual([]);
  });
  it("ignores an old abort-ignoring response after the same location is re-added", async () => {
    const first = deferred();
    const second = deferred();
    const getCurrentConditions = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result } = renderHook(() =>
      useWeatherComparison({ getCurrentConditions }),
    );
    act(() => {
      result.current.addLocation(locations[0]);
      result.current.removeLocation(locations[0].id);
      result.current.addLocation(locations[0]);
    });
    expect(signalAt(getCurrentConditions, 0).aborted).toBe(true);
    expect(result.current.entries).toEqual([
      { location: locations[0], status: "loading" },
    ]);
    await act(async () => {
      second.resolve(cloudyNightConditions);
      await second.promise;
    });
    await act(async () => {
      first.resolve(clearDayConditions);
      await first.promise;
    });
    expect(result.current.entries).toEqual([
      {
        conditions: cloudyNightConditions,
        location: locations[0],
        status: "ready",
      },
    ]);
  });
  it("aborts every active request when unmounted", () => {
    const first = deferred();
    const second = deferred();
    const getCurrentConditions = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result, unmount } = renderHook(() =>
      useWeatherComparison({ getCurrentConditions }),
    );
    act(() => {
      result.current.addLocation(locations[0]);
      result.current.addLocation(locations[1]);
    });
    unmount();
    expect(signalAt(getCurrentConditions, 0).aborted).toBe(true);
    expect(signalAt(getCurrentConditions, 1).aborted).toBe(true);
  });
});
