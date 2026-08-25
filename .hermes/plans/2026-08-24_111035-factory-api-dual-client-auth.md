# Provider-Token API Auth Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Use Supabase-issued credentials for Factory API authentication without letting clients call Supabase data services directly.

**Architecture:** `services/api` is the current Supabase AuthProvider adapter. Web uses Supabase token cookies; native/API clients use Supabase access JWTs in the HTTP authorization header. The API owns OAuth orchestration and all Supabase data-service calls, but does not mint or persist Factory access/refresh tokens or Factory user sessions.

**Scope:** Server/API only. Do not modify `apps/*` or `packages/auth/*`.

---

## Build

1. Replace persisted Factory Supabase sessions with encrypted, short-lived PKCE/state storage only.
2. Add a small server-side AuthProvider boundary with a Supabase implementation for OAuth code exchange, Google ID-token exchange, JWT verification, refresh, and logout/revocation.
3. Build or update these API routes:
   - `GET /auth/login` — begin browser Google OAuth.
   - `GET /auth/callback` — exchange code and set HttpOnly Supabase access/refresh cookies.
   - `GET /auth/session` — return selected user data for a valid cookie or access JWT.
   - `POST /auth/logout` — revoke provider credentials where supported and clear browser cookies.
   - `POST /auth/native/challenge` — create a one-time Google nonce challenge for any native client.
   - `POST /auth/native/exchange` — exchange a native Google ID token for a Supabase token pair.
   - `POST /auth/token/refresh` — refresh a Supabase token pair server-side.
4. Authenticate `/app/*/v1/*` with either an access JWT in the HTTP authorization header or an HttpOnly access-token cookie.
5. Validate access JWT signature, issuer, audience, expiry, and subject through Supabase JWKS. Reject malformed, expired, unknown, and ambiguous credentials.
6. Refresh browser cookies server-side when needed; clear them on failed refresh/logout. Native refresh returns Supabase’s rotated access/refresh pair.
7. Keep Supabase UUID (`sub`) as the canonical principal. Treat email/phone only as profile attributes; do not introduce Factory user IDs.
8. Update API configuration, deployment wiring, OpenAPI, and docs for the cookie/bearer/native-token contract.

## Verify

- Existing browser OAuth PKCE/state validation still works.
- Valid Supabase cookie and access JWT both authorize protected API routes.
- Invalid signature, wrong issuer/audience, expiry, malformed/duplicate headers, and ambiguous cookie-plus-header requests return stable `401` errors.
- Browser cookie refresh rotates Supabase cookies; failed refresh clears them. Native refresh returns the provider’s rotated pair.
- Native Google exchange returns Supabase tokens only; no Factory token/session record or Supabase data-service endpoint is exposed to clients.
- `/health` remains public; logout clears cookies and revokes provider credentials where supported.
- Run focused API tests, complete API suite in Docker, API image build, running-image OpenAPI check, `pnpm check`, and `git diff --check`.

## Migration constraint

A future Firebase/other-provider migration changes token acquisition, but API business code remains insulated by the AuthProvider boundary. Link a new provider’s immutable subject to the existing Supabase UUID through a verified migration flow, never email/phone matching. “Native” includes mobile, desktop, TV, and IoT clients.