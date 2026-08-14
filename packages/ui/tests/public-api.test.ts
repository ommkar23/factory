import { describe, expect, it } from "vitest";

import * as publicApi from "../src/index";

describe("public API", () => {
  it("exports the approved shared primitive inventory from the package root", () => {
    expect(publicApi).toMatchObject({
      Alert: expect.any(Function),
      Badge: expect.any(Function),
      Button: expect.any(Function),
      Card: expect.any(Function),
      Input: expect.any(Function),
      Label: expect.any(Function),
      Skeleton: expect.any(Function),
      Spinner: expect.any(Function),
      StatusMessage: expect.any(Function),
    });
  });
});
