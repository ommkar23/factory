import type { ReactNode } from "react";

export type CardProps = {
  children: ReactNode;
  footer?: ReactNode;
  heading?: ReactNode;
};

export function Card({ children, footer, heading }: CardProps) {
  return (
    <section className="factory-card">
      {heading ? <h2 className="factory-card__heading">{heading}</h2> : null}
      <div className="factory-card__body">{children}</div>
      {footer ? (
        <footer className="factory-card__footer">{footer}</footer>
      ) : null}
    </section>
  );
}
