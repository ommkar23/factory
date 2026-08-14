import type { CurrentConditions, Location } from "../components/weather-types";

export const locations: readonly Location[] = [
  { id: "portland-or", name: "Portland", region: "Oregon, United States" },
  { id: "portland-me", name: "Portland", region: "Maine, United States" },
  { id: "portland-uk", name: "Portland", region: "Dorset, United Kingdom" },
];

export const selectedLocation = locations[0];

export const clearDayConditions: CurrentConditions = {
  condition: "Clear",
  feelsLike: "68°",
  humidity: "54%",
  localObservationTime: "10:42 AM",
  precipitation: "0%",
  temperature: "70°",
  wind: "NW 7 mph",
};

export const cloudyNightConditions: CurrentConditions = {
  condition: "Cloudy",
  feelsLike: "47°",
  humidity: "78%",
  localObservationTime: "9:18 PM",
  precipitation: "10%",
  temperature: "49°",
  wind: "S 4 mph",
};

export const rainyConditions: CurrentConditions = {
  condition: "Light rain",
  feelsLike: "55°",
  humidity: "89%",
  localObservationTime: "2:30 PM",
  precipitation: "60%",
  temperature: "57°",
  wind: "SW 12 mph",
};
