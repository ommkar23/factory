# Storybook review surface (GitHub Pages)

## Purpose

Factory's GitHub Pages site is a static Storybook review surface for shared UI and
app-local component stories. It is not a production application deployment and does
not host product APIs, user data, or application runtime services.

## Publishing a reviewed revision

Relevant UI and story changes pushed to `main` publish Storybook automatically. An
operator can also run **Actions → Deploy Storybook review site → Run workflow** and
supply an explicit reviewed Git ref such as `main`, a tag, or a commit SHA.

The build checks out the triggering revision, installs frozen dependencies, validates
`@factory/ui`, builds with the `/factory/storybook/` base path, and packages the Pages
artifact with static app redirects. The deploy job publishes to the restricted
`github-pages` environment. The canonical URL is normally
`https://ommkar23.github.io/factory/storybook/`.

Build access is `contents: read`. Only the deployment job has `pages: write` and
`id-token: write`; it does not check out or execute the selected revision.

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
