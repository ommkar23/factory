export const locations = [
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
export const clearDayConditions = {
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
export const cloudyNightConditions = {
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
export const rainyConditions = {
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
export const unknownConditions = {
  ...clearDayConditions,
  condition: { kind: "unknown", label: "Unknown conditions" },
  isDay: false,
  weatherCode: 999,
};
export const comparisonLocations = [
  ...locations,
  {
    countryCode: "JP",
    id: "1850147",
    latitude: 35.6762,
    longitude: 139.6503,
    name: "Tokyo",
    region: "Tokyo, Japan",
    timezone: "Asia/Tokyo",
  },
  {
    countryCode: "AU",
    id: "2147714",
    latitude: -33.8688,
    longitude: 151.2093,
    name: "Sydney",
    region: "New South Wales, Australia",
    timezone: "Australia/Sydney",
  },
];
export const readyComparisonEntries = [
  {
    conditions: clearDayConditions,
    location: comparisonLocations[0],
    status: "ready",
  },
  {
    conditions: cloudyNightConditions,
    location: comparisonLocations[1],
    status: "ready",
  },
  {
    conditions: rainyConditions,
    location: comparisonLocations[2],
    status: "ready",
  },
  {
    conditions: { ...clearDayConditions, temperatureC: 27.6 },
    location: comparisonLocations[3],
    status: "ready",
  },
  {
    conditions: { ...cloudyNightConditions, temperatureC: 16.2 },
    location: comparisonLocations[4],
    status: "ready",
  },
];
