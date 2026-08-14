"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  MAX_COMPARISON_LOCATIONS,
  type AddLocationOutcome,
  type ComparisonEntry,
  type WeatherComparisonDataSource,
} from "../lib/weather-comparison";
import type { Location } from "../lib/weather-domain";

const GENERIC_FAILURE_MESSAGE = "Current conditions are unavailable.";

type ActiveRequest = {
  controller: AbortController;
  generation: number;
};

export type WeatherComparisonController = {
  entries: readonly ComparisonEntry[];
  count: number;
  isAtLimit: boolean;
  selectedLocationIds: readonly string[];
  addLocation: (location: Location) => AddLocationOutcome;
  removeLocation: (locationId: string) => void;
  retryLocation: (locationId: string) => boolean;
};

export function useWeatherComparison(
  dataSource: WeatherComparisonDataSource,
): WeatherComparisonController {
  const [entries, setEntries] = useState<readonly ComparisonEntry[]>([]);
  const entriesRef = useRef(entries);
  const requestsRef = useRef(new Map<string, ActiveRequest>());
  const generationsRef = useRef(new Map<string, number>());

  const replaceEntries = useCallback(
    (nextEntries: readonly ComparisonEntry[]) => {
      entriesRef.current = nextEntries;
      setEntries(nextEntries);
    },
    [],
  );

  const startRequest = useCallback(
    (location: Location) => {
      const previousRequest = requestsRef.current.get(location.id);
      previousRequest?.controller.abort();

      const generation = (generationsRef.current.get(location.id) ?? 0) + 1;
      const controller = new AbortController();
      const activeRequest = { controller, generation };
      generationsRef.current.set(location.id, generation);
      requestsRef.current.set(location.id, activeRequest);

      let request: ReturnType<
        WeatherComparisonDataSource["getCurrentConditions"]
      >;
      try {
        request = dataSource.getCurrentConditions(location, {
          signal: controller.signal,
        });
      } catch (error) {
        request = Promise.reject(error);
      }

      void request.then(
        (conditions) => {
          if (generationsRef.current.get(location.id) !== generation) {
            return;
          }

          if (requestsRef.current.get(location.id) === activeRequest) {
            requestsRef.current.delete(location.id);
          }
          replaceEntries(
            entriesRef.current.map((entry) =>
              entry.location.id === location.id
                ? { conditions, location, status: "ready" }
                : entry,
            ),
          );
        },
        () => {
          if (generationsRef.current.get(location.id) !== generation) {
            return;
          }

          if (requestsRef.current.get(location.id) === activeRequest) {
            requestsRef.current.delete(location.id);
          }
          replaceEntries(
            entriesRef.current.map((entry) =>
              entry.location.id === location.id
                ? {
                    error: new Error(GENERIC_FAILURE_MESSAGE),
                    location,
                    status: "error",
                  }
                : entry,
            ),
          );
        },
      );
    },
    [dataSource, replaceEntries],
  );

  const addLocation = useCallback(
    (location: Location): AddLocationOutcome => {
      const currentEntries = entriesRef.current;
      if (currentEntries.some((entry) => entry.location.id === location.id)) {
        return "duplicate";
      }
      if (currentEntries.length >= MAX_COMPARISON_LOCATIONS) {
        return "limit";
      }

      replaceEntries([...currentEntries, { location, status: "loading" }]);
      startRequest(location);
      return "added";
    },
    [replaceEntries, startRequest],
  );

  const removeLocation = useCallback(
    (locationId: string) => {
      const activeRequest = requestsRef.current.get(locationId);
      activeRequest?.controller.abort();
      requestsRef.current.delete(locationId);
      generationsRef.current.set(
        locationId,
        (generationsRef.current.get(locationId) ?? 0) + 1,
      );
      replaceEntries(
        entriesRef.current.filter((entry) => entry.location.id !== locationId),
      );
    },
    [replaceEntries],
  );

  const retryLocation = useCallback(
    (locationId: string) => {
      const entry = entriesRef.current.find(
        (candidate) => candidate.location.id === locationId,
      );
      if (!entry || entry.status !== "error") {
        return false;
      }

      replaceEntries(
        entriesRef.current.map((candidate) =>
          candidate.location.id === locationId
            ? { location: candidate.location, status: "loading" }
            : candidate,
        ),
      );
      startRequest(entry.location);
      return true;
    },
    [replaceEntries, startRequest],
  );

  useEffect(() => {
    return () => {
      for (const { controller } of requestsRef.current.values()) {
        controller.abort();
      }
      requestsRef.current.clear();
      generationsRef.current.clear();
    };
  }, []);

  return {
    addLocation,
    count: entries.length,
    entries,
    isAtLimit: entries.length >= MAX_COMPARISON_LOCATIONS,
    removeLocation,
    retryLocation,
    selectedLocationIds: entries.map((entry) => entry.location.id),
  };
}
