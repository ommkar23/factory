"use client";
import React from "react";
import { useEffect, useRef, useState } from "react";
import { WeatherComparisonScreen } from "./weather-comparison-screen";
import { useWeatherComparison } from "../hooks/use-weather-comparison";
import { sameOriginClient } from "../lib/weather-api-client";
const SEARCH_ERROR_MESSAGE =
  "Location search is temporarily unavailable. Try again shortly.";
export function WeatherScreen({ apiClient = sameOriginClient }) {
  const comparison = useWeatherComparison(apiClient);
  const [query, setQuery] = useState("");
  const [locations, setLocations] = useState([]);
  const [searchAnnouncement, setSearchAnnouncement] = useState();
  const [searchState, setSearchState] = useState("default");
  const searchController = useRef(undefined);
  const searchTimer = useRef(undefined);
  const searchVersion = useRef(0);
  const normalizedQuery = query.trim();
  function cancelSearchWork() {
    if (searchTimer.current !== undefined) {
      window.clearTimeout(searchTimer.current);
      searchTimer.current = undefined;
    }
    searchController.current?.abort();
    searchController.current = undefined;
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
    },
    [],
  );
  const selectedLocationIds = new Set(comparison.selectedLocationIds);
  const searchResults = locations.map((location) => ({
    eligibility: selectedLocationIds.has(location.id)
      ? "already-added"
      : comparison.isAtLimit
        ? "limit-reached"
        : "available",
    location,
  }));
  function handleQueryChange(nextQuery) {
    setSearchAnnouncement(undefined);
    setQuery(nextQuery);
  }
  function handleSelectLocation(location) {
    const outcome = comparison.addLocation(location);
    const locationLabel = `${location.name}, ${location.region}`;
    if (outcome === "added") {
      setSearchAnnouncement(`Added ${locationLabel} to your comparison.`);
      return;
    }
    if (outcome === "duplicate") {
      setSearchAnnouncement(`${locationLabel} is already in your comparison.`);
      return;
    }
    setSearchAnnouncement("You can compare up to five locations at once.");
  }
  function handleRemoveLocation(location) {
    comparison.removeLocation(location.id);
    setSearchAnnouncement(`Removed ${location.name}, ${location.region}.`);
  }
  function handleRetryLocation(location) {
    comparison.retryLocation(location.id);
  }
  return (
    <WeatherComparisonScreen
      comparisonCount={comparison.count}
      comparisonLimit={5}
      entries={comparison.entries}
      onQueryChange={handleQueryChange}
      onRemoveLocation={handleRemoveLocation}
      onRetryLocation={handleRetryLocation}
      onSelectLocation={handleSelectLocation}
      searchAnnouncement={searchAnnouncement}
      searchErrorMessage={SEARCH_ERROR_MESSAGE}
      searchQuery={query}
      searchResults={searchResults}
      searchState={searchState}
    />
  );
}
