# Factory API contract

Factory API is a server-owned HTTP backend. App endpoints use `/app/<app-name>/v1/<feature>`; Supabase data services and provider API calls stay server-side. Browsers use only same-origin `/auth/*` and `/app/*` paths: production routing sends those paths to Factory API, while local Next.js apps proxy them internally. Browser code never calls Supabase or a separate Factory API origin.

## Provider-token authentication

`GET /health` is public. Every `/app/*/v1/*` request requires exactly one verified Supabase access credential: an Authorization Bearer access JWT for native/API clients or the HttpOnly `Factory-Access-Token` browser cookie. Header plus cookie, duplicate credentials, malformed, expired, wrong issuer/audience, invalid signature, or unknown credentials return `401 INVALID_CREDENTIALS`.

`GET /auth/login?next=…` creates a five-minute encrypted PKCE/state record bound to `Factory-OAuth-Transaction`. `GET /auth/callback` consumes it and sets HttpOnly Secure SameSite=Lax `Factory-Access-Token` and `Factory-Refresh-Token` cookies. No Factory token or session is created or persisted. `GET /auth/session` returns selected user data and refreshes browser cookies server-side. Failed browser refresh clears both. `POST /auth/logout` tries provider revocation and clears cookies.

`POST /auth/native/challenge` returns one-time nonce. `POST /auth/native/exchange` accepts a Google ID token plus nonce and returns a Supabase token pair. `POST /auth/token/refresh` returns Supabase rotated token pairs. Supabase UUID sub is canonical; email and phone are profile fields only.

The server validates asymmetric JWTs with Supabase JWKS. Legacy HS256 projects with no JWKS keys use authoritative Supabase Auth `GET /auth/v1/user` verification; unverified JWTs are never accepted.

## Weather API

Both weather routes require the provider-token authentication described above and return `Cache-Control: private, no-store`.

- `GET /app/weather/v1/locations?q=<query>` accepts exactly one trimmed query from 2 through 100 characters and returns at most five normalized locations.
- `GET /app/weather/v1/current-conditions?latitude=<latitude>&longitude=<longitude>` accepts exactly one numeric WGS84 latitude from -90 through 90 and longitude from -180 through 180 and returns normalized metric current conditions.

Invalid or duplicate parameters return `400 INVALID_REQUEST`. Provider rate limits return `429 UPSTREAM_RATE_LIMITED`; unavailable providers return `502 UPSTREAM_UNAVAILABLE`, and invalid provider payloads return `502 UPSTREAM_INVALID_RESPONSE`.

The FastAPI OpenAPI document is the authoritative field-level schema for successful and error responses.

## Local development test authentication

Only when `ENVIRONMENT=development` and `DEV_AUTH_ENABLED=true`, the API registers `POST /auth/dev/token` and `POST /auth/dev/session`. Both require the `X-Dev-Auth-Secret` header and authenticate the bootstrap-created local Supabase test login with the password grant. `/auth/dev/token` returns a no-store Supabase access/refresh pair for Postman or native API tests. `/auth/dev/session` returns no content and sets no-store HttpOnly, SameSite=Lax Factory access/refresh cookies; they are non-Secure only when the configured API origin is localhost.

Postman or native tests may call the `/auth/dev/token` path on an app URL printed by `python3 -m scripts.deploy.app up <app>` with `X-Dev-Auth-Secret` from that app's ignored `.hermes/runtime/deploy/<app>/api.env`. Browsers must not call `/auth/dev/session` and must never receive that header or secret. In local browser development, call the app's same-origin `POST /api/auth/dev/bootstrap`; the Next.js server alone adds the secret upstream and relays only Factory cookies. That route is absent outside Next.js development mode.

The development bootstrap creates or resets the confirmed test login using the local Supabase Admin API, without placing its service-role key in the API environment or container. The issuer routes and their OpenAPI entries are absent in all other environments.
