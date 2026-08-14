import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocationSearch } from "../components/location-search";
import type { Location } from "../components/weather-types";

const locations: readonly Location[] = [
  { id: "portland-me", name: "Portland", region: "Maine, United States" },
  { id: "portland-or", name: "Portland", region: "Oregon, United States" },
  { id: "portland-uk", name: "Portland", region: "Dorset, United Kingdom" },
];

type RenderOptions = Partial<
  Omit<
    React.ComponentProps<typeof LocationSearch>,
    "onQueryChange" | "onSelect"
  >
>;

function renderLocationSearch(options: RenderOptions = {}) {
  const onQueryChange = vi.fn();
  const onSelect = vi.fn();
  const view = render(
    <LocationSearch
      locations={locations}
      onQueryChange={onQueryChange}
      onSelect={onSelect}
      query="portland"
      state="results"
      {...options}
    />,
  );

  return { ...view, onQueryChange, onSelect };
}

function options() {
  return screen.getAllByRole("option");
}

function expectActiveOption(index: number) {
  const input = screen.getByRole("combobox");
  const resultOptions = options();

  expect(input.getAttribute("aria-activedescendant")).toBe(
    resultOptions[index]?.id,
  );
  resultOptions.forEach((option, optionIndex) => {
    const isActive = optionIndex === index;
    expect(option.getAttribute("aria-selected")).toBe(String(isActive));
    expect(option.getAttribute("data-active")).toBe(String(isActive));
  });
}

afterEach(cleanup);

describe("LocationSearch", () => {
  it("initially marks the first result active and links the combobox to it", () => {
    renderLocationSearch();

    expectActiveOption(0);
  });

  it("moves the active option with ArrowDown and ArrowUp", async () => {
    const user = userEvent.setup();
    renderLocationSearch();
    const input = screen.getByRole("combobox");

    await user.click(input);
    await user.keyboard("{ArrowDown}");
    expectActiveOption(1);

    await user.keyboard("{ArrowUp}");
    expectActiveOption(0);
  });

  it("moves the active option to the first and last results with Home and End", async () => {
    const user = userEvent.setup();
    renderLocationSearch();
    const input = screen.getByRole("combobox");

    await user.click(input);
    await user.keyboard("{End}");
    expectActiveOption(locations.length - 1);

    await user.keyboard("{Home}");
    expectActiveOption(0);
  });

  it("selects the active result with Enter", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderLocationSearch();
    const input = screen.getByRole("combobox");

    await user.click(input);
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(locations[1]);
  });

  it("selects a clicked result and makes it active", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderLocationSearch();

    await user.click(options()[2]!);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(locations[2]);
    expectActiveOption(2);
  });

  it("clamps a now-out-of-range active option when the result list shrinks", async () => {
    const user = userEvent.setup();
    const { rerender } = renderLocationSearch();
    const input = screen.getByRole("combobox");

    await user.click(input);
    await user.keyboard("{End}");
    expectActiveOption(2);

    rerender(
      <LocationSearch
        locations={locations.slice(0, 2)}
        onQueryChange={vi.fn()}
        onSelect={vi.fn()}
        query="portland"
        state="results"
      />,
    );

    expect(options()).toHaveLength(2);
    expectActiveOption(1);
    expect(
      document.getElementById(input.getAttribute("aria-activedescendant")!),
    ).not.toBeNull();
  });

  it("assigns unique input, result-list, and active-option IDs to each instance", () => {
    const onQueryChange = vi.fn();
    const onSelect = vi.fn();
    render(
      <>
        <LocationSearch
          locations={locations}
          onQueryChange={onQueryChange}
          onSelect={onSelect}
          query="portland"
          state="results"
        />
        <LocationSearch
          locations={locations}
          onQueryChange={onQueryChange}
          onSelect={onSelect}
          query="portland"
          state="results"
        />
      </>,
    );

    const inputs = screen.getAllByRole("combobox");
    const listboxes = screen.getAllByRole("listbox");
    const activeOptionIds = inputs.map((input) =>
      input.getAttribute("aria-activedescendant"),
    );

    expect(new Set(inputs.map((input) => input.id)).size).toBe(2);
    expect(new Set(listboxes.map((listbox) => listbox.id)).size).toBe(2);
    expect(new Set(activeOptionIds).size).toBe(2);
    activeOptionIds.forEach((id) => {
      expect(document.getElementById(id!)).not.toBeNull();
    });
  });
});
