import { describe, expect, it } from "vitest";

import { GET } from "../app/api/health/route";

describe("Live Splash health endpoint", () => {
  it("returns an unauthenticated readiness response", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });
});
