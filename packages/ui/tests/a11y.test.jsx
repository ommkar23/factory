import React from "react";
import axe from "axe-core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Alert, AlertDescription, AlertTitle } from "../src/components/alert";
import { Button } from "../src/components/button";
import { Input } from "../src/components/input";
import { Label } from "../src/components/label";
import { StatusMessage } from "../src/status-message";
describe("covered primitive accessibility", () => {
  it("has no critical axe violations in the documented form and feedback composition", async () => {
    const { container } = render(
      <main>
        <Label htmlFor="a11y-location">Location</Label>
        <Input id="a11y-location" placeholder="Search a city" />
        <Button>Save location</Button>
        <StatusMessage tone="success">Location saved.</StatusMessage>
        <StatusMessage tone="error">Unable to update location.</StatusMessage>
        <Alert>
          <AlertTitle>Forecast unavailable</AlertTitle>
          <AlertDescription>Try again shortly.</AlertDescription>
        </Alert>
      </main>,
    );
    const result = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(
      result.violations.filter(({ impact }) => impact === "critical"),
    ).toEqual([]);
  });
});
