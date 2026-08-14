import { useState } from "react";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { locations, selectedLocation } from "../fixtures/weather-fixtures";
import { LocationSearch } from "../components/location-search";

const visuallyHidden = {
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute" as const,
  width: "1px",
};

const meta = {
  component: LocationSearch,
  decorators: [
    (Story: () => ReactNode) => (
      <main aria-label="Weather location search preview">
        <h1 style={visuallyHidden}>Weather location search</h1>
        <Story />
      </main>
    ),
  ],
  title: "Weather/LocationSearch",
} satisfies Meta<typeof LocationSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { onQueryChange: () => {}, onSelect: () => {}, query: "" },
};

export const Loading: Story = {
  args: {
    onQueryChange: () => {},
    onSelect: () => {},
    query: "Port",
    state: "loading",
  },
};

export const Results: Story = {
  args: {
    locations,
    onQueryChange: () => {},
    onSelect: () => {},
    query: "Port",
    state: "results",
  },
};

export const NoResults: Story = {
  args: {
    onQueryChange: () => {},
    onSelect: () => {},
    query: "North Pole",
    state: "no-results",
  },
};

export const Error: Story = {
  args: {
    errorMessage: "Location search is temporarily unavailable.",
    onQueryChange: () => {},
    onSelect: () => {},
    query: "Portland",
    state: "error",
  },
};

export const Selected: Story = {
  args: {
    onQueryChange: () => {},
    onSelect: () => {},
    query: "",
    selectedLocation,
    state: "selected",
  },
};

export const Interactive: Story = {
  render: function InteractiveSearch() {
    const [query, setQuery] = useState("Port");
    const [selected, setSelected] = useState(selectedLocation);
    const matches = locations.filter((location) =>
      location.name.toLowerCase().includes(query.toLowerCase()),
    );

    return (
      <LocationSearch
        locations={matches}
        onQueryChange={setQuery}
        onSelect={setSelected}
        query={query}
        selectedLocation={selected}
        state={matches.length ? "results" : "no-results"}
      />
    );
  },
};
