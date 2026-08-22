import "../src/styles/globals.css";
const preview = {
  parameters: {
    controls: { expanded: true },
    layout: "centered",
    viewport: {
      viewports: {
        mobile: {
          name: "Mobile (375px)",
          styles: { height: "667px", width: "375px" },
        },
        tablet: {
          name: "Tablet (768px)",
          styles: { height: "1024px", width: "768px" },
        },
        desktop: {
          name: "Desktop (1280px)",
          styles: { height: "800px", width: "1280px" },
        },
      },
    },
  },
};
export default preview;
