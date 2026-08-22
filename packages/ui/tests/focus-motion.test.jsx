import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "../src/components/badge";
import { Button } from "../src/components/button";
import { Input } from "../src/components/input";
import { Skeleton } from "../src/components/skeleton";
import { Spinner } from "../src/components/spinner";
describe("shared focus and reduced-motion contracts", () => {
  it("uses the public focus token as an opaque shared focus indicator", () => {
    const styles = readFileSync(
      resolve(process.cwd(), "src/styles/globals.css"),
      "utf8",
    );
    expect(styles).toMatch(/--factory-focus-ring:\s*oklch\(0\.6 0 0\);/);
    expect(styles).toMatch(/--ring:\s*var\(--factory-focus-ring\);/);
    expect(styles).not.toMatch(
      /--factory-focus-ring:[\s\S]*?color-mix\([\s\S]*?transparent/,
    );
    expect(
      readFileSync(
        resolve(process.cwd(), "../../apps/weather/app/globals.css"),
        "utf8",
      ),
    ).toMatch(/--factory-focus-ring:\s*#087ea4;/);
    render(
      <>
        <Button>Save</Button>
        <Input aria-label="Location" />
        <Badge render={<a href="#status" />}>Ready</Badge>
      </>,
    );
    for (const element of [
      screen.getByRole("button", { name: "Save" }),
      screen.getByRole("textbox", { name: "Location" }),
      screen.getByRole("link", { name: "Ready" }),
    ]) {
      expect(element.className).toContain("focus-visible:ring-ring");
      expect(element.className).not.toContain("ring-ring/50");
    }
  });
  it("keeps the shared focus ring on destructive buttons", () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.className).toContain("focus-visible:ring-ring");
    expect(button.className).not.toContain("focus-visible:ring-destructive/20");
    expect(button.className).not.toContain(
      "dark:focus-visible:ring-destructive/40",
    );
  });
  it("keeps the shared focus ring on destructive link badges", () => {
    render(
      <Badge variant="destructive" render={<a href="#remove" />}>
        Remove
      </Badge>,
    );
    const badge = screen.getByRole("link", { name: "Remove" });
    expect(badge.className).toContain("focus-visible:ring-ring");
    expect(badge.className).not.toContain("focus-visible:ring-destructive/20");
    expect(badge.className).not.toContain(
      "dark:focus-visible:ring-destructive/40",
    );
  });
  it("keeps the shared focus ring on invalid inputs", () => {
    render(<Input aria-invalid aria-label="Invalid location" />);
    const input = screen.getByRole("textbox", { name: "Invalid location" });
    expect(input.className).toContain("focus-visible:ring-ring");
    expect(input.className).toContain("aria-invalid:border-destructive");
    expect(input.className).not.toContain("aria-invalid:ring-destructive/20");
    expect(input.className).not.toContain(
      "dark:aria-invalid:ring-destructive/40",
    );
  });
  it("preserves static feedback while removing non-essential motion", () => {
    render(
      <>
        <Button>Save</Button>
        <Badge render={<a href="#status" />}>Ready</Badge>
        <Spinner />
        <Skeleton aria-label="Loading forecast" />
      </>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    const badge = screen.getByRole("link", { name: "Ready" });
    const spinner = screen.getByRole("status", { name: "Loading" });
    const skeleton = screen.getByLabelText("Loading forecast");
    for (const element of [button, badge]) {
      expect(element.className).toContain("motion-reduce:transition-none");
    }
    expect(button.className).toContain(
      "motion-reduce:active:not-aria-[haspopup]:translate-y-0",
    );
    expect(spinner.getAttribute("class")).toContain(
      "motion-reduce:animate-none",
    );
    expect(skeleton.className).toContain("motion-reduce:animate-none");
  });
});
