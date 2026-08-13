import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  addons: ["@storybook/addon-a11y"],
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  async viteFinal(config) {
    return {
      ...config,
      server: { ...config.server, watch: { usePolling: true } },
    };
  },
};

export default config;
