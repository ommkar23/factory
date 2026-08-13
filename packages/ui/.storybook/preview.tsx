import type { Preview } from "@storybook/react-vite";
import "../src/styles.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      defaultValue: "default",
      description: "Semantic token override demonstration",
      toolbar: { items: ["default", "app-override"], title: "Theme" },
    },
  },
  decorators: [
    (Story, context) => (
      <div
        className={`factory-ui-root ${context.globals.theme === "app-override" ? "factory-theme-override" : ""}`}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    a11y: { config: { rules: [{ id: "color-contrast", enabled: true }] } },
    controls: { expanded: true },
    layout: "centered",
    viewport: {
      viewports: {
        mobile: {
          name: "375px mobile",
          styles: { height: "667px", width: "375px" },
          type: "mobile",
        },
        tablet: {
          name: "768px tablet",
          styles: { height: "1024px", width: "768px" },
          type: "tablet",
        },
        desktop: {
          name: "1280px desktop",
          styles: { height: "900px", width: "1280px" },
          type: "desktop",
        },
      },
    },
  },
};

export default preview;
