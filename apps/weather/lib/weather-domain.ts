export type Location = {
  id: string;
  name: string;
  region: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type ConditionKind =
  | "clear"
  | "partly-cloudy"
  | "fog"
  | "drizzle"
  | "freezing-drizzle"
  | "rain"
  | "freezing-rain"
  | "snow"
  | "snow-grains"
  | "rain-showers"
  | "snow-showers"
  | "thunderstorm"
  | "thunderstorm-hail"
  | "unknown";

export type WeatherCondition = { kind: ConditionKind; label: string };

export type CurrentConditions = {
  observedAt: string;
  timezone: string;
  weatherCode: number;
  condition: WeatherCondition;
  isDay: boolean;
  temperatureC: number;
  apparentTemperatureC: number;
  humidityPercent: number;
  precipitationMm: number;
  windSpeedKmh: number;
  windDirectionDegrees: number;
  windDirectionLabel: CardinalDirection;
};

export type CardinalDirection =
  "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export class ProviderPayloadError extends Error {
  override name = "ProviderPayloadError";

  constructor(message: string) {
    super(message);
  }
}

export function cardinalDirection(degrees: number): CardinalDirection {
  if (!Number.isFinite(degrees) || degrees < 0 || degrees > 360) {
    throw new ProviderPayloadError(
      "Wind direction must be between 0 and 360 degrees.",
    );
  }

  const directions: readonly CardinalDirection[] = [
    "N",
    "NE",
    "E",
    "SE",
    "S",
    "SW",
    "W",
    "NW",
  ];
  return directions[Math.round(degrees / 45) % directions.length] ?? "N";
}

const conditions: Readonly<Record<number, WeatherCondition>> = {
  0: { kind: "clear", label: "Clear sky" },
  1: { kind: "partly-cloudy", label: "Mainly clear" },
  2: { kind: "partly-cloudy", label: "Partly cloudy" },
  3: { kind: "partly-cloudy", label: "Overcast" },
  45: { kind: "fog", label: "Fog" },
  48: { kind: "fog", label: "Rime fog" },
  51: { kind: "drizzle", label: "Light drizzle" },
  53: { kind: "drizzle", label: "Moderate drizzle" },
  55: { kind: "drizzle", label: "Dense drizzle" },
  56: { kind: "freezing-drizzle", label: "Light freezing drizzle" },
  57: { kind: "freezing-drizzle", label: "Dense freezing drizzle" },
  61: { kind: "rain", label: "Slight rain" },
  63: { kind: "rain", label: "Moderate rain" },
  65: { kind: "rain", label: "Heavy rain" },
  66: { kind: "freezing-rain", label: "Light freezing rain" },
  67: { kind: "freezing-rain", label: "Heavy freezing rain" },
  71: { kind: "snow", label: "Slight snow fall" },
  73: { kind: "snow", label: "Moderate snow fall" },
  75: { kind: "snow", label: "Heavy snow fall" },
  77: { kind: "snow-grains", label: "Snow grains" },
  80: { kind: "rain-showers", label: "Slight rain showers" },
  81: { kind: "rain-showers", label: "Moderate rain showers" },
  82: { kind: "rain-showers", label: "Violent rain showers" },
  85: { kind: "snow-showers", label: "Slight snow showers" },
  86: { kind: "snow-showers", label: "Heavy snow showers" },
  95: { kind: "thunderstorm", label: "Thunderstorm" },
  96: { kind: "thunderstorm-hail", label: "Thunderstorm with slight hail" },
  99: { kind: "thunderstorm-hail", label: "Thunderstorm with heavy hail" },
};

export function weatherCondition(code: number): WeatherCondition {
  if (!Number.isFinite(code) || !Number.isInteger(code)) {
    throw new ProviderPayloadError("Weather code must be a finite integer.");
  }
  return conditions[code] ?? { kind: "unknown", label: "Unknown conditions" };
}
