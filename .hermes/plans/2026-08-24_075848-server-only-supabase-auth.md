# Server-Only Supabase Auth Plan

**Goal:** Move Google/Supabase OAuth, token storage, refresh, and API authentication into `services/api`; browsers receive only an opaque Factory session cookie.

**Assumption:** `services/api` is publicly reachable at a stable HTTPS auth origin and has a durable server-side session store (Redis or database).

1. **Configuration and session store** — add server-only Supabase URL/publishable key, public callback URL, cookie settings, session-encryption key, and session-store configuration. Fail production startup if absent. Create a session record keyed by a random opaque ID, containing encrypted Supabase access/refresh tokens, expiry, user ID, and PKCE/state metadata.
2. **OAuth endpoints** — add documented `/auth/login`, `/auth/callback`, `/auth/logout`, and `/auth/session` routes. Login validates a relative allow-listed return path, stores state/PKCE server-side, and redirects to Supabase Google OAuth. Callback validates state, exchanges the code server-side, writes an HttpOnly/Secure/SameSite Factory cookie, and redirects to the approved return path.
3. **Refresh and API auth** — replace browser Bearer-token dependence with a FastAPI dependency that resolves the Factory cookie, refreshes Supabase tokens server-side before expiry, rotates stored credentials, and supplies the verified user principal to `/app/*/v1/*`. On refresh failure, delete the session and return stable `401` errors. Keep `/health` public.
4. **Contract and verification** — document cookie/auth behavior in OpenAPI/README; test PKCE/state, callback errors, cookie flags, refresh rotation/failure, logout, unauthorized protected routes, and redirect validation. Build/run the image with a test session store; verify no Supabase token is returned to a browser response.

**Files:** `services/api/src/factory_api/{config,auth,main}.py`, new auth/session modules and router, `services/api/tests/test_auth.py`, `test_openapi.py`, `pyproject.toml`, `README.md`, `.env.example`, and deployment configuration.
