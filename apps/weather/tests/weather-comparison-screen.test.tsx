import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WeatherComparisonScreen } from "../components/weather-comparison-screen";
import {
  clearDayConditions,
  locations,
  readyComparisonEntries,
} from "../fixtures/weather-fixtures";

function comparisonProps() {
  return {
    comparisonCount: 1,
    comparisonLimit: 5,
    entries: [
      {
        conditions: clearDayConditions,
        location: locations[0]!,
        status: "ready" as const,
      },
    ],
    onQueryChange: vi.fn(),
    onRemoveLocation: vi.fn(),
    onRetryLocation: vi.fn(),
    onSelectLocation: vi.fn(),
    searchQuery: "",
    searchResults: [],
    searchState: "default" as const,
  };
}

afterEach(cleanup);

describe("WeatherComparisonScreen", () => {
  it("renders a ready comparison card with a location-specific remove action", () => {
    render(<WeatherComparisonScreen {...comparisonProps()} />);

    const comparisonCount = screen.getByText("1 of 5 locations compared");
    expect(comparisonCount.getAttribute("data-slot")).toBe("badge");
    expect(
      screen.getByRole("heading", { name: locations[0]!.name }),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: `Remove ${locations[0]!.name}, ${locations[0]!.region}`,
      }),
    ).toBeTruthy();
  });

  it("renders loading and error cards with distinct retry and remove actions", () => {
    const onRetryLocation = vi.fn();
    const onRemoveLocation = vi.fn();
    const props = comparisonProps();

    render(
      <WeatherComparisonScreen
        {...props}
        comparisonCount={3}
        entries={[
          readyComparisonEntries[0]!,
          { location: locations[1]!, status: "loading" },
          {
            error: new Error("fixture failure"),
            location: locations[2]!,
            status: "error",
          },
        ]}
        onRemoveLocation={onRemoveLocation}
        onRetryLocation={onRetryLocation}
      />,
    );

    const errorLocation = locations[2]!;
    expect(screen.getByRole("alert").textContent).toContain(
      "Could not load conditions for Portland.",
    );
    const retryButton = screen.getByRole("button", {
      name: `Retry ${errorLocation.name}, ${errorLocation.region}`,
    });
    expect(retryButton.getAttribute("data-slot")).toBe("button");
    const removeButtons = screen.getAllByRole("button", { name: /^Remove / });
    expect(removeButtons).toHaveLength(3);
    removeButtons.forEach((button) => {
      expect(button.getAttribute("data-slot")).toBe("button");
    });
  });

  it("keeps unavailable search results visible, skips them by keyboard, and selects an available result", async () => {
    const user = userEvent.setup();
    const onSelectLocation = vi.fn();
    const props = comparisonProps();
    const availableLocation = locations[1]!;

    render(
      <WeatherComparisonScreen
        {...props}
        onSelectLocation={onSelectLocation}
        searchQuery="Portland"
        searchResults={[
          { eligibility: "already-added", location: locations[0]! },
          { eligibility: "available", location: availableLocation },
          { eligibility: "limit-reached", location: locations[2]! },
        ]}
        searchState="results"
      />,
    );

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveProperty("disabled", true);
    expect(options[2]).toHaveProperty("disabled", true);

    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{Enter}");
    expect(onSelectLocation).toHaveBeenCalledWith(availableLocation);
  });
});
