import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import HomePage from "../app/page";

afterEach(cleanup);

describe("Factory Home route", () => {
  it("renders the configured local app directory", () => {
    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "Factory Home" })).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Open Live Splash" })
        .getAttribute("href"),
    ).toBe("http://localhost:3000");
    expect(
      screen.getByRole("link", { name: "Open Weather" }).getAttribute("href"),
    ).toBe("http://localhost:3001");
  });
});
