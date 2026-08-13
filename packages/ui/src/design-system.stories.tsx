import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Link,
  LoadingIndicator,
  Navigation,
  Select,
} from "./index";

const meta = {
  title: "Review/Component state matrix",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => (
    <div
      className="factory-ui-root"
      style={{ display: "grid", gap: "1.5rem", maxWidth: "52rem" }}
    >
      <Navigation
        ariaLabel="Factory review"
        brand={<Link href="/">Factory</Link>}
        items={[
          { current: true, href: "#components", label: "Components" },
          { href: "#guidance", label: "Guidance" },
        ]}
        actions={<Button size="sm">Publish</Button>}
      />
      <section>
        <h2>Actions</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}>
          <Button>Primary</Button>
          <Button data-state="hover">Hover preview</Button>
          <Button data-state="active">Active preview</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button disabled>Disabled</Button>
          <Button isLoading>Save</Button>
        </div>
      </section>
      <section>
        <h2>Fields</h2>
        <div style={{ display: "grid", gap: "1rem" }}>
          <Input
            autoComplete="email"
            description="We only use this for account messages."
            label="Work email"
            name="email"
            placeholder="name@example.com"
            type="email"
          />
          <Input
            error="Enter a valid project name."
            label="Project name"
            name="project"
          />
          <Select
            error="Choose a region."
            label="Region"
            name="region"
            placeholder="Choose a region"
          >
            <option value="us">United States</option>
            <option value="eu">Europe</option>
          </Select>
        </div>
      </section>
      <section>
        <h2>Status</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
          <Badge>Neutral</Badge>
          <Badge tone="success">Published</Badge>
          <Badge tone="warning">Needs review</Badge>
          <Badge tone="error">Blocked</Badge>
        </div>
        <div style={{ display: "grid", gap: ".75rem", marginTop: "1rem" }}>
          <Alert title="Changes saved">
            Your draft is available to collaborators.
          </Alert>
          <Alert tone="success" title="Published">
            The project is live.
          </Alert>
          <Alert tone="warning" title="Review needed">
            A collaborator has not completed the checklist.
          </Alert>
          <Alert tone="error" title="Publishing failed">
            Check your connection and try again. Your draft is still safe.
          </Alert>
        </div>
      </section>
      <Card
        heading="Long content and empty state"
        footer={<Button variant="secondary">View details</Button>}
      >
        This card handles a deliberately long
        unbrokenidentifierforresponsivelayoutverificationwithoutclipping and
        keeps its action separate from the card container.
      </Card>
      <LoadingIndicator label="Loading projects" />
    </div>
  ),
};

export const ResponsiveComposite: Story = {
  ...States,
  parameters: { viewport: { defaultViewport: "mobile" } },
};
