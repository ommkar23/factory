# Factory Auth Client Migration

## 1. What to do

- Adopt one browser routing model: `/auth/*` and `/app/*` are same-origin paths routed to the Factory API by the production load balancer and by each local Next.js app proxy. Browser code never calls a separate API origin; local browser origins are Home `http://localhost:3001`, Live Splash `http://localhost:3002`, and Weather `http://localhost:3003`, while `http://localhost:3004` remains an internal/test API address. Same-origin requests use cookie credentials; credentialed cross-origin CORS is not part of the client contract.
- Adopt the existing Factory API contract exactly: `GET /auth/login?next=…` starts login, `GET /auth/session` supplies current identity and refreshes when required, `POST /auth/logout` ends the session, and `/app/*` requests authenticate with the `Factory-Access-Token` cookie.
- Make the API the sole manager of `Factory-Access-Token` and `Factory-Refresh-Token`, whose values remain Supabase access and refresh tokens. Remove only client-owned Supabase clients, token access, cookie handling, callback exchange, and `NEXT_PUBLIC_SUPABASE_*` configuration.
- Apply this route matrix:
  - Home: public `/login` and `/api/health`; protected `/`; login `next=/`; post-login `/`.
  - Live Splash: public `/live-splash/login` and `/live-splash/api/health`; protected `/live-splash`; login `next=/live-splash`; post-login `/live-splash`.
  - Weather: public `/weather/login` and `/weather/api/health`; protected `/weather`; login `next=/weather`; post-login `/weather`.
  - Local independent app origins use their equivalent root-relative `/login`, `/api/health`, and protected `/`, with `next=/`.
- Remove Home’s `app/auth/callback/route.js` and the shared callback handler; add no callback route to any Next.js app because only Factory API `/auth/callback` owns OAuth completion.
- Replace `@supabase/ssr` authentication in `@factory/auth` with the Factory session contract for page guards, current-user display, login, logout, and protected API requests across all three apps.
- Replace the unconditional `NODE_ENV=development` identity bypass with an environment-gated, same-origin server-side development bootstrap endpoint in each Next.js app. That endpoint alone calls API `POST /auth/dev/session` with server-held `X-Dev-Auth-Secret`, relays the API cookies to the browser, and is absent outside development; browser code never receives the secret.
- Remove client Supabase dependencies, exports, environment examples, proxy behavior, tests, and documentation that describe direct Supabase authentication.

## 2. What to verify

- `rg '@supabase/ssr|createBrowserClient|createServerClient|NEXT_PUBLIC_SUPABASE_' apps packages/auth` returns no client-auth usage, and no browser bundle contains Supabase configuration or token-reading code.
- `pnpm --filter @factory/auth test`, `pnpm --filter @factory/home test`, `pnpm --filter @factory/live-splash test`, and `pnpm --filter @factory/weather test` pass the session, route-matrix, redirect, logout, and development-gating contracts.
- `pnpm --filter @factory/home build`, `pnpm --filter @factory/live-splash build`, and `pnpm --filter @factory/weather build` pass without public Supabase configuration.
- `pytest -q services/api/tests` passes the login, callback, session refresh, logout, cookie, protected-route, and development-issuer contracts.
- `pnpm test:e2e -- --project=shared-origin` verifies one production-shaped browser flow through `/auth/login`, API `/auth/callback`, each approved `next` destination, HttpOnly Factory cookies, `/auth/session`, a protected `/app/*` request, and logout.
- `pnpm test:e2e -- --project=local-proxy` verifies each local app origin’s server-only development bootstrap, root-relative redirect, HttpOnly Factory cookies, authenticated session, protected request, and logout without exposing `X-Dev-Auth-Secret`.
- Browser tests confirm public routes remain accessible, protected pages redirect when unauthenticated, unapproved `next` values fail, Home’s callback route is absent, and no replacement Next.js callback exists.
- Protected API tests confirm valid Factory cookies succeed and missing, malformed, duplicate, expired, or Bearer-plus-cookie credentials return `401 INVALID_CREDENTIALS`; refresh failure and logout clear both Factory cookies.
- `pnpm check` passes as the final gate.
