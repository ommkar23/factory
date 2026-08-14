import type { Meta, StoryObj } from "@storybook/react-vite";

import { WeatherComparisonScreen } from "../components/weather-comparison-screen";
import {
  comparisonLocations,
  readyComparisonEntries,
} from "../fixtures/weather-fixtures";

const callbacks = {
  onQueryChange: () => {},
  onRemoveLocation: () => {},
  onRetryLocation: () => {},
  onSelectLocation: () => {},
};

const meta = {
  component: WeatherComparisonScreen,
  parameters: { layout: "fullscreen" },
  title: "Weather/ComparisonScreen",
} satisfies Meta<typeof WeatherComparisonScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: {
    ...callbacks,
    comparisonCount: 0,
    comparisonLimit: 5,
    entries: [],
    searchQuery: "",
    searchResults: [],
    searchState: "default",
  },
};

export const OneReady: Story = {
  args: {
    ...callbacks,
    comparisonCount: 1,
    comparisonLimit: 5,
    entries: readyComparisonEntries.slice(0, 1),
    searchQuery: "",
    searchResults: [],
    searchState: "default",
  },
};

export const MixedLoadingError: Story = {
  args: {
    ...callbacks,
    comparisonCount: 3,
    comparisonLimit: 5,
    entries: [
      readyComparisonEntries[0]!,
      { location: comparisonLocations[1]!, status: "loading" },
      {
        error: new Error("Fixture request failed"),
        location: comparisonLocations[2]!,
        status: "error",
      },
    ],
    searchQuery: "",
    searchResults: [],
    searchState: "default",
  },
};

export const FullFiveLocations: Story = {
  args: {
    ...callbacks,
    comparisonCount: 5,
    comparisonLimit: 5,
    entries: readyComparisonEntries,
    searchAnnouncement:
      "Comparison limit reached. Remove a location before adding another.",
    searchQuery: "",
    searchResults: [],
    searchState: "default",
  },
};

export const AlreadyAddedResult: Story = {
  args: {
    ...callbacks,
    comparisonCount: 1,
    comparisonLimit: 5,
    entries: readyComparisonEntries.slice(0, 1),
    searchAnnouncement: "Portland, Oregon is already in your comparison.",
    searchQuery: "Portland",
    searchResults: [
      {
        eligibility: "already-added",
        location: comparisonLocations[0]!,
      },
      { eligibility: "available", location: comparisonLocations[1]! },
      { eligibility: "available", location: comparisonLocations[2]! },
    ],
    searchState: "results",
  },
};

export const LimitReachedResult: Story = {
  args: {
    ...callbacks,
    comparisonCount: 5,
    comparisonLimit: 5,
    entries: readyComparisonEntries,
    searchAnnouncement:
      "Comparison limit reached. Remove a location before adding another.",
    searchQuery: "Tokyo",
    searchResults: [
      {
        eligibility: "limit-reached",
        location: comparisonLocations[3]!,
      },
    ],
    searchState: "results",
  },
};

export const NarrowMobile: Story = {
  args: OneReady.args,
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
