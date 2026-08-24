from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from factory_api.auth import TokenVerifier
from factory_api.config import Settings
from factory_api.errors import ApiError, api_error_handler
from factory_api.routers.health import router as health_router
from factory_api.routers.weather import router as weather_router


def create_app(settings: Settings | None = None, token_verifier: TokenVerifier | None = None) -> FastAPI:
    settings = settings or Settings.from_environment()
    app = FastAPI(
        title="Factory API",
        version="1.0.0",
        description=("Shared REST API for Factory applications. Endpoints are namespaced as " "`/app/<app-name>/v1/<named-feature>`."),
    )
    app.state.settings = settings
    if not settings.is_development:
        app.state.token_verifier = token_verifier or TokenVerifier(settings)
    app.add_exception_handler(ApiError, api_error_handler)
    if settings.cors_allow_origins:
        app.add_middleware(CORSMiddleware, allow_origins=list(settings.cors_allow_origins), allow_methods=["GET"], allow_headers=["Authorization"])
    app.include_router(health_router)
    app.include_router(weather_router)
    app.openapi = lambda: factory_openapi(app)
    return app


def factory_openapi(app: FastAPI) -> dict:
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(title=app.title, version=app.version, description=app.description, routes=app.routes)
    for path, names in {"/app/weather/v1/locations": ("q",), "/app/weather/v1/current-conditions": ("latitude", "longitude")}.items():
        operation = schema["paths"][path]["get"]
        operation["responses"].pop("422", None)
        for parameter in operation["parameters"]:
            if parameter["name"] in names:
                parameter["required"] = True
    app.openapi_schema = schema
    return schema


app = create_app()
