# Factory API contract

Factory API is a server-owned HTTP backend. App endpoints use /app/<app-name>/v1/<feature>; Supabase data services and provider API calls stay server-side.

## Provider-token authentication

GET /health is public. Every /app/_/v1/_ request requires exactly one verified Supabase access credential: Authorization Bearer access-jwt for native/API clients or the HttpOnly Factory-Access-Token browser cookie. Header plus cookie, duplicate credentials, malformed, expired, wrong issuer/audience, invalid signature, or unknown credentials return 401 INVALID_CREDENTIALS.

GET /auth/login creates a five-minute encrypted PKCE/state record bound to Factory-OAuth-Transaction. GET /auth/callback consumes it and sets HttpOnly Secure SameSite=Lax Factory-Access-Token and Factory-Refresh-Token cookies. No Factory token or session is created or persisted. GET /auth/session returns selected user data and refreshes browser cookies server-side. Failed browser refresh clears both. POST /auth/logout tries provider revocation and clears cookies.

POST /auth/native/challenge returns one-time nonce. POST /auth/native/exchange accepts Google ID token plus nonce and returns a Supabase token pair. POST /auth/token/refresh returns Supabase rotated token pairs. Supabase UUID sub is canonical; email and phone are profile fields only.

The server validates asymmetric JWTs with Supabase JWKS. Legacy HS256 projects with no JWKS keys use authoritative Supabase Auth GET /auth/v1/user verification; unverified JWTs are never accepted.
