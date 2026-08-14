import type { CurrentConditions, Location } from "./weather-types";

export type { CurrentConditions } from "./weather-types";
import styles from "./weather-ui.module.css";

export type CurrentConditionsCardProps = {
  conditions: CurrentConditions;
  location: Location;
};

const conditionSymbols: Record<CurrentConditions["condition"], string> = {
  Clear: "☀",
  Cloudy: "☁",
  "Light rain": "☂",
};

export function CurrentConditionsCard({
  conditions,
  location,
}: CurrentConditionsCardProps) {
  const details = [
    ["Feels like", conditions.feelsLike],
    ["Humidity", conditions.humidity],
    ["Precipitation", conditions.precipitation],
    ["Wind", conditions.wind],
  ];

  return (
    <article
      className={styles.conditionsCard}
      aria-labelledby="conditions-heading"
    >
      <div className={styles.conditionsHeader}>
        <div>
          <p className={styles.kicker}>Current conditions</p>
          <h2 id="conditions-heading">{location.name}</h2>
          <p className={styles.observationTime}>
            Observed locally {conditions.localObservationTime}
          </p>
        </div>
        <span aria-hidden="true" className={styles.conditionIcon}>
          {conditionSymbols[conditions.condition]}
        </span>
      </div>
      <div className={styles.temperatureRow}>
        <p className={styles.temperature}>{conditions.temperature}</p>
        <p className={styles.conditionText}>{conditions.condition}</p>
      </div>
      <dl className={styles.conditionsList}>
        {details.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
