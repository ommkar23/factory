import styles from "./weather-ui.module.css";

export type WeatherStatusProps = {
  kind: "loading" | "empty" | "error";
  message: string;
};

export function WeatherStatus({ kind, message }: WeatherStatusProps) {
  const label =
    kind === "loading"
      ? "Loading"
      : kind === "empty"
        ? "No results"
        : "Something went wrong";

  return (
    <div
      aria-live="polite"
      className={`${styles.status} ${styles[`status${kind}`]}`}
      role={kind === "error" ? "alert" : "status"}
    >
      <span>
        <strong>{label}.</strong> {message}
      </span>
    </div>
  );
}
