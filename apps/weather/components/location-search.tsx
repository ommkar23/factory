"use client";

import { useEffect, useId, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

import type { Location } from "./weather-types";
import { WeatherStatus } from "./weather-status";
import styles from "./weather-ui.module.css";

export type LocationSearchState =
  "default" | "loading" | "results" | "no-results" | "error" | "selected";

export type LocationSearchEligibility =
  "available" | "already-added" | "limit-reached";

export type LocationSearchResult = {
  eligibility: LocationSearchEligibility;
  location: Location;
};

export type LocationSearchProps = {
  errorMessage?: string;
  locations?: readonly Location[];
  onQueryChange: (query: string) => void;
  onSelect: (location: Location) => void;
  query: string;
  results?: readonly LocationSearchResult[];
  selectedLocation?: Location;
  state?: LocationSearchState;
};

function eligibilityCopy(eligibility: LocationSearchEligibility): string {
  switch (eligibility) {
    case "available":
      return "Available";
    case "already-added":
      return "Already added";
    case "limit-reached":
      return "Limit reached";
  }
}

export function LocationSearch({
  errorMessage = "We could not find locations right now. Try again shortly.",
  locations = [],
  onQueryChange,
  onSelect,
  query,
  results,
  selectedLocation,
  state = "default",
}: LocationSearchProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const idPrefix = useId();
  const headingId = `${idPrefix}-location-search-heading`;
  const inputId = `${idPrefix}-location-search`;
  const helpId = `${idPrefix}-location-search-help`;
  const resultId = `${idPrefix}-location-results`;
  const searchResults =
    results ??
    locations.map((location) => ({ eligibility: "available", location }));
  const hasResults = state === "results" && searchResults.length > 0;
  const firstAvailableIndex = searchResults.findIndex(
    (result) => result.eligibility === "available",
  );
  const hasAvailableResult = firstAvailableIndex !== -1;
  const boundedActiveIndex = Math.min(
    activeIndex,
    Math.max(searchResults.length - 1, 0),
  );
  const safeActiveIndex =
    hasResults && searchResults[boundedActiveIndex]?.eligibility === "available"
      ? boundedActiveIndex
      : firstAvailableIndex;
  const activeResult =
    hasResults && safeActiveIndex >= 0
      ? searchResults[safeActiveIndex]
      : undefined;

  useEffect(() => {
    setActiveIndex((index) => {
      const boundedIndex = Math.min(
        index,
        Math.max(searchResults.length - 1, 0),
      );
      if (searchResults[boundedIndex]?.eligibility === "available") {
        return boundedIndex;
      }

      return Math.max(firstAvailableIndex, 0);
    });
  }, [firstAvailableIndex, searchResults]);

  function moveActiveIndex(direction: 1 | -1) {
    if (!hasAvailableResult) {
      return;
    }

    setActiveIndex((index) => {
      for (let offset = 1; offset <= searchResults.length; offset += 1) {
        const nextIndex =
          (Math.max(index, firstAvailableIndex) +
            direction * offset +
            searchResults.length) %
          searchResults.length;
        if (searchResults[nextIndex]?.eligibility === "available") {
          return nextIndex;
        }
      }

      return firstAvailableIndex;
    });
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setActiveIndex(0);
    onQueryChange(event.target.value);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!hasResults || !hasAvailableResult) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveIndex(1);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveIndex(-1);
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(firstAvailableIndex);
    }

    if (event.key === "End") {
      event.preventDefault();
      for (let index = searchResults.length - 1; index >= 0; index -= 1) {
        if (searchResults[index]?.eligibility === "available") {
          setActiveIndex(index);
          return;
        }
      }
    }

    if (event.key === "Enter" && activeResult) {
      event.preventDefault();
      onSelect(activeResult.location);
    }
  }

  return (
    <section className={styles.searchPanel} aria-labelledby={headingId}>
      <div className={styles.sectionHeading}>
        <p className={styles.kicker}>Your places</p>
        <h2 id={headingId}>Add a location</h2>
      </div>
      <label className={styles.searchLabel} htmlFor={inputId}>
        Search city or postal code
      </label>
      <input
        aria-activedescendant={
          activeResult ? `${resultId}-${activeResult.location.id}` : undefined
        }
        aria-autocomplete="list"
        aria-controls={hasResults ? resultId : undefined}
        aria-describedby={helpId}
        aria-expanded={hasResults}
        autoComplete="off"
        className={styles.searchInput}
        id={inputId}
        name="location-search"
        onChange={handleChange}
        onKeyDown={handleInputKeyDown}
        placeholder="Try Portland, Maine…"
        role="combobox"
        type="search"
        value={query}
      />
      <p className={styles.fieldHelp} id={helpId}>
        Choose an available result to compare its current conditions.
      </p>
      {state === "loading" ? (
        <WeatherStatus kind="loading" message="Searching locations…" />
      ) : null}
      {state === "no-results" ? (
        <WeatherStatus
          kind="empty"
          message={`No locations matched “${query.trim()}”.`}
        />
      ) : null}
      {state === "error" ? (
        <WeatherStatus kind="error" message={errorMessage} />
      ) : null}
      {hasResults ? (
        <ul
          aria-label="Location results"
          className={styles.resultList}
          id={resultId}
          role="listbox"
        >
          {searchResults.map((result, index) => {
            const { eligibility, location } = result;
            const isActive = index === safeActiveIndex;
            const unavailable = eligibility !== "available";
            return (
              <li key={location.id} role="none">
                <button
                  aria-disabled={unavailable}
                  aria-selected={isActive}
                  className={styles.resultButton}
                  data-active={isActive}
                  data-eligibility={eligibility}
                  disabled={unavailable}
                  id={`${resultId}-${location.id}`}
                  onClick={() => {
                    setActiveIndex(index);
                    onSelect(location);
                  }}
                  role="option"
                  tabIndex={-1}
                  type="button"
                >
                  <span className={styles.resultName}>{location.name}</span>
                  <span className={styles.resultMeta}>{location.region}</span>
                  <span className={styles.resultEligibility}>
                    {eligibilityCopy(eligibility)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {state === "selected" && selectedLocation ? (
        <p className={styles.selectedLocation}>
          Selected {selectedLocation.name}, {selectedLocation.region}.
        </p>
      ) : null}
    </section>
  );
}
