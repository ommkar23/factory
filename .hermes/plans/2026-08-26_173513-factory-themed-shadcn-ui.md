# Keep Factory-themed shared components built from shadcn/ui

1. To-do: Update project and package guidance so app-specific UI uses app-local shadcn/ui configuration while genuinely common Factory-themed components remain in `packages/ui` and are composed strictly from shadcn/ui primitives rather than ground-up custom UI.
   To-verify: Confirm `AGENTS.md` and `packages/ui/README.md` clearly define the app-local, shared-composition, and no-custom-primitive boundaries.
2. To-do: Refactor the existing shared login, profile/logout, and application-header presentation to compose primitives from `packages/ui` while keeping authentication behavior in `packages/auth`.
   To-verify: Add or update component tests and Storybook stories proving login, error, profile, logout, keyboard, and responsive states retain their behavior and accessibility.
3. To-do: Keep the shared package and Storybook harness, remove obsolete or duplicated UI implementations, and avoid adding speculative shared components such as a search bar until an application needs them.
   To-verify: Confirm active consumers import supported shared compositions or app-local shadcn/ui components and no replaced ground-up controls remain.
4. To-do: Run repository verification and prepare the UI changes for human review.
   To-verify: Run `pnpm check`, build Storybook, and provide Storybook evidence for UI review.
