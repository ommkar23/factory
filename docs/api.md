# Factory API contract

`services/api` is the shared HTTP backend for Factory apps. New application endpoints belong in an app router and use `/app/<app-name>/v1/<named-feature>`; for example, `/app/live-splash/v1/feed`.

The API returns stable JSON errors:

```json
{
  "error": {
    "code": "UPSTREAM_UNAVAILABLE",
    "message": "The upstream service is unavailable."
  }
}
```

Successful Weather responses use `Cache-Control: private, no-store` because the routes require a Factory session. Error responses and all authentication responses use `Cache-Control: no-store`. Client adoption is a separately planned migration.

## Server-only authentication

`GET /health` is public. In production, browser sign-in begins at `GET /auth/login`. Its optional `next` value must be an allow-listed relative Factory path. The API creates a separate short-lived `Factory-OAuth-Transaction` cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, path `/`) and stores only its SHA-256 binding with the encrypted PKCE state and verifier. `GET /auth/callback` requires that same browser transaction, atomically consumes the bound state exactly once, clears the transaction cookie, and only then exchanges the code with Supabase server-side.

A successful callback returns a `303` redirect and an opaque `Factory-Session` cookie with `HttpOnly`, `Secure`, `SameSite=Lax`, and path `/`. It never returns a Supabase access token or refresh token. `GET /auth/session` returns only the selected user profile fields (`id` and optional `email`). `POST /auth/logout` deletes the server record and expires that cookie.

All `/app/<app-name>/v1/*` routes accept the Factory cookie, not Authorization Bearer tokens. The API refreshes expiring Supabase credentials server-side and rotates the encrypted record. Missing, invalid, expired, or refresh-failed records return `401 INVALID_SESSION` with the stable error envelope. The stored PKCE state, access token, refresh token, user fields, and expiry are encrypted in the configured durable session store (PostgreSQL in production; SQLite is local-only).

`SUPABASE_URL` is the API's internal Supabase endpoint for server token exchanges and refreshes. `SUPABASE_AUTHORIZATION_URL` is optional and controls the browser authorization redirect; it defaults to `SUPABASE_URL`, so production needs no additional setting when both origins match. Local Compose uses `SUPABASE_URL=http://api-gw:8000` and `SUPABASE_AUTHORIZATION_URL=http://localhost:8000` because browsers cannot resolve Docker service hostnames.

`ENVIRONMENT=development` is the local-only protected-route bypass. When its OAuth/session settings are absent, all `/auth/*` endpoints return `503 AUTH_NOT_CONFIGURED` with the stable error envelope instead of attempting a partial sign-in flow; protected `/app/*` routes remain bypassed. Production requires `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `AUTH_PUBLIC_URL`, `AUTH_SESSION_ENCRYPTION_KEY`, and `AUTH_SESSION_DATABASE_URL`. No access token, refresh token, encryption key, or server credential belongs in a browser environment variable or repository file.
