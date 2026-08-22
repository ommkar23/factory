import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CurrentConditionsCard } from "../components/current-conditions-card";
const location = {
  countryCode: "US",
  id: "5746545",
  latitude: 45.5234,
  longitude: -122.6762,
  name: "Portland",
  region: "Oregon, United States",
  timezone: "America/Los_Angeles",
};
const conditions = {
  apparentTemperatureC: 19.4,
  condition: { kind: "partly-cloudy", label: "Partly cloudy" },
  humidityPercent: 54,
  isDay: true,
  observedAt: "2026-08-14T10:42",
  precipitationMm: 0.2,
  temperatureC: 20.1,
  timezone: "America/Los_Angeles",
  weatherCode: 2,
  windDirectionDegrees: 337.5,
  windDirectionLabel: "N",
  windSpeedKmh: 11.5,
};
describe("CurrentConditionsCard", () => {
  it("renders normalized metrics with explicit metric units and semantic condition label", () => {
    render(
      <CurrentConditionsCard conditions={conditions} location={location} />,
    );
    expect(screen.getByText("20.1°C")).toBeTruthy();
    expect(screen.getByText("Partly cloudy")).toBeTruthy();
    expect(screen.getByText("19.4°C")).toBeTruthy();
    expect(screen.getByText("54%")).toBeTruthy();
    expect(screen.getByText("0.2 mm")).toBeTruthy();
    expect(screen.getByText("N 11.5 km/h")).toBeTruthy();
    expect(screen.getByText("Observed locally 2026-08-14T10:42")).toBeTruthy();
    const attribution = screen.getByRole("link", {
      name: "Weather data by Open-Meteo.com",
    });
    expect(attribution.getAttribute("href")).toBe("https://open-meteo.com/");
  });
});
