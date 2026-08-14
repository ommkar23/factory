import { useId, type ReactNode } from "react";

import type { CurrentConditions, Location } from "./weather-types";

export type { CurrentConditions } from "./weather-types";
import styles from "./weather-ui.module.css";

export type CurrentConditionsCardProps = {
  action?: ReactNode;
  conditions: CurrentConditions;
  headingLevel?: 2 | 3;
  location: Location;
};

function conditionSymbol(conditions: CurrentConditions): string {
  switch (conditions.condition.kind) {
    case "clear":
    case "partly-cloudy":
      return conditions.isDay ? "☀" : "☾";
    case "fog":
      return "≋";
    case "drizzle":
    case "freezing-drizzle":
    case "rain":
    case "freezing-rain":
    case "rain-showers":
      return "☂";
    case "snow":
    case "snow-grains":
    case "snow-showers":
      return "❄";
    case "thunderstorm":
    case "thunderstorm-hail":
      return "ϟ";
    case "unknown":
      return "◌";
  }
}

export function CurrentConditionsCard({
  action,
  conditions,
  headingLevel = 2,
  location,
}: CurrentConditionsCardProps) {
  const headingId = useId();
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const details = [
    ["Feels like", `${conditions.apparentTemperatureC}°C`],
    ["Humidity", `${conditions.humidityPercent}%`],
    ["Precipitation", `${conditions.precipitationMm} mm`],
    [
      "Wind",
      `${conditions.windDirectionLabel} ${conditions.windSpeedKmh} km/h`,
    ],
  ];

  return (
    <article className={styles.conditionsCard} aria-labelledby={headingId}>
      <div className={styles.conditionsHeader}>
        <div>
          <p className={styles.kicker}>Current conditions</p>
          <Heading id={headingId}>{location.name}</Heading>
          <p className={styles.observationTime}>
            Observed locally {conditions.observedAt}
          </p>
        </div>
        <span aria-hidden="true" className={styles.conditionIcon}>
          {conditionSymbol(conditions)}
        </span>
      </div>
      <div className={styles.temperatureRow}>
        <p className={styles.temperature}>{conditions.temperatureC}°C</p>
        <p className={styles.conditionText}>{conditions.condition.label}</p>
      </div>
      <dl className={styles.conditionsList}>
        {details.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <div className={styles.conditionsFooter}>
        <p className={styles.attribution}>
          <a href="https://open-meteo.com/">Weather data by Open-Meteo.com</a>
        </p>
        {action}
      </div>
    </article>
  );
}
