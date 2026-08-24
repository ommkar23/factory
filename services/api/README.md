# Factory API

Shared FastAPI service for Factory applications. It exposes the server-owned Supabase Google OAuth flow and Weather without changing any client app.

## Run and test

```sh
docker build -t factory-api services/api
docker run --rm -e ENVIRONMENT=development -p 8000:8000 factory-api
# In another terminal
docker run --rm -v "$PWD:/workspace" -w /workspace/services/api python:3.12.14-slim sh -c "pip install --quiet --root-user-action=ignore -e .[dev] && pytest"
```

`docker compose up --build api` publishes the service at `http://localhost:3004`.

## API convention

Routes are named `/app/<app-name>/v1/<named-feature>`. Current routes:

- `GET /health`
- `GET /auth/login?next=<allow-listed-relative-path>`
- `GET /auth/callback?code=<code>&state=<state>`
- `GET /auth/session`
- `POST /auth/logout`
- `GET /app/weather/v1/locations?q=<query>`
- `GET /app/weather/v1/current-conditions?latitude=<number>&longitude=<number>`

The service calls Open-Meteo; clients never receive provider errors or payloads.

## OpenAPI documentation

FastAPI publishes the live contract at `/docs` (Swagger UI), `/redoc`, and `/openapi.json`. With Compose, use `http://localhost:3004/docs` or `http://localhost:3004/openapi.json`.

## Documentation standard

Every public endpoint must remain usable without reading its implementation. When adding or changing an endpoint:

- Set a concise `summary`, a client-focused `description`, and a `response_model` where the response is structured.
- Document every input with a description, constraints, and representative examples.
- Declare stable non-success responses and their error envelope.
- Describe response fields with `Field`, including units, formats, and enumerated meanings where applicable.
- Update `tests/test_openapi.py` and `docs/api.md` with the public contract change.

Set `CORS_ALLOW_ORIGINS` to a comma-separated, explicit list of browser origins. Do not use a wildcard origin. Cookie requests are credentialed; the API permits only `GET` and `POST` methods and does not accept browser Bearer credentials.

## Server-only Supabase authentication

`/health` is public. In production, `/auth/login` creates a PKCE verifier and one-use state in the encrypted server store plus a separate short-lived browser transaction cookie (`Factory-OAuth-Transaction`, `HttpOnly`, `Secure`, `SameSite=Lax`, path `/`). The encrypted state stores only the transaction cookie's SHA-256 binding. `/auth/callback` requires the matching transaction, atomically consumes the bound state, clears the transaction cookie, exchanges the authorization code with Supabase from the server, and redirects with the opaque `Factory-Session` cookie (`HttpOnly`, `Secure`, `SameSite=Lax`). Access tokens and refresh tokens are encrypted at rest and are never included in browser responses.

Every `/app/*` route requires that cookie. The API refreshes an expiring Supabase session server-side and rotates the encrypted credentials. A missing, invalid, or refresh-failed session is deleted and returns `401 INVALID_SESSION`. `/auth/session` returns only the selected user id and email; `POST /auth/logout` deletes the server session and expires the cookie.

Production requires these settings:

- `SUPABASE_URL` — the Supabase project URL used only by this API.
- `SUPABASE_AUTHORIZATION_URL` — optional browser-facing Supabase authorization origin; defaults to `SUPABASE_URL`. Local Compose keeps `SUPABASE_URL=http://api-gw:8000` for API-to-Supabase calls and sets this to `http://localhost:8000` so browser redirects are reachable.
- `SUPABASE_PUBLISHABLE_KEY` — supplied to Supabase only by this API; never use a `NEXT_PUBLIC_` variable for this flow.
- `AUTH_PUBLIC_URL` — public API origin registered as `<origin>/auth/callback` in Supabase.
- `AUTH_ALLOWED_RETURN_PATHS` — comma-separated relative paths permitted after sign-in.
- `AUTH_SESSION_ENCRYPTION_KEY` — a secret 32-byte url-safe base64 Fernet key. In Cloud Run it is injected from Secret Manager.
- `AUTH_SESSION_DATABASE_URL` — a durable `postgresql://` or `postgres://` URL. In Cloud Run it is injected from Secret Manager; SQLite is supported only by local Compose/tests.

Terraform creates the Secret Manager containers `factory-api-session-database-url` and `factory-api-session-encryption-key`; it intentionally never manages their values. Before a production deployment, add a current version of each secret. The database URL must point to a managed PostgreSQL service reachable from Cloud Run and use TLS (`sslmode=require` or stronger).

`ENVIRONMENT=development` intentionally bypasses protected-route authentication for local Factory development. If OAuth/session settings are unconfigured, `/auth/*` returns the stable `503 AUTH_NOT_CONFIGURED` error rather than starting a partial flow; the protected-route bypass remains active. The developer setup creates an ignored API-only environment file when it creates local Supabase configuration. This plan does not migrate any Next app or introduce browser-side Supabase configuration.
