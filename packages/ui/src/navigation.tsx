import type { ReactNode } from "react";

export type NavigationItem = { current?: boolean; href: string; label: string };
export type NavigationProps = {
  actions?: ReactNode;
  ariaLabel: string;
  brand: ReactNode;
  items: NavigationItem[];
};

export function Navigation({
  actions,
  ariaLabel,
  brand,
  items,
}: NavigationProps) {
  return (
    <nav aria-label={ariaLabel} className="factory-navigation">
      <div className="factory-navigation__brand">{brand}</div>
      <ul className="factory-navigation__links">
        {items.map((item) => (
          <li key={item.href}>
            <a
              aria-current={item.current ? "page" : undefined}
              className="factory-navigation__link"
              href={item.href}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      {actions ? (
        <div className="factory-navigation__actions">{actions}</div>
      ) : null}
    </nav>
  );
}
