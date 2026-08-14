import { createRef } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Alert, AlertDescription, AlertTitle } from "../src/components/alert";
import { Badge } from "../src/components/badge";
import { Button } from "../src/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../src/components/card";
import { Input } from "../src/components/input";
import { Label } from "../src/components/label";
import { Skeleton } from "../src/components/skeleton";
import { Spinner } from "../src/components/spinner";

describe("shared primitives", () => {
  it("associates Labels and Inputs using native accessible names", () => {
    render(
      <>
        <Label htmlFor="location">Location</Label>
        <Input id="location" placeholder="Search a city" />
      </>,
    );

    expect(screen.getByRole("textbox", { name: "Location" })).toHaveProperty(
      "placeholder",
      "Search a city",
    );
  });

  it("forwards Button refs and merges caller classes with its selected variant", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button className="custom-marker" ref={ref} variant="destructive">
        Delete location
      </Button>,
    );

    expect(ref.current).toBe(
      screen.getByRole("button", { name: "Delete location" }),
    );
    expect(ref.current?.dataset.slot).toBe("button");
    expect(ref.current?.className).toContain("custom-marker");
    expect(ref.current?.className).toContain("bg-destructive/10");
  });

  it("supports disabled loading compositions without allowing activation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button aria-busy="true" disabled onClick={onClick}>
        <Spinner data-icon="inline-start" />
        Updating location
      </Button>,
    );

    const button = screen.getByRole("button", {
      name: "Loading Updating location",
    });
    expect(button).toHaveProperty("disabled", true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("status", { name: "Loading" })).not.toBeNull();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("activates enabled Buttons with Enter and Space", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Retry</Button>);

    const button = screen.getByRole("button", { name: "Retry" });
    button.focus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("uses an assertive alert role for interruption callouts", () => {
    render(
      <Alert>
        <AlertTitle>Unable to load weather</AlertTitle>
        <AlertDescription>Try again in a moment.</AlertDescription>
      </Alert>,
    );

    expect(screen.getByRole("alert").textContent).toContain(
      "Unable to load weather",
    );
  });

  it("exposes slot contracts for Card, Badge, and Skeleton composition", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Long location name</CardTitle>
          <CardDescription>Accessible weather summary</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">Ready</Badge>
          <Skeleton aria-label="Loading forecast" />
        </CardContent>
        <CardFooter>Updated just now</CardFooter>
      </Card>,
    );

    expect(screen.getByText("Long location name").dataset.slot).toBe(
      "card-title",
    );
    expect(screen.getByText("Ready").dataset.slot).toBe("badge");
    expect(screen.getByLabelText("Loading forecast").dataset.slot).toBe(
      "skeleton",
    );
  });

  it("keeps semantic token classes when an application overrides its public tokens", () => {
    document.documentElement.style.setProperty(
      "--factory-color-accent",
      "rebeccapurple",
    );
    render(<Button>Themed action</Button>);

    const button = screen.getByRole("button", { name: "Themed action" });
    expect(button.className).toContain("bg-primary");
    expect(
      document.documentElement.style.getPropertyValue("--factory-color-accent"),
    ).toBe("rebeccapurple");
  });

  it("forwards Input refs and native props", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input defaultValue="London" ref={ref} required />);

    fireEvent.change(screen.getByDisplayValue("London"), {
      target: { value: "Paris" },
    });
    expect(ref.current?.value).toBe("Paris");
    expect(ref.current?.required).toBe(true);
  });
});
