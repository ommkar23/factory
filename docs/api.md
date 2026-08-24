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

Error responses use `Cache-Control: no-store`. Weather success responses retain their documented HTTP cache directives. Client adoption is a separately planned migration.
