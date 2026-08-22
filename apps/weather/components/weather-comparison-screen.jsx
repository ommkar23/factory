"use client";
import React from "react";
import { useId } from "react";
import { Badge } from "@factory/ui/components/badge";
import { Button } from "@factory/ui/components/button";
import { CurrentConditionsCard } from "./current-conditions-card";
import { LocationSearch } from "./location-search";
import { WeatherStatus } from "./weather-status";
import styles from "./weather-ui.module.css";
function ComparisonEntryCard({ entry, onRemoveLocation, onRetryLocation }) {
  const headingId = useId();
  const locationLabel = `${entry.location.name}, ${entry.location.region}`;
  const removeAction = (
    <Button
      className={styles.cardAction}
      onClick={() => onRemoveLocation(entry.location)}
      type="button"
      variant="outline"
    >
      Remove {locationLabel}
    </Button>
  );
  if (entry.status === "ready") {
    return (
      <CurrentConditionsCard
        action={removeAction}
        conditions={entry.conditions}
        headingLevel={3}
        location={entry.location}
      />
    );
  }
  return (
    <article className={styles.comparisonStateCard} aria-labelledby={headingId}>
      <div>
        <p className={styles.kicker}>Current conditions</p>
        <h3 className={styles.locationTitle} id={headingId}>
          {entry.location.name}
        </h3>
        <p className={styles.observationTime}>{entry.location.region}</p>
      </div>
      {entry.status === "loading" ? (
        <WeatherStatus
          kind="loading"
          message={`Loading conditions for ${entry.location.name}…`}
        />
      ) : (
        <WeatherStatus
          kind="error"
          message={`Could not load conditions for ${entry.location.name}. Retry to try again.`}
        />
      )}
      <div className={styles.cardActions}>
        {entry.status === "error" ? (
          <Button
            className={styles.cardAction}
            onClick={() => onRetryLocation(entry.location)}
            type="button"
            variant="outline"
          >
            Retry {locationLabel}
          </Button>
        ) : null}
        {removeAction}
      </div>
    </article>
  );
}
export function WeatherComparisonScreen({
  comparisonCount,
  comparisonLimit,
  entries,
  onQueryChange,
  onRemoveLocation,
  onRetryLocation,
  onSelectLocation,
  searchAnnouncement,
  searchErrorMessage,
  searchQuery,
  searchResults,
  searchState,
}) {
  const comparisonHeadingId = useId();
  const countLabel = `${comparisonCount} of ${comparisonLimit} locations compared`;
  return (
    <main
      className={`${styles.weatherScreen} ${styles.weatherComparisonScreen}`}
    >
      <div className={styles.screenIntro}>
        <p className={styles.kicker}>Weather, compared</p>
        <h1>Compare the air around you.</h1>
        <p>Keep up to {comparisonLimit} current conditions in view at once.</p>
      </div>
      <div className={styles.comparisonGrid}>
        <LocationSearch
          errorMessage={searchErrorMessage}
          onQueryChange={onQueryChange}
          onSelect={onSelectLocation}
          query={searchQuery}
          results={searchResults}
          state={searchState}
        />
        <section
          className={styles.comparisonRegion}
          aria-labelledby={comparisonHeadingId}
        >
          <div className={styles.comparisonHeader}>
            <div>
              <p className={styles.kicker}>Your comparison</p>
              <h2 id={comparisonHeadingId}>Current conditions</h2>
            </div>
            <Badge
              aria-live="polite"
              className={styles.comparisonCount}
              variant="outline"
            >
              {countLabel}
            </Badge>
          </div>
          {searchAnnouncement ? (
            <p aria-live="polite" className={styles.searchAnnouncement}>
              {searchAnnouncement}
            </p>
          ) : null}
          {entries.length === 0 ? (
            <WeatherStatus
              kind="empty"
              message="Search for a location to begin your comparison."
            />
          ) : (
            <div className={styles.comparisonCards}>
              {entries.map((entry) => (
                <ComparisonEntryCard
                  entry={entry}
                  key={entry.location.id}
                  onRemoveLocation={onRemoveLocation}
                  onRetryLocation={onRetryLocation}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
