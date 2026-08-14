import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { CurrentConditionsCard } from "../components/current-conditions-card";
import {
  clearDayConditions,
  cloudyNightConditions,
  rainyConditions,
  selectedLocation,
} from "../fixtures/weather-fixtures";

const visuallyHidden = {
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute" as const,
  width: "1px",
};

const meta = {
  component: CurrentConditionsCard,
  decorators: [
    (Story: () => ReactNode) => (
      <main aria-label="Weather current conditions preview">
        <h1 style={visuallyHidden}>Weather current conditions</h1>
        <Story />
      </main>
    ),
  ],
  title: "Weather/CurrentConditionsCard",
} satisfies Meta<typeof CurrentConditionsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Daytime: Story = {
  args: { conditions: clearDayConditions, location: selectedLocation },
};

export const Nighttime: Story = {
  args: { conditions: cloudyNightConditions, location: selectedLocation },
};

export const Rainy: Story = {
  args: { conditions: rainyConditions, location: selectedLocation },
};
