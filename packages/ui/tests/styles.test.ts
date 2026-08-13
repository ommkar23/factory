import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const styles = readFileSync(
  resolve(import.meta.dirname, "../src/styles.css"),
  "utf8",
);

describe("Factory UI design token stylesheet", () => {
  it("publishes semantic tokens, responsive breakpoints, focus styling, and reduced-motion support", () => {
    expect(styles).toContain("--factory-color-action-primary");
    expect(styles).toContain("--factory-color-focus-ring");
    expect(styles).toContain("@media (min-width: 48rem)");
    expect(styles).toContain("@media (min-width: 64rem)");
    expect(styles).toContain(":focus-visible");
    expect(styles).toContain("prefers-reduced-motion: reduce");
    expect(styles).not.toContain("transition: all");
  });

  it("documents deterministic WCAG AA text, UI, and focus token-pair contrast evidence", () => {
    expect(styles).toContain("--factory-contrast-text-on-surface: 15.8");
    expect(styles).toContain("--factory-contrast-action-on-action: 7;");
    expect(styles).toContain("--factory-contrast-focus-on-surface: 5.8");
  });
});
