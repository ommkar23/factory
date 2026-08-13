import type { AnchorHTMLAttributes, ReactNode } from "react";

export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  variant?: "default" | "subtle";
};

export function Link({
  children,
  className,
  variant = "default",
  ...props
}: LinkProps) {
  return (
    <a
      {...props}
      className={["factory-link", `factory-link--${variant}`, className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </a>
  );
}
