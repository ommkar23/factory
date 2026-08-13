import type { Meta, StoryObj } from "@storybook/react-vite";

const meta = {
  title: "Foundations/Design tokens",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => (
    <article className="factory-ui-root" style={{ maxWidth: "52rem" }}>
      <h1>Factory foundations</h1>
      <p>
        Components consume semantic <code>--factory-*</code> variables.
        Applications override semantic variables once at <code>:root</code> or a
        scoped wrapper; use the Theme toolbar to inspect the app override
        without duplicating markup.
      </p>
      <h2>Color and contrast</h2>
      <ul>
        <li>Text on surface: 15.8:1</li>
        <li>Primary action foreground/background: 7.0:1</li>
        <li>Focus ring on surface: 5.8:1</li>
      </ul>
      <p>
        All documented pairs meet WCAG AA for normal text or UI/focus indicators
        as applicable.
      </p>
      <h2>Typography, spacing, radii, shadows</h2>
      <p>
        System sans typography; 0.25rem spacing scale;
        0.375rem/0.625rem/0.875rem radii; restrained shadow token.
      </p>
      <h2>Responsive behavior</h2>
      <p>
        Mobile first with 48rem tablet and 64rem desktop enhancements. Review at
        375px, 768px, and 1280px.
      </p>
      <h2>Icons and accessibility</h2>
      <p>
        Inline SVG icons use <code>currentColor</code>; decorative icons are{" "}
        <code>aria-hidden</code>. Icon-only controls require an accessible name.
        Native HTML is preferred over custom ARIA widgets.
      </p>
      <h2>Human approval checklist</h2>
      <ul>
        <li>
          Inspect foundations, component states, keyboard and focus behavior.
        </li>
        <li>
          Check contrast/a11y panel, reduced motion, and 375/768/1280 overflow.
        </li>
        <li>Verify token override and navigation/status clarity.</li>
      </ul>
    </article>
  ),
};
