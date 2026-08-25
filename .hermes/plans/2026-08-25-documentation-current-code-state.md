# Align documentation and local Storybook with the current codebase

1. To-do: Update repository and contribution documentation to describe JavaScript packages and local branch/worktree integration without requiring remote issues or pull requests.
   To-verify: Confirm documentation contains no active reference to the removed TypeScript configuration package or mandatory remote issue/PR workflow.
2. To-do: Add Storybook to the local Compose stack and bootstrap lifecycle using the same unprivileged volume pattern as the applications.
   To-verify: Validate the rendered Compose configuration and the bootstrap script syntax, and confirm Storybook is published on loopback port 6006.
3. To-do: Document the current production Supabase configuration boundary and remove the obsolete Storybook typecheck invocation.
   To-verify: Confirm deployment documentation matches workflow variable and GCP Secret Manager usage and the Storybook workflow invokes only existing package scripts.
4. To-do: Update current API documentation with the implemented weather endpoints and mark superseded JavaScript/workflow details in the historical UI ADR.
   To-verify: Check documented routes and shadcn settings against the API routers and current components.json files.
5. To-do: Run repository checks, commit the isolated worktree changes, and merge the branch into local main.
   To-verify: Record successful checks and confirm local main contains the documentation commit without pushing a remote feature branch or opening an issue or pull request.
