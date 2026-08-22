import React from "react";
import { Alert } from "#components/alert";
const toneClasses = {
  info: "bg-card text-card-foreground",
  success: "bg-secondary text-secondary-foreground",
  warning: "border-primary/30 bg-secondary text-secondary-foreground",
  error: undefined,
};
export function StatusMessage({ children, tone = "info" }) {
  const assertive = tone === "warning" || tone === "error";
  return (
    <Alert
      aria-live={assertive ? "assertive" : "polite"}
      className={toneClasses[tone]}
      data-tone={tone}
      role={assertive ? "alert" : "status"}
      variant={tone === "error" ? "destructive" : "default"}
    >
      {children}
    </Alert>
  );
}
