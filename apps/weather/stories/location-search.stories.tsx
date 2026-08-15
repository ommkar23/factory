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

const longLocation = {
  ...locations[0]!,
  id: "long-location",
  name: "Llanfairpwllgwyngyll",
  region: "Isle of Anglesey, Wales, United Kingdom",
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
  parameters: { a11y: { test: "error" } },
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

export const DuplicateAndLimitResults: Story = {
  args: {
    onQueryChange: () => {},
    onSelect: () => {},
    query: "Portland",
    results: [
      { eligibility: "already-added", location: locations[0]! },
      { eligibility: "available", location: locations[1]! },
      { eligibility: "limit-reached", location: locations[2]! },
    ],
    state: "results",
  },
};

export const LongLocationName: Story = {
  args: {
    onQueryChange: () => {},
    onSelect: () => {},
    query: "Llanfair",
    results: [{ eligibility: "available", location: longLocation }],
    state: "results",
  },
};

export const Mobile375: Story = {
  args: Results.args,
  parameters: { viewport: { defaultViewport: "mobile" } },
};

export const Tablet768: Story = {
  args: Results.args,
  parameters: { viewport: { defaultViewport: "tablet" } },
};

export const Desktop1280: Story = {
  args: Results.args,
  parameters: { viewport: { defaultViewport: "desktop" } },
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
