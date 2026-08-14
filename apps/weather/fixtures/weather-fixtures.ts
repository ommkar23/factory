import type { CurrentConditions, Location } from "../lib/weather-domain";

export const locations: readonly Location[] = [
  {
    countryCode: "US",
    id: "5746545",
    latitude: 45.5234,
    longitude: -122.6762,
    name: "Portland",
    region: "Oregon, United States",
    timezone: "America/Los_Angeles",
  },
  {
    countryCode: "US",
    id: "4975802",
    latitude: 43.6574,
    longitude: -70.2589,
    name: "Portland",
    region: "Maine, United States",
    timezone: "America/New_York",
  },
  {
    countryCode: "GB",
    id: "2641170",
    latitude: 50.5706,
    longitude: -2.4511,
    name: "Portland",
    region: "Dorset, United Kingdom",
    timezone: "Europe/London",
  },
];

export const selectedLocation = locations[0];

export const clearDayConditions: CurrentConditions = {
  apparentTemperatureC: 19.1,
  condition: { kind: "clear", label: "Clear sky" },
  humidityPercent: 54,
  isDay: true,
  observedAt: "2026-08-14T10:42",
  precipitationMm: 0,
  temperatureC: 20.4,
  timezone: "America/Los_Angeles",
  weatherCode: 0,
  windDirectionDegrees: 315,
  windDirectionLabel: "NW",
  windSpeedKmh: 11.3,
};

export const cloudyNightConditions: CurrentConditions = {
  apparentTemperatureC: 8.3,
  condition: { kind: "partly-cloudy", label: "Overcast" },
  humidityPercent: 78,
  isDay: false,
  observedAt: "2026-08-14T21:18",
  precipitationMm: 0,
  temperatureC: 9.4,
  timezone: "America/Los_Angeles",
  weatherCode: 3,
  windDirectionDegrees: 180,
  windDirectionLabel: "S",
  windSpeedKmh: 6.4,
};

export const rainyConditions: CurrentConditions = {
  apparentTemperatureC: 12.8,
  condition: { kind: "rain", label: "Slight rain" },
  humidityPercent: 89,
  isDay: true,
  observedAt: "2026-08-14T14:30",
  precipitationMm: 0.6,
  temperatureC: 13.9,
  timezone: "America/Los_Angeles",
  weatherCode: 61,
  windDirectionDegrees: 225,
  windDirectionLabel: "SW",
  windSpeedKmh: 19.3,
};

export const unknownConditions: CurrentConditions = {
  ...clearDayConditions,
  condition: { kind: "unknown", label: "Unknown conditions" },
  isDay: false,
  weatherCode: 999,
};
