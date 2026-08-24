# Factory API

The shared FastAPI service is the server-only Supabase AuthProvider adapter. It calls Supabase Auth and external providers; clients never call Supabase data services.

Authentication routes: GET /auth/login, GET /auth/callback, GET /auth/session, POST /auth/logout, POST /auth/native/challenge, POST /auth/native/exchange, and POST /auth/token/refresh. Browser OAuth uses only encrypted short-lived PKCE/state records bound to Factory-OAuth-Transaction. Callback sets HttpOnly Secure SameSite=Lax Factory-Access-Token and Factory-Refresh-Token cookies; no Factory session or token record is persisted.

Protected app routes accept exactly one credential: a Supabase access JWT in Authorization Bearer for native/API clients, or Factory-Access-Token for browser clients. The canonical principal is Supabase UUID sub. Asymmetric tokens are checked against Supabase JWKS for signature, issuer, audience, expiry, and subject. For legacy HS256 projects with no JWKS keys, the API verifies safely through Supabase Auth GET /auth/v1/user, never by accepting an unverified decode.

Native clients use a one-time Google nonce then receive or refresh provider token pairs only. Browser cookie refresh rotates cookies server-side and failed refresh or logout clears them.

Run all API tests: docker run --rm -v $PWD:/workspace -w /workspace python:3.12.14-slim sh -c pip install -e .[dev] and pytest -q.

For local development only, `./scripts/setup-factory-dev.sh` creates or resets a confirmed Supabase test login and writes its email/password plus a random issuer secret to ignored `services/api/.env`. With `DEV_AUTH_ENABLED=true`, use `X-Dev-Auth-Secret` with POST `/auth/dev/token` for a Postman/native token pair or POST `/auth/dev/session` for an HttpOnly localhost cookie jar. These routes are not registered outside explicit development.
