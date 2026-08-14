"use client";

import { useEffect, useRef, useState } from "react";

import { CurrentConditionsCard } from "./current-conditions-card";
import { LocationSearch } from "./location-search";
import { WeatherStatus } from "./weather-status";
import type { CurrentConditions, Location } from "./weather-types";
import {
  sameOriginClient,
  type WeatherApiClient,
} from "../lib/weather-api-client";
import styles from "./weather-ui.module.css";

type WeatherLoadState = "idle" | "loading" | "error" | "ready";

export type WeatherScreenProps = {
  apiClient?: WeatherApiClient;
};

export function WeatherScreen({
  apiClient = sameOriginClient,
}: WeatherScreenProps) {
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState<readonly Location[]>([]);
  const [searchState, setSearchState] = useState<
    "default" | "loading" | "results" | "no-results" | "error" | "selected"
  >("default");
  const [location, setLocation] = useState<Location>();
  const [conditions, setConditions] = useState<CurrentConditions>();
  const [weatherState, setWeatherState] = useState<WeatherLoadState>("idle");
  const searchController = useRef<AbortController | undefined>(undefined);
  const searchTimer = useRef<number | undefined>(undefined);
  const weatherController = useRef<AbortController | undefined>(undefined);
  const searchVersion = useRef(0);
  const weatherVersion = useRef(0);

  const normalizedQuery = query.trim();

  function cancelSearchWork() {
    if (searchTimer.current !== undefined) {
      window.clearTimeout(searchTimer.current);
      searchTimer.current = undefined;
    }
    searchController.current?.abort();
    searchController.current = undefined;
  }

  function cancelWeatherWork() {
    weatherController.current?.abort();
    weatherController.current = undefined;
  }

  useEffect(() => {
    const version = ++searchVersion.current;
    cancelSearchWork();

    if (normalizedQuery.length < 2) {
      setLocations([]);
      setSearchState("default");
      return;
    }

    const controller = new AbortController();
    searchController.current = controller;
    setSearchState("loading");
    setLocations([]);
    const timer = window.setTimeout(() => {
      if (searchTimer.current === timer) {
        searchTimer.current = undefined;
      }
      void apiClient
        .searchLocations(normalizedQuery, { signal: controller.signal })
        .then((nextLocations) => {
          if (searchVersion.current !== version || controller.signal.aborted) {
            return;
          }
          setLocations(nextLocations);
          setSearchState(nextLocations.length ? "results" : "no-results");
        })
        .catch(() => {
          if (searchVersion.current !== version || controller.signal.aborted) {
            return;
          }
          setLocations([]);
          setSearchState("error");
        });
    }, 300);
    searchTimer.current = timer;

    return () => {
      if (searchTimer.current === timer) {
        window.clearTimeout(timer);
        searchTimer.current = undefined;
      }
      if (searchController.current === controller) {
        controller.abort();
        searchController.current = undefined;
      }
    };
  }, [apiClient, normalizedQuery]);

  useEffect(
    () => () => {
      cancelSearchWork();
      cancelWeatherWork();
    },
    [],
  );

  function selectLocation(nextLocation: Location) {
    ++searchVersion.current;
    cancelSearchWork();
    ++weatherVersion.current;
    cancelWeatherWork();

    const version = weatherVersion.current;
    const controller = new AbortController();
    weatherController.current = controller;
    setLocation(nextLocation);
    setLocations([]);
    setSearchState("selected");
    setConditions(undefined);
    setWeatherState("loading");

    void apiClient
      .getCurrentConditions(nextLocation, { signal: controller.signal })
      .then((nextConditions) => {
        if (weatherVersion.current !== version || controller.signal.aborted) {
          return;
        }
        if (weatherController.current === controller) {
          weatherController.current = undefined;
        }
        setConditions(nextConditions);
        setWeatherState("ready");
      })
      .catch(() => {
        if (weatherVersion.current !== version || controller.signal.aborted) {
          return;
        }
        if (weatherController.current === controller) {
          weatherController.current = undefined;
        }
        setWeatherState("error");
      });
  }

  return (
    <main className={styles.weatherScreen}>
      <div className={styles.screenIntro}>
        <p className={styles.kicker}>Weather, clearly</p>
        <h1>Know the air around you.</h1>
        <p>Calm, focused current conditions for the place you choose.</p>
      </div>
      <div className={styles.screenGrid}>
        <LocationSearch
          locations={locations}
          onQueryChange={setQuery}
          onSelect={selectLocation}
          query={query}
          selectedLocation={location}
          state={searchState}
          errorMessage="Location search is temporarily unavailable. Try again shortly."
        />
        {weatherState === "idle" ? (
          <WeatherStatus
            kind="empty"
            message="Search for a location to see current conditions."
          />
        ) : null}
        {weatherState === "loading" ? (
          <WeatherStatus kind="loading" message="Loading current conditions…" />
        ) : null}
        {weatherState === "error" ? (
          <WeatherStatus
            kind="error"
            message="Current conditions are temporarily unavailable. Try again shortly."
          />
        ) : null}
        {weatherState === "ready" && location && conditions ? (
          <CurrentConditionsCard conditions={conditions} location={location} />
        ) : null}
        {weatherState === "ready" && location ? (
          <p className={styles.selectionAnnouncement} role="status">
            Showing conditions for {location.name}, {location.region}.
          </p>
        ) : null}
      </div>
    </main>
  );
}
