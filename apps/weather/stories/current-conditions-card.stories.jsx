import React from "react";
import { CurrentConditionsCard } from "../components/current-conditions-card";
import {
  clearDayConditions,
  cloudyNightConditions,
  rainyConditions,
  selectedLocation,
  unknownConditions,
} from "../fixtures/weather-fixtures";
const visuallyHidden = {
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  width: "1px",
};
const meta = {
  component: CurrentConditionsCard,
  decorators: [
    (Story) => (
      <main aria-label="Weather current conditions preview">
        <h1 style={visuallyHidden}>Weather current conditions</h1>
        <Story />
      </main>
    ),
  ],
  parameters: { a11y: { test: "error" } },
  title: "Weather/CurrentConditionsCard",
};
export default meta;
export const Daytime = {
  args: { conditions: clearDayConditions, location: selectedLocation },
};
export const Nighttime = {
  args: { conditions: cloudyNightConditions, location: selectedLocation },
};
export const Rainy = {
  args: { conditions: rainyConditions, location: selectedLocation },
};
export const Unknown = {
  args: { conditions: unknownConditions, location: selectedLocation },
};
