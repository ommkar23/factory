import type { ReactNode } from "react";

export type AlertProps = {
  children: ReactNode;
  title: ReactNode;
  tone?: "info" | "success" | "warning" | "error";
};
export function Alert({ children, title, tone = "info" }: AlertProps) {
  const urgent = tone === "error";
  return (
    <div
      aria-live={urgent ? undefined : "polite"}
      className={`factory-alert factory-alert--${tone}`}
      role={urgent ? "alert" : "status"}
    >
      <strong className="factory-alert__title">{title}</strong>
      <div className="factory-alert__body">{children}</div>
    </div>
  );
}
