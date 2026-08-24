import re
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse

from factory_api.dependencies import WeatherProvider, get_weather_provider
from factory_api.errors import ApiError
from factory_api.providers.open_meteo import ProviderPayloadError, UpstreamHttpError
from factory_api.schemas import CurrentConditionsResponse, ErrorResponse, LocationsResponse

router = APIRouter(prefix="/app/weather/v1", tags=["weather"])
_LOCATION_CACHE_CONTROL = "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800"
_CONDITIONS_CACHE_CONTROL = "public, max-age=60, s-maxage=600, stale-while-revalidate=300"
_NUMBER = re.compile(r"^-?(?:0|[1-9]\d*)(?:\.\d+)?$")
Provider = Annotated[WeatherProvider, Depends(get_weather_provider)]

def documented_error(code: str, message: str, description: str) -> dict:
    return {"model": ErrorResponse, "description": description, "content": {"application/json": {"example": {"error": {"code": code, "message": message}}}}}



@router.get(
    "/locations",
    response_model=LocationsResponse,
    summary="Search locations",
    description="Search Open-Meteo for up to five normalized locations. Results are cached for five minutes in browsers and one day by shared HTTP caches.",
    responses={400: documented_error("INVALID_REQUEST", "Request parameters are invalid.", "Invalid request parameters."), 429: documented_error("UPSTREAM_RATE_LIMITED", "The upstream service is rate limited.", "Weather provider rate limited the request."), 502: documented_error("UPSTREAM_UNAVAILABLE", "The upstream service is unavailable.", "Weather provider unavailable or returned invalid data.")},
)
async def get_locations(
    request: Request,
    provider: Provider,
    q: str | None = Query(None, description="A 2–100 character city, region, or postal-code search query. Supply exactly once.", examples=["Portland, Maine"], json_schema_extra={"minLength": 2, "maxLength": 100}),
) -> JSONResponse:
    values = request.query_params.getlist("q")
    if len(values) != 1:
        raise invalid_request()
    query = values[0].strip()
    if not 2 <= len(query) <= 100:
        raise invalid_request()
    try:
        locations = await provider.search_locations(query)
    except Exception as error:
        raise upstream_error(error) from error
    response = LocationsResponse(locations=locations[:5])
    return JSONResponse(response.model_dump(), headers={"Cache-Control": _LOCATION_CACHE_CONTROL})


@router.get(
    "/current-conditions",
    response_model=CurrentConditionsResponse,
    summary="Get current conditions",
    description="Return current normalized metric conditions for one WGS84 location. Responses are cached for one minute in browsers and ten minutes by shared HTTP caches.",
    responses={400: documented_error("INVALID_REQUEST", "Request parameters are invalid.", "Invalid request parameters."), 429: documented_error("UPSTREAM_RATE_LIMITED", "The upstream service is rate limited.", "Weather provider rate limited the request."), 502: documented_error("UPSTREAM_UNAVAILABLE", "The upstream service is unavailable.", "Weather provider unavailable or returned invalid data.")},
)
async def get_current_conditions(
    request: Request,
    provider: Provider,
    latitude_query: str | None = Query(None, alias="latitude", description="WGS84 latitude from -90 through 90. Supply exactly once.", examples=["45.5234"], json_schema_extra={"minimum": -90, "maximum": 90}),
    longitude_query: str | None = Query(None, alias="longitude", description="WGS84 longitude from -180 through 180. Supply exactly once.", examples=["-122.6762"], json_schema_extra={"minimum": -180, "maximum": 180}),
) -> JSONResponse:
    latitude = coordinate(request, "latitude", -90, 90)
    longitude = coordinate(request, "longitude", -180, 180)
    try:
        conditions = await provider.get_current_conditions(latitude, longitude)
    except Exception as error:
        raise upstream_error(error) from error
    response = CurrentConditionsResponse(conditions=conditions)
    return JSONResponse(response.model_dump(), headers={"Cache-Control": _CONDITIONS_CACHE_CONTROL})


def coordinate(request: Request, name: str, minimum: float, maximum: float) -> float:
    values = request.query_params.getlist(name)
    if len(values) != 1 or not _NUMBER.fullmatch(values[0]):
        raise invalid_request()
    value = float(values[0])
    if not minimum <= value <= maximum:
        raise invalid_request()
    return value


def invalid_request() -> ApiError:
    return ApiError("INVALID_REQUEST", "Request parameters are invalid.", 400)


def upstream_error(error: Exception) -> ApiError:
    if isinstance(error, ProviderPayloadError):
        return ApiError("UPSTREAM_INVALID_RESPONSE", "The upstream service returned an invalid response.", 502)
    if isinstance(error, UpstreamHttpError) and error.status_code == 429:
        return ApiError("UPSTREAM_RATE_LIMITED", "The upstream service is rate limited.", 429)
    return ApiError("UPSTREAM_UNAVAILABLE", "The upstream service is unavailable.", 502)
