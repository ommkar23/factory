import { useState } from "react";
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
  const resultId = "weather-location-results";
  const hasResults = state === "results" && locations.length > 0;
  const activeLocation = hasResults ? locations[activeIndex] : undefined;

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
    <section
      className={styles.searchPanel}
      aria-labelledby="location-search-heading"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.kicker}>Your place</p>
        <h2 id="location-search-heading">Find a location</h2>
      </div>
      <label className={styles.searchLabel} htmlFor="location-search">
        Search city, town, or airport
      </label>
      <input
        aria-activedescendant={
          activeLocation ? `${resultId}-${activeLocation.id}` : undefined
        }
        aria-controls={hasResults ? resultId : undefined}
        aria-describedby="location-search-help"
        aria-expanded={hasResults}
        className={styles.searchInput}
        id="location-search"
        onChange={handleChange}
        onKeyDown={handleInputKeyDown}
        placeholder="Try Portland"
        role="combobox"
        type="search"
        value={query}
      />
      <p className={styles.fieldHelp} id="location-search-help">
        Choose a result to view its current conditions.
      </p>
      {state === "loading" ? (
        <WeatherStatus kind="loading" message="Searching locations…" />
      ) : null}
      {state === "no-results" ? (
        <WeatherStatus
          kind="empty"
          message={`No locations matched “${query}”.`}
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
          {locations.map((location) => {
            const isSelected = location.id === selectedLocation?.id;
            return (
              <li key={location.id} role="none">
                <button
                  aria-selected={isSelected}
                  className={styles.resultButton}
                  id={`${resultId}-${location.id}`}
                  onClick={() => onSelect(location)}
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
        <p className={styles.selectedLocation} role="status">
          Showing conditions for <strong>{selectedLocation.name}</strong>,{" "}
          {selectedLocation.region}.
        </p>
      ) : null}
    </section>
  );
}
