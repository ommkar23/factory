import math
import re
from collections.abc import Mapping, Sequence
from typing import Any, Protocol
from urllib.parse import urlencode
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_ENDPOINT = "https://api.open-meteo.com/v1/forecast"
TIMEOUT_SECONDS = 5.0
_CURRENT_FIELDS = (
    "temperature_2m",
    "apparent_temperature",
    "relative_humidity_2m",
    "precipitation",
    "weather_code",
    "wind_speed_10m",
    "wind_direction_10m",
    "is_day",
)
_TIME_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$")


class AsyncHttpClient(Protocol):
    async def get(self, url: str, *, timeout: float) -> Any: ...


class ProviderPayloadError(Exception):
    pass


class UpstreamHttpError(Exception):
    def __init__(self, status_code: int, _: str = "") -> None:
        self.status_code = status_code
        super().__init__(f"Open-Meteo returned HTTP {status_code}.")


class OpenMeteoProvider:
    def __init__(self, client: AsyncHttpClient, timeout_seconds: float = TIMEOUT_SECONDS) -> None:
        self._client = client
        self._timeout_seconds = timeout_seconds

    async def search_locations(self, query: str) -> list[dict[str, Any]]:
        url = f"{GEOCODING_ENDPOINT}?{urlencode({"name": query.strip(), "count": "5", "language": "en", "format": "json"})}"
        return normalize_locations(await self._request(url))

    async def get_current_conditions(self, latitude: float, longitude: float) -> dict[str, Any]:
        validate_coordinates(latitude, longitude)
        params = {
            "latitude": str(latitude),
            "longitude": str(longitude),
            "timezone": "auto",
            "temperature_unit": "celsius",
            "wind_speed_unit": "kmh",
            "precipitation_unit": "mm",
            "current": ",".join(_CURRENT_FIELDS),
        }
        return normalize_current_conditions(await self._request(f"{FORECAST_ENDPOINT}?{urlencode(params)}"))

    async def _request(self, url: str) -> object:
        response = await self._client.get(url, timeout=self._timeout_seconds)
        if response.status_code < 200 or response.status_code >= 300:
            raise UpstreamHttpError(response.status_code)
        try:
            return response.json()
        except Exception as error:
            raise ProviderPayloadError("Open-Meteo returned invalid JSON.") from error


def normalize_locations(payload: object) -> list[dict[str, Any]]:
    root = record(payload, "geocoding response")
    results = root.get("results")
    if results is None:
        return []
    if not isinstance(results, list):
        fail("Geocoding results must be an array.")
    return [normalize_location(record(item, "geocoding result")) for item in results]


def normalize_location(value: Mapping[str, object]) -> dict[str, Any]:
    identifier = number(value, "id")
    if not isinstance(identifier, int) or identifier <= 0:
        fail("Location id must be a positive integer.")
    country_code = text(value, "country_code").upper()
    if not re.fullmatch(r"[A-Z]{2}", country_code):
        fail("Location country code must be ISO alpha-2.")
    latitude = number(value, "latitude")
    longitude = number(value, "longitude")
    validate_coordinates(latitude, longitude)
    timezone = text(value, "timezone")
    validate_timezone(timezone)
    parts = unique_parts(
        optional_text(value.get(key))
        for key in ("admin1", "admin2", "admin3", "admin4", "country")
    )
    return {
        "countryCode": country_code,
        "id": str(identifier),
        "latitude": latitude,
        "longitude": longitude,
        "name": text(value, "name"),
        "region": ", ".join(parts) or country_code,
        "timezone": timezone,
    }


def normalize_current_conditions(payload: object) -> dict[str, Any]:
    root = record(payload, "forecast response")
    timezone = text(root, "timezone")
    validate_timezone(timezone)
    current = record(root.get("current"), "current conditions")
    units = record(root.get("current_units"), "current condition units")
    validate_units(units)
    observed_at = text(current, "time")
    if not _TIME_PATTERN.fullmatch(observed_at):
        fail("Current observation time must be local ISO 8601.")
    weather_code = number(current, "weather_code")
    if not isinstance(weather_code, int):
        fail("weather_code must be an integer.")
    humidity = number(current, "relative_humidity_2m")
    precipitation = number(current, "precipitation")
    wind_speed = number(current, "wind_speed_10m")
    wind_direction = number(current, "wind_direction_10m")
    is_day = number(current, "is_day")
    if not 0 <= humidity <= 100 or precipitation < 0 or wind_speed < 0:
        fail("Invalid current-condition measurements.")
    if not 0 <= wind_direction <= 360 or is_day not in (0, 1):
        fail("Invalid current-condition measurements.")
    return {
        "apparentTemperatureC": number(current, "apparent_temperature"),
        "condition": weather_condition(weather_code),
        "humidityPercent": humidity,
        "isDay": is_day == 1,
        "observedAt": observed_at,
        "precipitationMm": precipitation,
        "temperatureC": number(current, "temperature_2m"),
        "timezone": timezone,
        "weatherCode": weather_code,
        "windDirectionDegrees": wind_direction,
        "windDirectionLabel": cardinal_direction(wind_direction),
        "windSpeedKmh": wind_speed,
    }


def weather_condition(code: int) -> dict[str, str]:
    labels = {
        0: ("clear", "Clear sky"), 1: ("partly-cloudy", "Mainly clear"), 2: ("partly-cloudy", "Partly cloudy"), 3: ("partly-cloudy", "Overcast"),
        45: ("fog", "Fog"), 48: ("fog", "Rime fog"), 51: ("drizzle", "Light drizzle"), 53: ("drizzle", "Moderate drizzle"), 55: ("drizzle", "Dense drizzle"),
        56: ("freezing-drizzle", "Light freezing drizzle"), 57: ("freezing-drizzle", "Dense freezing drizzle"), 61: ("rain", "Slight rain"), 63: ("rain", "Moderate rain"), 65: ("rain", "Heavy rain"),
        66: ("freezing-rain", "Light freezing rain"), 67: ("freezing-rain", "Heavy freezing rain"), 71: ("snow", "Slight snow fall"), 73: ("snow", "Moderate snow fall"), 75: ("snow", "Heavy snow fall"),
        77: ("snow-grains", "Snow grains"), 80: ("rain-showers", "Slight rain showers"), 81: ("rain-showers", "Moderate rain showers"), 82: ("rain-showers", "Violent rain showers"),
        85: ("snow-showers", "Slight snow showers"), 86: ("snow-showers", "Heavy snow showers"), 95: ("thunderstorm", "Thunderstorm"), 96: ("thunderstorm-hail", "Thunderstorm with slight hail"), 99: ("thunderstorm-hail", "Thunderstorm with heavy hail"),
    }
    kind, label = labels.get(code, ("unknown", "Unknown conditions"))
    return {"kind": kind, "label": label}


def cardinal_direction(degrees: float) -> str:
    directions = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
    return directions[int((degrees + 22.5) // 45) % 8]


def validate_units(units: Mapping[str, object]) -> None:
    expected = {
        "time": "iso8601", "temperature_2m": "°C", "apparent_temperature": "°C",
        "relative_humidity_2m": "%", "precipitation": "mm", "weather_code": "wmo code",
        "wind_speed_10m": "km/h", "wind_direction_10m": "°", "is_day": "",
    }
    if any(units.get(key) != unit for key, unit in expected.items()):
        fail("Unexpected Open-Meteo units.")


def validate_coordinates(latitude: float, longitude: float) -> None:
    if not all(math.isfinite(value) for value in (latitude, longitude)) or not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        fail("Coordinates must be finite WGS84 latitude/longitude values.")


def validate_timezone(value: str) -> None:
    try:
        ZoneInfo(value)
    except ZoneInfoNotFoundError as error:
        raise ProviderPayloadError("Invalid IANA timezone.") from error


def record(value: object, context: str) -> Mapping[str, object]:
    if not isinstance(value, Mapping):
        fail(f"Malformed {context} payload.")
    return value


def text(value: Mapping[str, object], key: str) -> str:
    result = optional_text(value.get(key))
    if result is None:
        fail(f"{key} must be a non-empty string.")
    return result


def optional_text(value: object) -> str | None:
    return value.strip() or None if isinstance(value, str) else None


def number(value: Mapping[str, object], key: str) -> float | int:
    result = value.get(key)
    if isinstance(result, bool) or not isinstance(result, (int, float)) or not math.isfinite(result):
        fail(f"{key} must be a finite number.")
    return result


def unique_parts(parts: Sequence[str | None] | Any) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for part in parts:
        if part is not None and part.lower() not in seen:
            seen.add(part.lower())
            result.append(part)
    return result


def fail(message: str) -> None:
    raise ProviderPayloadError(message)
