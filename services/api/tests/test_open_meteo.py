from dataclasses import dataclass
from urllib.parse import parse_qs, urlparse

import pytest

from factory_api.providers.open_meteo import (
    OpenMeteoProvider,
    ProviderPayloadError,
    UpstreamHttpError,
)

LOCATION_PAYLOAD = {
    "results": [
        {
            "admin1": "Oregon",
            "admin2": "Multnomah County",
            "country": "United States",
            "country_code": "US",
            "id": 5746545,
            "latitude": 45.5234,
            "longitude": -122.6762,
            "name": "Portland",
            "timezone": "America/Los_Angeles",
        }
    ]
}
CURRENT_PAYLOAD = {
    "current": {
        "apparent_temperature": 19.4,
        "is_day": 1,
        "precipitation": 0.2,
        "relative_humidity_2m": 54,
        "temperature_2m": 20.1,
        "time": "2026-08-14T10:42",
        "weather_code": 2,
        "wind_direction_10m": 337.5,
        "wind_speed_10m": 11.5,
    },
    "current_units": {
        "apparent_temperature": "°C",
        "is_day": "",
        "precipitation": "mm",
        "relative_humidity_2m": "%",
        "temperature_2m": "°C",
        "time": "iso8601",
        "weather_code": "wmo code",
        "wind_direction_10m": "°",
        "wind_speed_10m": "km/h",
    },
    "timezone": "America/Los_Angeles",
}


@dataclass
class FakeResponse:
    payload: object
    status_code: int = 200

    def json(self) -> object:
        return self.payload


class RecordingClient:
    def __init__(self, response: FakeResponse) -> None:
        self.response = response
        self.calls: list[tuple[str, float]] = []

    async def get(self, url: str, *, timeout: float) -> FakeResponse:
        self.calls.append((url, timeout))
        return self.response


@pytest.mark.asyncio
async def test_search_locations_builds_bounded_english_request_and_normalizes_response() -> (
    None
):
    client = RecordingClient(FakeResponse(LOCATION_PAYLOAD))

    locations = await OpenMeteoProvider(client).search_locations("  Portland, Maine  ")

    assert locations == [
        {
            "countryCode": "US",
            "id": "5746545",
            "latitude": 45.5234,
            "longitude": -122.6762,
            "name": "Portland",
            "region": "Oregon, Multnomah County, United States",
            "timezone": "America/Los_Angeles",
        }
    ]
    url, timeout = client.calls[0]
    assert urlparse(url).scheme == "https"
    assert urlparse(url).netloc == "geocoding-api.open-meteo.com"
    assert parse_qs(urlparse(url).query) == {
        "name": ["Portland, Maine"],
        "count": ["5"],
        "language": ["en"],
        "format": ["json"],
    }
    assert timeout == 5.0


@pytest.mark.asyncio
async def test_current_conditions_requests_only_required_metric_fields_and_normalizes_response() -> (
    None
):
    client = RecordingClient(FakeResponse(CURRENT_PAYLOAD))

    conditions = await OpenMeteoProvider(client).get_current_conditions(
        45.5234, -122.6762
    )

    assert conditions == {
        "apparentTemperatureC": 19.4,
        "condition": {"kind": "partly-cloudy", "label": "Partly cloudy"},
        "humidityPercent": 54,
        "isDay": True,
        "observedAt": "2026-08-14T10:42",
        "precipitationMm": 0.2,
        "temperatureC": 20.1,
        "timezone": "America/Los_Angeles",
        "weatherCode": 2,
        "windDirectionDegrees": 337.5,
        "windDirectionLabel": "N",
        "windSpeedKmh": 11.5,
    }
    url, timeout = client.calls[0]
    assert urlparse(url).netloc == "api.open-meteo.com"
    assert parse_qs(urlparse(url).query) == {
        "latitude": ["45.5234"],
        "longitude": ["-122.6762"],
        "timezone": ["auto"],
        "temperature_unit": ["celsius"],
        "wind_speed_unit": ["kmh"],
        "precipitation_unit": ["mm"],
        "current": [
            "temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,is_day"
        ],
    }
    assert timeout == 5.0


@pytest.mark.asyncio
async def test_non_success_response_raises_status_only_error() -> None:
    client = RecordingClient(FakeResponse({"secret": "do-not-expose"}, status_code=429))

    with pytest.raises(UpstreamHttpError) as error:
        await OpenMeteoProvider(client).search_locations("Portland")

    assert error.value.status_code == 429
    assert "do-not-expose" not in str(error.value)


@pytest.mark.asyncio
async def test_invalid_current_payload_raises_payload_error() -> None:
    client = RecordingClient(FakeResponse({"current": {}}))

    with pytest.raises(ProviderPayloadError):
        await OpenMeteoProvider(client).get_current_conditions(0, 0)
