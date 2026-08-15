import type { Meta, StoryObj } from "@storybook/react-vite";

import { clearDayConditions, locations } from "../fixtures/weather-fixtures";
import { WeatherScreen } from "../components/weather-screen";
import type { WeatherApiClient } from "../lib/weather-api-client";

const storyApiClient: WeatherApiClient = {
  getCurrentConditions: async () => clearDayConditions,
  searchLocations: async () => locations,
};

const meta = {
  component: WeatherScreen,
  parameters: { a11y: { test: "error" }, layout: "fullscreen" },
  title: "Weather/Screen",
} satisfies Meta<typeof WeatherScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Composed: Story = {
  args: { apiClient: storyApiClient },
};
