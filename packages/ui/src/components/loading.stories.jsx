import React from "react";
import { Skeleton } from "./skeleton";
import { Spinner } from "./spinner";
const meta = {
  component: Skeleton,
  title: "Components/Loading",
  parameters: { a11y: { test: "error" } },
};
export default meta;
export const EmptySkeleton = {
  render: () => (
    <div aria-label="Loading forecast" className="flex w-72 flex-col gap-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  ),
};
export const LoadingIndicator = {
  render: () => <Spinner aria-label="Loading current conditions" />,
};
