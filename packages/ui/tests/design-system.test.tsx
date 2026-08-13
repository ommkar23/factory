import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Link,
  LoadingIndicator,
  Navigation,
  Select,
  StatusMessage,
} from "../src/index";

afterEach(cleanup);

describe("Factory UI public primitives", () => {
  it("renders a native button with type button and blocks repeat activation while loading", () => {
    const onClick = () => undefined;
    render(
      <Button isLoading onClick={onClick}>
        Save settings
      </Button>,
    );

    const button = screen.getByRole("button", { name: /save settings/i });
    expect(button).toHaveAttribute("type", "button");
    expect(button).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(/saving/i);
  });

  it("keeps links as native anchors", () => {
    render(<Link href="/guidance">Read guidance</Link>);
    expect(screen.getByRole("link", { name: "Read guidance" })).toHaveAttribute(
      "href",
      "/guidance",
    );
  });

  it("wires input labels, description, errors, and disabled state", () => {
    render(
      <Input
        autoComplete="email"
        description="We only use this for account messages."
        disabled
        error="Enter a work email address."
        label="Work email"
        name="email"
        type="email"
      />,
    );

    const input = screen.getByLabelText("Work email");
    expect(input).toHaveAttribute("name", "email");
    expect(input).toHaveAttribute("autocomplete", "email");
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toMatch(
      /description.*error|error.*description/,
    );
    expect(screen.getByText("Enter a work email address.")).toHaveAttribute(
      "id",
    );
  });

  it("uses a native select with an optional placeholder and error semantics", () => {
    render(
      <Select
        error="Choose a region."
        label="Region"
        placeholder="Choose a region"
      >
        <option value="us">United States</option>
      </Select>,
    );

    const select = screen.getByLabelText("Region");
    expect(select.tagName).toBe("SELECT");
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByRole("option", { name: "Choose a region" }),
    ).toBeDisabled();
  });

  it("marks the current navigation item and retains all links", () => {
    render(
      <Navigation
        ariaLabel="Primary"
        brand={<a href="/">Factory</a>}
        items={[
          { href: "/", label: "Home" },
          { current: true, href: "/library", label: "Library" },
        ]}
      />,
    );

    expect(
      screen.getByRole("navigation", { name: "Primary" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("keeps cards and badges non-interactive by default", () => {
    render(
      <Card
        heading="Project overview"
        footer={<Badge tone="success">Published</Badge>}
      >
        Content
      </Card>,
    );
    expect(
      screen.getByRole("heading", { name: "Project overview" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Published").tagName).toBe("SPAN");
    expect(
      screen.queryByRole("button", { name: "Project overview" }),
    ).not.toBeInTheDocument();
  });

  it("uses urgent alerts only for errors and polite status for other messages", () => {
    const { rerender } = render(
      <Alert title="Saved">Your changes are available.</Alert>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Saved");
    rerender(
      <Alert tone="error" title="Publishing failed">
        Try again after checking your connection.
      </Alert>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Publishing failed");
  });

  it("requires an accessible loading label and honors a visible label", () => {
    render(<LoadingIndicator label="Loading projects" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading projects");
  });

  it("keeps the legacy StatusMessage export as a compatibility wrapper", () => {
    render(<StatusMessage tone="success">Ready</StatusMessage>);
    expect(screen.getByRole("status")).toHaveTextContent("Ready");
  });

  it("does not replace native disabled behavior with event handlers", () => {
    const click = () => {
      throw new Error("disabled button should not activate");
    };
    render(
      <Button disabled onClick={click}>
        Archive
      </Button>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
  });
});
