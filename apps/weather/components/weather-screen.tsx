import { useState } from "react";

import {
  clearDayConditions,
  locations,
  selectedLocation,
} from "../fixtures/weather-fixtures";
import { CurrentConditionsCard } from "./current-conditions-card";
import { LocationSearch } from "./location-search";
import type { Location } from "./weather-types";
import styles from "./weather-ui.module.css";

export function WeatherScreen() {
  const [announcement, setAnnouncement] = useState("");
  const [query, setQuery] = useState("Portland");
  const [location, setLocation] = useState<Location>(selectedLocation);
  const filteredLocations = locations.filter((candidate) =>
    candidate.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const state = query.trim()
    ? filteredLocations.length
      ? "results"
      : "no-results"
    : "selected";

  return (
    <main className={styles.weatherScreen}>
      <div className={styles.screenIntro}>
        <p className={styles.kicker}>Weather, clearly</p>
        <h1>Know the air around you.</h1>
        <p>Calm, focused current conditions for the place you choose.</p>
      </div>
      <div className={styles.screenGrid}>
        <LocationSearch
          locations={filteredLocations}
          onQueryChange={setQuery}
          onSelect={(nextLocation) => {
            setLocation(nextLocation);
            setAnnouncement(
              `Showing conditions for ${nextLocation.name}, ${nextLocation.region}.`,
            );
          }}
          query={query}
          selectedLocation={location}
          state={state}
        />
        <CurrentConditionsCard
          conditions={clearDayConditions}
          location={location}
        />
        <p className={styles.selectionAnnouncement} role="status">
          {announcement}
        </p>
      </div>
    </main>
  );
}
