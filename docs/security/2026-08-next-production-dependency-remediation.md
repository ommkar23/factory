# Next.js production-dependency remediation (2026-08)

Governing issue: [#15](https://github.com/ommkar23/factory/issues/15)

## Decision

Both `@factory/weather` and `@factory/photo-feed` move from `next@16.1.1` to `next@16.2.11`. This is the narrowest Next.js 16.x release that clears every currently reported Next advisory: the highest required fixed version in the production audit is `>=16.2.11` (advisories `1124170`, `1124171`, `1124184`, `1124186`, `1124188`, `1124190`, `1124192`, `1124194`, and `1124196`). The matching `eslint-config-next` packages are updated to `16.2.11` to keep the framework lint configuration aligned.

The initial `pnpm audit --prod` result contained 36 findings (16 high, 17 moderate, 3 low):

- Next.js: `1112592`, `1112645`, `1114898`, `1114941`, `1114942`, `1114943`, `1115360`, `1116305`, `1116375`, `1117930`, `1118938`, `1118941`, `1118943`, `1118945`, `1118947`, `1118949`, `1118951`, `1118953`, `1118955`, `1118957`, `1118959`, `1118961`, `1124170`, `1124171`, `1124184`, `1124186`, `1124188`, `1124190`, `1124192`, `1124194`, `1124196`.
- PostCSS: `1117015`, `1124252`, `1130709`, `1139510`.
- sharp: `1124066`.

The remediated production audit has zero findings, so no residual advisory or applicability exception remains.

React remains `19.2.3`; the workspace Node (`>=24`) and pnpm (`>=11`) baselines are unchanged. Next.js `16.2.11` declares compatibility with React 19 and Node `>=20.9.0`, so the current baseline remains supported.

## Targeted transitive resolutions

`next@16.2.11` still declares vulnerable transitive ranges:

- `postcss@8.4.31` exactly, while audit advisory `1130709` requires `>=8.5.23`.
- `sharp@^0.34.5`, whose 0.x range excludes the audit fix `0.35.0` required by advisory `1124066`.

The root `pnpm-workspace.yaml` `overrides` section therefore applies parent-specific resolutions only to Next.js:

```json
{
  "next>postcss": "8.5.23",
  "next>sharp": "0.35.0"
}
```

This is intentionally narrower than global overrides: Vite's independently resolved `postcss@8.5.26` is not downgraded or changed. Ownership is the root workspace because it owns the lockfile and production dependency policy. The overrides remain necessary until an upstream Next.js release both incorporates compatible patched versions and is itself selected by this repository's security policy.

## Release and migration review

- Next.js's [v16.2.11 release](https://github.com/vercel/next.js/releases/tag/v16.2.11) explicitly lists the security fixes targeted by this change.
- The [Next.js 16.2 release notes](https://nextjs.org/blog/next-16-2) add optional performance/debugging features; this workspace does not opt into a new feature.
- The [Version 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) calls out migrations for legacy synchronous Request APIs. The repository does not use `params`, `searchParams`, `cookies()`, `headers()`, or `draftMode()` through the Next.js request API, so no migration codemod or behavior-specific test update is required.

## Validation and rollback

Validation records the frozen install, production audit, repository checks, targeted app tests/typechecks/builds, and Webpack dev HTTP smokes in the associated pull request. The only non-blocking package-manager notice is the unchanged pre-existing TypeScript 7.0.2 peer-range warning from `@typescript-eslint/*@8.67.0` (which declares `<6.1.0`); all typechecks and lint/format checks passed, and this security-maintenance change does not alter that tooling baseline.

If an upgrade regression occurs, revert the remediation commit (which restores the prior manifests, lockfile, and two scoped overrides), then redeploy only through the repository's normal approved release process. Reversion restores the known vulnerable versions, so it is an emergency compatibility fallback rather than a long-term solution.
