# Factory API

The shared FastAPI service is Factory’s server-side API boundary. It owns all external-provider adapters and SDKs, provider credentials, response normalization, upstream timeouts, and safe error mapping. Browsers never call Supabase data services or other provider APIs, and they never receive provider configuration.

Authentication routes: `GET /auth/login`, `GET /auth/callback`, `GET /auth/session`, `POST /auth/logout`, `POST /auth/native/challenge`, `POST /auth/native/exchange`, and `POST /auth/token/refresh`. Browser OAuth uses only encrypted short-lived PKCE/state records bound to `Factory-OAuth-Transaction`. The callback sets HttpOnly Secure SameSite=Lax `Factory-Access-Token` and `Factory-Refresh-Token` cookies; no Factory session or token record is persisted.

Protected app routes accept exactly one credential: a Supabase access JWT in Authorization Bearer for native/API clients, or `Factory-Access-Token` for browser clients. The canonical principal is Supabase UUID sub. Asymmetric tokens are checked against Supabase JWKS for signature, issuer, audience, expiry, and subject. For legacy HS256 projects with no JWKS keys, the API verifies safely through Supabase Auth `GET /auth/v1/user`, never by accepting an unverified decode.

Native clients use a one-time Google nonce then receive or refresh provider token pairs only. Browser cookie refresh rotates cookies server-side and failed refresh or logout clears them. Home, Live Splash, and Weather call only same-origin Factory `/auth/*` and `/app/*`; deployment routing and the Next.js local proxy send those paths to this API. App-local `/api/health` and the server-only development auth bootstrap are explicit exceptions. External navigation and attribution links are not API calls.

Run all API tests: `docker run --rm -v $PWD:/workspace -w /workspace python:3.12.14-slim sh -c 'pip install -e .[dev] && pytest -q'`.

For local development only, `./scripts/setup-factory-dev.sh` creates or resets a confirmed Supabase test login, writes the issuer secret to ignored `services/api/.env`, and writes only that secret plus the internal API URL to each ignored app `.env.local`. With `DEV_AUTH_ENABLED=true`, Postman/native callers can use `X-Dev-Auth-Secret` with `POST /auth/dev/token`. A browser instead calls its same-origin `POST /api/auth/dev/bootstrap`; the Next.js server uses the server-held secret to call API `POST /auth/dev/session` and relays Factory cookies. These routes are not registered outside explicit development, and neither the secret nor the direct issuer endpoint is a browser contract.
