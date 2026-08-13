import type { ReactNode } from "react";

export type LoadingIndicatorProps = {
  label: ReactNode;
  size?: "sm" | "md" | "lg";
  visuallyHiddenLabel?: boolean;
};
export function LoadingIndicator({
  label,
  size = "md",
  visuallyHiddenLabel = false,
}: LoadingIndicatorProps) {
  return (
    <span
      aria-live="polite"
      className={`factory-loading-indicator factory-loading-indicator--${size}`}
      role="status"
    >
      <span aria-hidden="true" className="factory-loading-indicator__spinner" />
      <span className={visuallyHiddenLabel ? "factory-sr-only" : undefined}>
        {label}
      </span>
    </span>
  );
}
