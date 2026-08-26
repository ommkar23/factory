import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const config = {
  addons: [
    getAbsolutePath("@storybook/addon-a11y"),
    getAbsolutePath("@storybook/addon-mcp"),
  ],
  framework: getAbsolutePath("@storybook/react-vite"),
  stories: [
    "../src/**/*.stories.@(js|jsx)",
    "../../auth/src/**/*.stories.@(js|jsx)",
    "../../../apps/home/stories/**/*.stories.@(js|jsx)",
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
function getAbsolutePath(value) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
