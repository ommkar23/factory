import { describe, expect, it } from "vitest";
import { getSafeReturnPath } from "../src/core.js";

describe("Factory OAuth return paths", () => {
  it("accepts only allow-listed relative protected paths", () => {
    expect(getSafeReturnPath("/weather", ["/", "/weather"], "/")).toBe(
      "/weather",
    );
    expect(getSafeReturnPath("https://evil.example", ["/"], "/")).toBe("/");
    expect(getSafeReturnPath("//evil.example", ["/"], "/")).toBe("/");
  });
});
