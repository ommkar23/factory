# Factory auth E2E harness

`pnpm test:e2e -- --project=shared-origin` and `pnpm test:e2e -- --project=local-proxy` run the two verification flows from the auth-client migration plan. The root wrapper intentionally accepts pnpm's `-- --project=...` form. Both live suites skip, rather than pass, until their required configuration is supplied. The configuration-contract tests always run without live services.

## Shared-origin prerequisites

Provide these only in the shell or CI secret store:

- `FACTORY_E2E_SHARED_ORIGIN_URL`: HTTPS Factory origin whose load balancer routes `/auth/*` and `/app/*` to the API.
- `FACTORY_E2E_SHARED_ORIGIN_PROTECTED_PATH`: a successful same-origin `/app/*` request, including its required query string.
- `FACTORY_E2E_SHARED_ORIGIN_STORAGE_STATE`: a local Playwright storage-state JSON file containing the test identity provider's authenticated session. It must not contain Factory cookies and must remain outside the repository.

The identity provider session must be able to complete the normal redirect from `/auth/login` through `/auth/callback` without an interactive prompt. The suite starts a new login for `/`, `/live-splash`, and `/weather`, checks the callback response, then verifies HttpOnly Secure Lax Factory cookies, `/auth/session`, a protected request, and logout.

## Local-proxy prerequisites

Start the migrated local applications and API with each application holding its own development auth secret server-side. Do not pass `X-Dev-Auth-Secret` to this command. Provide `FACTORY_E2E_LOCAL_PROXY_APPS` as a JSON array with exactly `home`, `live-splash`, and `weather` entries. Each entry needs:

- `name`
- `origin` (for example `http://localhost:3001`)
- `bootstrapPath`: the app's same-origin server-only `/api/auth/dev/bootstrap` endpoint
- `protectedApiPath`: a successful same-origin `/app/*` request

Optional `publicPath`, `protectedPagePath`, and `loginPath` default to `/api/health`, `/`, and `/login`. The suite checks the public route, unauthenticated root-relative login redirect, bootstrap request (including absence of an `X-Dev-Auth-Secret` browser header), HttpOnly Lax Factory cookies, session, protected API request, and logout for every local app origin. It also observes browser fetch/XHR traffic for the full flow, rejects any cross-origin API request, and requires the configured protected `/app/*` request to be observed.

Example non-secret shape:

```sh
export FACTORY_E2E_LOCAL_PROXY_APPS='[
  {"name":"home","origin":"http://localhost:3001","bootstrapPath":"/api/auth/dev/bootstrap","protectedApiPath":"/app/weather/v1/locations?q=Portland"},
  {"name":"live-splash","origin":"http://localhost:3002","bootstrapPath":"/api/auth/dev/bootstrap","protectedApiPath":"/app/weather/v1/locations?q=Portland"},
  {"name":"weather","origin":"http://localhost:3003","bootstrapPath":"/api/auth/dev/bootstrap","protectedApiPath":"/app/weather/v1/locations?q=Portland"}
]'
pnpm test:e2e -- --project=local-proxy
```

Install the Chromium runtime separately when running a configured browser flow:

```sh
pnpm exec playwright install chromium
```
