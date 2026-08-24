from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from factory_api.config import Settings
from factory_api.errors import ApiError, api_error_handler
from factory_api.routers.auth import SupabaseAuthClient, clear_token_cookies, router as auth_router, set_token_cookies
from factory_api.routers.health import router as health_router
from factory_api.routers.weather import router as weather_router
from factory_api.session_store import create_session_store


def create_app(
    settings: Settings | None = None,
    supabase_auth_client: SupabaseAuthClient | None = None,
) -> FastAPI:
    settings = settings or Settings.from_environment()
    app = FastAPI(
        title="Factory API",
        version="1.0.0",
        description=("Shared REST API for Factory applications. Endpoints are namespaced as " "`/app/<app-name>/v1/<named-feature>`."),
    )
    app.state.settings = settings
    if settings.auth_session_database_url and settings.auth_session_encryption_key:
        app.state.session_store = create_session_store(settings.auth_session_database_url, settings.auth_session_encryption_key)
        app.state.session_store.initialize()
    if settings.supabase_url and settings.supabase_publishable_key:
        app.state.supabase_auth_client = supabase_auth_client or SupabaseAuthClient(
            settings.supabase_url, settings.supabase_publishable_key, settings.supabase_authorization_url
        )
    app.add_exception_handler(ApiError, api_error_handler)

    @app.middleware("http")
    async def persist_refreshed_browser_tokens(request, call_next):
        response = await call_next(request)
        token_data = getattr(request.state, "refreshed_token_data", None)
        if getattr(request.state, "clear_browser_tokens", False):
            clear_token_cookies(response)
        elif token_data is not None:
            set_token_cookies(response, token_data)
        return response

    if settings.cors_allow_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(settings.cors_allow_origins),
            allow_credentials=True,
            allow_methods=["GET", "POST"],
            allow_headers=["Authorization"],
        )
    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(weather_router)
    app.openapi = lambda: factory_openapi(app)
    return app


def factory_openapi(app: FastAPI) -> dict:
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(title=app.title, version=app.version, description=app.description, routes=app.routes)
    for path, names in {
        "/app/weather/v1/locations": ("q",),
        "/app/weather/v1/current-conditions": ("latitude", "longitude"),
        "/auth/login": (),
        "/auth/callback": ("code", "state"),
    }.items():
        operation = schema["paths"][path]["get"]
        operation["responses"].pop("422", None)
        for parameter in operation["parameters"]:
            if parameter["name"] in names:
                parameter["required"] = True
    schema.setdefault("components", {}).setdefault("securitySchemes", {}).update({
        "SupabaseBearer": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"},
        "SupabaseCookie": {"type": "apiKey", "in": "cookie", "name": "Factory-Access-Token"},
    })
    for path, methods in schema["paths"].items():
        if path.startswith("/app/"):
            for operation in methods.values():
                operation["security"] = [{"SupabaseBearer": []}, {"SupabaseCookie": []}]
    app.openapi_schema = schema
    return schema


app = create_app()
