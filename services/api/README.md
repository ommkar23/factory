# Factory API

Shared FastAPI service for Factory applications. It currently exposes Weather without changing any client app.

## Run and test

```sh
docker build -t factory-api services/api
docker run --rm -p 8000:8000 factory-api
# In another terminal
docker run --rm -v "$PWD:/workspace" -w /workspace/services/api python:3.12.14-slim sh -c   "pip install --quiet --root-user-action=ignore -e .[dev] && pytest"
```

`docker compose up --build api` publishes the service at `http://localhost:3004`.

## API convention

Routes are named `/app/<app-name>/v1/<named-feature>`. Current routes:

- `GET /health`
- `GET /app/weather/v1/locations?q=<query>`
- `GET /app/weather/v1/current-conditions?latitude=<number>&longitude=<number>`

The service calls Open-Meteo; clients never receive provider errors or payloads. Authentication, Supabase, Redis, and client migration are out of scope.

## OpenAPI documentation

FastAPI publishes the live contract at `/docs` (Swagger UI), `/redoc`, and `/openapi.json`. With Compose, use `http://localhost:3004/docs` or `http://localhost:3004/openapi.json`.

## Documentation standard

Every public endpoint must remain usable without reading its implementation. When adding or changing an endpoint:

- Set a concise `summary`, a client-focused `description`, and a `response_model`.
- Document every input with a description, constraints, and representative examples.
- Declare stable non-success responses and their error envelope.
- Describe response fields with `Field`, including units, formats, and enumerated meanings where applicable.
- Update `tests/test_openapi.py` and `docs/api.md` with the public contract change.

Set `CORS_ALLOW_ORIGINS` to a comma-separated, explicit list of browser origins. Do not use a wildcard origin.
