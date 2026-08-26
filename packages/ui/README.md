# @factory/ui

Factory-themed shared UI built with shadcn/ui.

## Ownership boundaries

- Keep application-specific shadcn/ui configuration, generated primitives, and components in the owning `apps/*` directory.
- Promote a Factory-themed composition to this package only after at least two applications need it, unless an approved architecture decision justifies earlier extraction.
- Build shared compositions strictly from the shadcn/ui primitives exported by this package. Do not implement ground-up controls when an appropriate shadcn/ui primitive exists.
- Keep domain behavior outside this package. For example, `packages/auth` owns authentication requests and state while `packages/ui` owns common login, profile, logout, and application-header presentation.
- Do not add speculative shared components, such as a search bar, before an active application needs them.

UI changes require component tests, Storybook coverage, Storybook evidence, and recorded human approval before merge.
