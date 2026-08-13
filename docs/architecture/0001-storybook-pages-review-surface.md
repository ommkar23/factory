# Storybook review surface (GitHub Pages)

## Purpose

Factory's GitHub Pages site is a static Storybook review surface for the shared UI
package. It is not a production application deployment and does not host product
APIs, user data, or application runtime services.

## Publishing a reviewed revision

1. Open **Actions → Deploy Storybook review site → Run workflow**.
2. Run the workflow from `main` and supply an explicit reviewed Git ref (normally
   `main`, a reviewed protected branch, or a reviewed tag/SHA).
3. The build checks out only that requested ref, installs dependencies with
   `pnpm install --frozen-lockfile`, validates `@factory/ui`, builds its static
   Storybook, and uploads only `packages/ui/storybook-static`.
4. The dependency-ordered deploy job publishes that artifact to the restricted
   `github-pages` environment. Discover the deployed URL from the run's deploy
   job or the repository's Pages settings. The canonical URL is normally
   `https://ommkar23.github.io/factory/`.

The workflow is deliberately only `workflow_dispatch`/`workflow_call`; it has no
`pull_request`, `push`, or scheduled trigger. Build access is `contents: read`.
Only the deployment job has `pages: write` and `id-token: write`; it does not
check out or execute the selected revision.

## Rollback

To roll back the review surface, dispatch the workflow from `main` again with a
previous known-good `main` commit, tag, or SHA. If Pages must be removed entirely,
an authorized repository administrator can disable GitHub Pages and remove this
workflow/environment. Do not use this site as an application availability or
production rollback mechanism.

## Deployment safety

Deployments serialize through the `pages` concurrency group to prevent artifact
races. The `github-pages` environment permits protected branches only; keep the
manual workflow definition on `main` and use an explicitly reviewed ref. Generated
`storybook-static` output is workflow artifact data and must not be committed.
