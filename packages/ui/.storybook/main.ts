import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  addons: ["@storybook/addon-a11y", "@storybook/addon-mcp"],
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  async viteFinal(config) {
    return {
      ...config,
      // GitHub Pages serves this repository site below /factory/. Local Storybook
      // keeps Vite's root-relative base unless the deployment workflow sets it.
      base: process.env.STORYBOOK_BASE_PATH ?? config.base,
      server: { ...config.server, watch: { usePolling: true } },
    };
  },
};

export default config;
