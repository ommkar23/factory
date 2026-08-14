import type { Meta, StoryObj } from "@storybook/react-vite";

import { WeatherScreen } from "../components/weather-screen";

const meta = {
  component: WeatherScreen,
  parameters: { layout: "fullscreen" },
  title: "Weather/Screen",
} satisfies Meta<typeof WeatherScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Composed: Story = {};
