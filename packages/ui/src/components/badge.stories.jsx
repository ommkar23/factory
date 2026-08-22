import React from "react";
import { Badge } from "./badge";
const meta = {
  component: Badge,
  title: "Components/Badge",
  parameters: { a11y: { test: "error" } },
};
export default meta;
export const Variants = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="destructive">Error</Badge>
    </div>
  ),
};
