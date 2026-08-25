import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import LoggedOutPage from "../app/logged-out/page";

const originalSharedOrigin = process.env.FACTORY_SHARED_ORIGIN;
afterEach(() => {
  process.env.FACTORY_SHARED_ORIGIN = originalSharedOrigin;
});

describe("Factory Home logged-out page", () => {
  it.each([undefined, "true"])(
    "confirms logout and returns to the Home route on a %s origin",
    (sharedOrigin) => {
      process.env.FACTORY_SHARED_ORIGIN = sharedOrigin;

      const markup = renderToStaticMarkup(<LoggedOutPage />);

      expect(markup).toContain("You’ve been logged out.");
      expect(markup).toContain('href="/"');
      expect(markup).toContain("Return to Home");
    },
  );
});
