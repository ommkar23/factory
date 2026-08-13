import type { ReactNode } from "react";
import { Alert } from "./alert";

export type StatusMessageProps = {
  children: ReactNode;
  tone?: "info" | "success";
};
/** @deprecated Use Alert for titled updates. Retained for backwards compatibility. */
export function StatusMessage({ children, tone = "info" }: StatusMessageProps) {
  return (
    <Alert title={tone === "success" ? "Success" : "Information"} tone={tone}>
      {children}
    </Alert>
  );
}
