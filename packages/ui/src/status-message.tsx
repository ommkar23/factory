import type { ReactNode } from "react";

export type StatusMessageProps = {
  children: ReactNode;
  tone?: "info" | "success";
};

export function StatusMessage({ children, tone = "info" }: StatusMessageProps) {
  const colors =
    tone === "success"
      ? { background: "#ecfdf3", border: "#027a48", text: "#054f31" }
      : { background: "#eff8ff", border: "#175cd3", text: "#102a56" };

  return (
    <p
      role="status"
      style={{
        background: colors.background,
        border: `1px solid ${colors.border}`,
        borderRadius: "0.375rem",
        color: colors.text,
        margin: 0,
        padding: "0.75rem 1rem",
      }}
    >
      {children}
    </p>
  );
}
