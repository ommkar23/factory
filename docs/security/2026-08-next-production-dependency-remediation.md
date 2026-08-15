# Next.js production-dependency remediation (2026-08)

Governing issue: [#15](https://github.com/ommkar23/factory/issues/15)

## Decision

Both `@factory/weather` and `@factory/photo-feed` move from `next@16.1.1` to `next@16.3.0`. This is the lowest stable 16.3.x release and replaces the rejected `16.2.11` override-based candidate. The matching `eslint-config-next` packages move to `16.3.0` to keep the framework lint configuration aligned.

`next@16.3.0` normally resolves the patched production graph required by the audit:

- `next@16.3.0`
- `postcss@8.5.23` (a direct Next dependency)
- `sharp@0.35.3` (a Next optional dependency, within Next's declared `^0.35.3` range)

No workspace overrides are used. This retains upstream ownership and compatibility of Next's sharp resolution, rather than forcing `sharp@0.35.0` outside Next 16.2.11's `^0.34.5` range.

The initial `pnpm audit --prod` result contained 36 findings (16 high, 17 moderate, 3 low):

- Next.js: `1112592`, `1112645`, `1114898`, `1114941`, `1114942`, `1114943`, `1115360`, `1116305`, `1116375`, `1117930`, `1118938`, `1118941`, `1118943`, `1118945`, `1118947`, `1118949`, `1118951`, `1118953`, `1118955`, `1118957`, `1118959`, `1118961`, `1124170`, `1124171`, `1124184`, `1124186`, `1124188`, `1124190`, `1124192`, `1124194`, `1124196`.
- PostCSS: `1117015`, `1124252`, `1130709`, `1139510`.
- sharp: `1124066`.

The remediated `pnpm audit --prod --json` result has no advisories (0 high and 0 moderate), so no residual advisory or applicability exception remains.

React remains `19.2.3`; the workspace Node (`>=24`) and pnpm (`>=11`) baselines are unchanged. Next.js 16 supports React 19 and requires Node `>=20.9.0`, so the existing baseline remains supported.

## Release and migration review

- The [Next.js 16.3.0 release](https://github.com/vercel/next.js/releases/tag/v16.3.0) includes `sharp@0.35.3` and Turbopack changes. The normal `sharp@^0.35.3` optional dependency is the supported resolution and avoids the known 16.2 override-path Linux/Turbopack native-binding risk.
- The [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) requires async use of Next request APIs and calls out changes to `next.config` experimental flags, PPR, `next/image`, and middleware/proxy conventions. Neither app uses Next request APIs (`params`, `searchParams`, `cookies()`, `headers()`, or `draftMode()`), legacy/experimental flags, PPR, middleware, or `next/image` components, so no migration codemod or application-behavior test change is required.
- Existing Weather and Photo Feed tests, typechecks, production builds, and Webpack dev HTTP smokes cover the applications' established behavior after the package-only upgrade. Next 16.3 additionally enables the `/_next/mcp` runtime inspection surface for Turbopack dev validation.

## Validation and rollback

Validation records the frozen install, zero-finding production audit, repository checks, targeted app tests/typechecks/builds, Turbopack runtime inspection, and Webpack dev HTTP smokes in the associated pull request. The only non-blocking package-manager notice is the unchanged pre-existing TypeScript 7.0.2 peer-range warning from `@typescript-eslint/*@8.67.0` (which declares `<6.1.0`); all typechecks and lint/format checks pass, and this security-maintenance change does not alter that tooling baseline.

If an upgrade regression occurs, revert the remediation commit through the repository's normal approved release process. Reversion restores the known vulnerable production graph, so it is an emergency compatibility fallback rather than a long-term solution.
