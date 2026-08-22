import React from "react";
import { Alert, AlertDescription, AlertTitle } from "./alert";
const meta = {
  component: Alert,
  title: "Components/Alert",
  parameters: { a11y: { test: "error" } },
};
export default meta;
export const Information = {
  render: () => (
    <Alert className="max-w-md">
      <AlertTitle>Weather data is delayed</AlertTitle>
      <AlertDescription>
        Showing the most recently available conditions.
      </AlertDescription>
    </Alert>
  ),
};
export const Error = {
  render: () => (
    <Alert className="max-w-md" variant="destructive">
      <AlertTitle>Unable to update this location</AlertTitle>
      <AlertDescription>Check your connection and retry.</AlertDescription>
    </Alert>
  ),
};
