import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  isLoading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export function Button({
  children,
  className,
  disabled,
  isLoading = false,
  size = "md",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      aria-busy={isLoading || undefined}
      className={[
        "factory-button",
        `factory-button--${variant}`,
        `factory-button--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled || isLoading}
      type={type}
    >
      {isLoading ? (
        <span aria-hidden="true" className="factory-button__spinner" />
      ) : null}
      <span>{children}</span>
      {isLoading ? (
        <span className="factory-sr-only" role="status">
          Saving
        </span>
      ) : null}
    </button>
  );
}
