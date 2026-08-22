import React from "react";
import { clearDayConditions, locations } from "../fixtures/weather-fixtures";
import { WeatherScreen } from "../components/weather-screen";
const storyApiClient = {
  getCurrentConditions: async () => clearDayConditions,
  searchLocations: async () => locations,
};
const meta = {
  component: WeatherScreen,
  parameters: { a11y: { test: "error" }, layout: "fullscreen" },
  title: "Weather/Screen",
};
export default meta;
export const Composed = {
  args: { apiClient: storyApiClient },
};
