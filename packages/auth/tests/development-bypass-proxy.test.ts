import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const { createServerClient } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient }));

import { updateAuthSession } from "../src/proxy";

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  createServerClient.mockReset();
});

describe("development authentication bypass proxy", () => {
  it("does not contact Supabase in development", async () => {
    process.env.NODE_ENV = "development";

    const response = await updateAuthSession(
      new NextRequest("http://localhost:3001/"),
    );

    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });
});
