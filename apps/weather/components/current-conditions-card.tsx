import type { CurrentConditions, Location } from "./weather-types";

export type { CurrentConditions } from "./weather-types";
import styles from "./weather-ui.module.css";

export type CurrentConditionsCardProps = {
  conditions: CurrentConditions;
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
  conditions,
  location,
}: CurrentConditionsCardProps) {
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
    <article
      className={styles.conditionsCard}
      aria-labelledby="conditions-heading"
    >
      <div className={styles.conditionsHeader}>
        <div>
          <p className={styles.kicker}>Current conditions</p>
          <h2 id="conditions-heading">{location.name}</h2>
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
    </article>
  );
}
