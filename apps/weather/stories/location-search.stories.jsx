import React from "react";
import { useState } from "react";
import { locations, selectedLocation } from "../fixtures/weather-fixtures";
import { LocationSearch } from "../components/location-search";
const visuallyHidden = {
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: 0,
  position: "absolute",
  width: "1px",
};
const longLocation = {
  ...locations[0],
  id: "long-location",
  name: "Llanfairpwllgwyngyll",
  region: "Isle of Anglesey, Wales, United Kingdom",
};
const meta = {
  component: LocationSearch,
  decorators: [
    (Story) => (
      <main aria-label="Weather location search preview">
        <h1 style={visuallyHidden}>Weather location search</h1>
        <Story />
      </main>
    ),
  ],
  parameters: { a11y: { test: "error" } },
  title: "Weather/LocationSearch",
};
export default meta;
export const Default = {
  args: { onQueryChange: () => {}, onSelect: () => {}, query: "" },
};
export const Loading = {
  args: {
    onQueryChange: () => {},
    onSelect: () => {},
    query: "Port",
    state: "loading",
  },
};
export const Results = {
  args: {
    locations,
    onQueryChange: () => {},
    onSelect: () => {},
    query: "Port",
    state: "results",
  },
};
export const NoResults = {
  args: {
    onQueryChange: () => {},
    onSelect: () => {},
    query: "North Pole",
    state: "no-results",
  },
};
export const Error = {
  args: {
    errorMessage: "Location search is temporarily unavailable.",
    onQueryChange: () => {},
    onSelect: () => {},
    query: "Portland",
    state: "error",
  },
};
export const Selected = {
  args: {
    onQueryChange: () => {},
    onSelect: () => {},
    query: "",
    selectedLocation,
    state: "selected",
  },
};
export const DuplicateAndLimitResults = {
  args: {
    onQueryChange: () => {},
    onSelect: () => {},
    query: "Portland",
    results: [
      { eligibility: "already-added", location: locations[0] },
      { eligibility: "available", location: locations[1] },
      { eligibility: "limit-reached", location: locations[2] },
    ],
    state: "results",
  },
};
export const LongLocationName = {
  args: {
    onQueryChange: () => {},
    onSelect: () => {},
    query: "Llanfair",
    results: [{ eligibility: "available", location: longLocation }],
    state: "results",
  },
};
export const Mobile375 = {
  args: Results.args,
  parameters: { viewport: { defaultViewport: "mobile" } },
};
export const Tablet768 = {
  args: Results.args,
  parameters: { viewport: { defaultViewport: "tablet" } },
};
export const Desktop1280 = {
  args: Results.args,
  parameters: { viewport: { defaultViewport: "desktop" } },
};
export const Interactive = {
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
