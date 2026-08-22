import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusMessage } from "../src/status-message";
describe("StatusMessage", () => {
  it("announces warning content assertively while preserving the public tone API", () => {
    render(<StatusMessage tone={"warning"}>Connection lost.</StatusMessage>);
    expect(screen.getByRole("alert").textContent).toContain("Connection lost.");
  });
});
