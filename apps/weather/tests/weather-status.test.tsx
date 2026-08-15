import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WeatherStatus } from "../components/weather-status";

afterEach(cleanup);

describe("WeatherStatus", () => {
  it("uses the shared alert and spinner while retaining a polite loading status", () => {
    render(<WeatherStatus kind="loading" message="Searching locations…" />);

    const status = screen.getByRole("status");
    expect(status.getAttribute("data-slot")).toBe("alert");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.querySelector('[data-slot="spinner"]')).not.toBeNull();
  });

  it("uses an assertive shared alert for errors", () => {
    render(<WeatherStatus kind="error" message="Try again shortly." />);

    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("data-slot")).toBe("alert");
    expect(alert.getAttribute("aria-live")).toBe("assertive");
  });
});
