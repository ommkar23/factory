import { Alert } from "@factory/ui/components/alert";
import { Spinner } from "@factory/ui/components/spinner";

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
  const isError = kind === "error";

  return (
    <Alert
      aria-live={isError ? "assertive" : "polite"}
      className={`${styles.status} ${styles[`status${kind}`]}`}
      role={isError ? "alert" : "status"}
      variant={isError ? "destructive" : "default"}
    >
      {kind === "loading" ? <Spinner aria-hidden="true" /> : null}
      <span>
        <strong>{label}.</strong> {message}
      </span>
    </Alert>
  );
}
