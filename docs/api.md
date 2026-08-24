# Factory API contract

Factory API is a server-owned HTTP backend. App endpoints use /app/<app-name>/v1/<feature>; Supabase data services and provider API calls stay server-side.

## Provider-token authentication

GET /health is public. Every /app/_/v1/_ request requires exactly one verified Supabase access credential: Authorization Bearer access-jwt for native/API clients or the HttpOnly Factory-Access-Token browser cookie. Header plus cookie, duplicate credentials, malformed, expired, wrong issuer/audience, invalid signature, or unknown credentials return 401 INVALID_CREDENTIALS.

GET /auth/login creates a five-minute encrypted PKCE/state record bound to Factory-OAuth-Transaction. GET /auth/callback consumes it and sets HttpOnly Secure SameSite=Lax Factory-Access-Token and Factory-Refresh-Token cookies. No Factory token or session is created or persisted. GET /auth/session returns selected user data and refreshes browser cookies server-side. Failed browser refresh clears both. POST /auth/logout tries provider revocation and clears cookies.

POST /auth/native/challenge returns one-time nonce. POST /auth/native/exchange accepts Google ID token plus nonce and returns a Supabase token pair. POST /auth/token/refresh returns Supabase rotated token pairs. Supabase UUID sub is canonical; email and phone are profile fields only.

The server validates asymmetric JWTs with Supabase JWKS. Legacy HS256 projects with no JWKS keys use authoritative Supabase Auth GET /auth/v1/user verification; unverified JWTs are never accepted.

## Local development test authentication

Only when `ENVIRONMENT=development` and `DEV_AUTH_ENABLED=true`, the API registers `POST /auth/dev/token` and `POST /auth/dev/session`. Both require the `X-Dev-Auth-Secret` header and authenticate the bootstrap-created local Supabase test login with the password grant. `/auth/dev/token` returns a no-store Supabase access/refresh pair for Postman or native API tests. `/auth/dev/session` returns no content and sets no-store HttpOnly, SameSite=Lax Factory access/refresh cookies; they are non-Secure only when the configured API origin is localhost.

For Postman, set the request URL to `http://localhost:3004/auth/dev/token`, method `POST`, and header `X-Dev-Auth-Secret` to the value in ignored `services/api/.env`; save the returned fields as collection variables. For browser/cookie-jar testing, POST the same header to `/auth/dev/session`, then send the resulting cookies to a protected route.

The development bootstrap creates or resets the confirmed test login using the local Supabase Admin API, without placing its service-role key in `services/api/.env` or the API container. Browser calls must use an explicit local CORS origin and may send `Authorization`, `Content-Type`, and `X-Dev-Auth-Secret`; wildcard origins are never used with credentials. The issuer routes and their OpenAPI entries are absent in all other environments.
