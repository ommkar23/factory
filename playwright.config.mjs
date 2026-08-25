import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "shared-origin",
      testMatch: ["contract.spec.mjs", "shared-origin.spec.mjs"],
    },
    {
      name: "local-proxy",
      testMatch: ["contract.spec.mjs", "local-proxy.spec.mjs"],
    },
  ],
});
