# Factory API contract

`services/api` is the shared HTTP backend for Factory apps. New endpoints belong in an app router and use `/app/<app-name>/v1/<named-feature>`; for example, `/app/live-splash/v1/feed`.

The API returns stable JSON errors:

```json
{
  "error": {
    "code": "UPSTREAM_UNAVAILABLE",
    "message": "The upstream service is unavailable."
  }
}
```

Successful Weather responses use `Cache-Control: private, no-store` because the routes require authorization. Error responses use `Cache-Control: no-store`. Client adoption is a separately planned migration.

## Authentication

`GET /health` is public. In production, all `/app/<app-name>/v1/*` routes require a Supabase user access JWT in the Authorization Bearer header. The API verifies the JWT against the project JWKS and validates its issuer, audience, expiry, and subject. Missing credentials return `401 MISSING_TOKEN`; malformed, expired, or invalid credentials return `401 INVALID_TOKEN`.

`ENVIRONMENT=development` is the local-only authentication bypass. Production requires `SUPABASE_JWKS_URL`, `SUPABASE_JWT_ISSUER`, and `SUPABASE_JWT_AUDIENCE`; no JWT values are checked into this repository.
