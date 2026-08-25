# Token REST API Authentication Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Require valid Supabase user access tokens for Factory REST endpoints while keeping `/health` unauthenticated.

**Architecture:** Production verifies the Bearer Supabase access JWT in the Authorization header against a configured Supabase JWKS URL, issuer, audience, expiry, and subject; development retains the intentional local-auth bypass. A shared dependency protects `/app/*/v1/*`, not health checks or CORS preflight.

**Tech Stack:** FastAPI, JWT/JWKS verifier, Supabase Auth JWTs, pytest.

---

### Task 1: Define the token-auth contract and configuration

**Files:**
- Modify: `services/api/pyproject.toml`, `services/api/src/factory_api/config.py`, `services/api/README.md`, `docs/api.md`
- Test: `services/api/tests/test_auth.py`

1. Add a maintained JWT/JWKS verifier dependency; do not use Supabase service-role keys or a shared signing secret in the API.
2. Add explicit non-secret settings for `SUPABASE_JWKS_URL`, expected issuer, and expected audience; fail production startup when required settings are absent. Treat `ENVIRONMENT=development` as the only bypass mode.
3. Document the Bearer access-JWT header, protected-route scope, `401` error envelope (`MISSING_TOKEN`/`INVALID_TOKEN`), local bypass, and deployment variables. Do not commit tokens or `.env` files.
4. Test environment parsing and production configuration failure.

### Task 2: Implement reusable JWT verification

**Files:**
- Create: `services/api/src/factory_api/auth.py`
- Modify: `services/api/src/factory_api/dependencies.py`, `services/api/src/factory_api/errors.py`
- Test: `services/api/tests/test_auth.py`

1. Extract one strict Bearer token (reject missing, empty, malformed, duplicate, and non-Bearer headers).
2. Resolve keys from JWKS with safe caching/refresh-on-unknown-`kid`; allow only configured asymmetric algorithms and verify signature plus `iss`, `aud`, `exp`, and non-empty `sub`.
3. Return a minimal authenticated-principal dependency (at least `sub`); never log or return raw tokens, claims, verifier errors, or key material.
4. Map failures to the existing no-store error envelope and `401`; test valid token, expiry, bad signature, wrong issuer/audience, unknown key, bad headers, and development bypass.

### Task 3: Protect the API and OpenAPI contract

**Files:**
- Modify: `services/api/src/factory_api/routers/weather.py`, `services/api/src/factory_api/main.py`, `services/api/tests/test_weather.py`, `services/api/tests/test_openapi.py`

1. Attach the principal dependency at `/app/weather/v1`; leave `/health` public for Compose/load balancers.
2. Reject unauthenticated requests before provider calls. Reassess existing `public` cache policies: user-specific responses must be `private` or `no-store` unless safely authorization-independent.
3. Add OpenAPI HTTP Bearer security and documented stable `401` responses without inaccurate `422`s.
4. Test health/no-token success, each protected endpoint with absent/invalid/valid token, and CORS preflight for configured origins.

### Task 4: Validate packaging and deployment wiring

**Files:**
- Modify: `compose.yml`, `services/api/README.md` (if needed)

1. Wire variable names/placeholders only; production has no token-validation fallback.
2. Run `pytest` in `services/api`, build the API image, and load `create_app().openapi()` from it. With a test JWKS service, exercise valid, expired, and malformed requests against the container.
3. Run `pnpm check` and `git diff --check`; stage for review without committing unless explicitly requested.

**Scope boundary:** This secures `services/api`; migrating existing Weather Next.js routes to call it and forward/obtain user access tokens is a separate client-migration plan.

**Risk:** Browser authorization headers trigger CORS preflight, and user-specific authorization makes the current shared `public` cache policies unsafe.
