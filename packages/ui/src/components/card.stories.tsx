import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "./badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

const meta = {
  component: Card,
  title: "Components/Card",
  parameters: { a11y: { test: "error" } },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Current conditions</CardTitle>
        <CardDescription>Weather from your saved location.</CardDescription>
      </CardHeader>
      <CardContent>
        <Badge variant="secondary">Updated</Badge>
      </CardContent>
      <CardFooter>Just now</CardFooter>
    </Card>
  ),
};

export const LongContentInNarrowContainer: Story = {
  render: () => (
    <div className="w-56">
      <Card>
        <CardHeader>
          <CardTitle>
            A deliberately long location name for responsive review
          </CardTitle>
          <CardDescription>
            Forecast details remain readable without horizontal overflow in a
            narrow container.
          </CardDescription>
        </CardHeader>
        <CardContent>
          Partly cloudy with a chance of rain later today.
        </CardContent>
      </Card>
    </div>
  ),
};
