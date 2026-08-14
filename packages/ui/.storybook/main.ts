import { fileURLToPath } from "node:url";

import type { StorybookConfig } from "@storybook/react-vite";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

const config: StorybookConfig = {
  addons: ["@storybook/addon-a11y"],
  framework: "@storybook/react-vite",
  stories: [
    "../src/**/*.stories.@(ts|tsx)",
    "../../../apps/weather/stories/**/*.stories.@(ts|tsx)",
  ],
  async viteFinal(config) {
    return {
      ...config,
      // GitHub Pages serves this repository site below /factory/. Local Storybook
      // keeps Vite's root-relative base unless the deployment workflow sets it.
      base: process.env.STORYBOOK_BASE_PATH ?? config.base,
      server: {
        ...config.server,
        fs: { ...config.server?.fs, allow: [repositoryRoot] },
        watch: { usePolling: true },
      },
    };
  },
};

export default config;
