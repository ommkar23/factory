import type { ReactNode } from "react";

export type BadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "error";
};
export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span className={`factory-badge factory-badge--${tone}`}>{children}</span>
  );
}
