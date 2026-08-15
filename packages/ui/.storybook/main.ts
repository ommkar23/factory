import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import type { StorybookConfig } from "@storybook/react-vite";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));

const config: StorybookConfig = {
  addons: [
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-mcp"),
  ],
  framework: getAbsolutePath("@storybook/react-vite"),
  stories: [
    "../src/**/*.stories.@(ts|tsx)",
    "../../../apps/home/stories/**/*.stories.@(ts|tsx)",
    "../../../apps/weather/stories/**/*.stories.@(ts|tsx)",
  ],
  async viteFinal(config) {
    return {
      ...config,
      base: process.env.STORYBOOK_BASE_PATH ?? config.base,
      plugins: [...(config.plugins ?? []), tailwindcss()],
      server: {
        ...config.server,
        fs: { ...config.server?.fs, allow: [repositoryRoot] },
        watch: { usePolling: true },
      },
    };
  },
};

export default config;

function getAbsolutePath(value: string): any {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
