import { beforeEach, describe, expect, it, vi } from "vitest";
const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((path) => {
    throw new Error(`redirect:${path}`);
  }),
}));
vi.mock("@factory/auth/server", () => ({
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));
vi.mock("next/navigation", () => ({ redirect }));
import HomePage from "../app/page";
describe("Weather shared-origin routing", () => {
  beforeEach(() => {
    process.env.FACTORY_SHARED_ORIGIN = "true";
    redirect.mockClear();
  });
  it("redirects an unauthenticated request to the app-internal login route", async () => {
    await expect(HomePage()).rejects.toThrow("redirect:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
