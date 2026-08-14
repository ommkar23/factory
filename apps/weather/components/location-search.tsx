"use client";

import { useEffect, useId, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";

import type { Location } from "./weather-types";
import { WeatherStatus } from "./weather-status";
import styles from "./weather-ui.module.css";

export type LocationSearchState =
  "default" | "loading" | "results" | "no-results" | "error" | "selected";

export type LocationSearchProps = {
  errorMessage?: string;
  locations?: readonly Location[];
  onQueryChange: (query: string) => void;
  onSelect: (location: Location) => void;
  query: string;
  selectedLocation?: Location;
  state?: LocationSearchState;
};

export function LocationSearch({
  errorMessage = "We could not find locations right now. Try again shortly.",
  locations = [],
  onQueryChange,
  onSelect,
  query,
  selectedLocation,
  state = "default",
}: LocationSearchProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const idPrefix = useId();
  const headingId = `${idPrefix}-location-search-heading`;
  const inputId = `${idPrefix}-location-search`;
  const helpId = `${idPrefix}-location-search-help`;
  const resultId = `${idPrefix}-location-results`;
  const hasResults = state === "results" && locations.length > 0;
  const safeActiveIndex = hasResults
    ? Math.min(activeIndex, locations.length - 1)
    : 0;
  const activeLocation = hasResults ? locations[safeActiveIndex] : undefined;

  useEffect(() => {
    setActiveIndex((index) =>
      Math.min(index, Math.max(locations.length - 1, 0)),
    );
  }, [locations.length]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setActiveIndex(0);
    onQueryChange(event.target.value);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!hasResults) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % locations.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(
        (index) => (index - 1 + locations.length) % locations.length,
      );
    }

    if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    }

    if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(locations.length - 1);
    }

    if (event.key === "Enter" && activeLocation) {
      event.preventDefault();
      onSelect(activeLocation);
    }
  }

  return (
    <section className={styles.searchPanel} aria-labelledby={headingId}>
      <div className={styles.sectionHeading}>
        <p className={styles.kicker}>Your place</p>
        <h2 id={headingId}>Find a location</h2>
      </div>
      <label className={styles.searchLabel} htmlFor={inputId}>
        Search city or postal code
      </label>
      <input
        aria-activedescendant={
          activeLocation ? `${resultId}-${activeLocation.id}` : undefined
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
        Choose a result to view its current conditions.
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
          className={styles.resultList}
          id={resultId}
          role="listbox"
          aria-label="Location results"
        >
          {locations.map((location, index) => {
            const isActive = index === safeActiveIndex;
            return (
              <li key={location.id} role="none">
                <button
                  aria-selected={isActive}
                  className={styles.resultButton}
                  data-active={isActive}
                  id={`${resultId}-${location.id}`}
                  onClick={() => {
                    setActiveIndex(index);
                    onSelect(location);
                  }}
                  role="option"
                  tabIndex={-1}
                  type="button"
                >
                  <span>{location.name}</span>
                  <span className={styles.resultMeta}>{location.region}</span>
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
