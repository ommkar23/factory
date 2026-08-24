from dataclasses import dataclass, field

from starlette.testclient import TestClient

from factory_api.config import Settings
from factory_api.dependencies import get_weather_provider
from factory_api.main import create_app
from factory_api.providers.open_meteo import ProviderPayloadError, UpstreamHttpError

LOCATION = {
    "countryCode": "US",
    "id": "5746545",
    "latitude": 45.5234,
    "longitude": -122.6762,
    "name": "Portland",
    "region": "Oregon, Multnomah County, United States",
    "timezone": "America/Los_Angeles",
}
CONDITIONS = {
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


@dataclass
class FakeWeatherProvider:
    locations: list[dict] = field(default_factory=lambda: [LOCATION])
    conditions: dict = field(default_factory=lambda: CONDITIONS)
    error: Exception | None = None
    queries: list[str] = field(default_factory=list)
    coordinates: list[tuple[float, float]] = field(default_factory=list)

    async def search_locations(self, query: str) -> list[dict]:
        self.queries.append(query)
        if self.error:
            raise self.error
        return self.locations

    async def get_current_conditions(self, latitude: float, longitude: float) -> dict:
        self.coordinates.append((latitude, longitude))
        if self.error:
            raise self.error
        return self.conditions


class FakeSupabaseAuthProvider:
    async def verify_access_token(self, token: str) -> dict:
        assert token == "weather-test-token"
        return {"sub": "5d594e47-d4d1-4bbd-a461-f4794fc491a6"}


def client_for(provider: FakeWeatherProvider) -> TestClient:
    app = create_app(
        settings=Settings(
            cors_allow_origins=(),
            environment="development",
            supabase_url="http://supabase.example",
            supabase_publishable_key="publishable-key",
            auth_public_url="http://localhost:3004",
            auth_allowed_return_paths=("/",),
            auth_session_encryption_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
            auth_session_database_url="sqlite:////tmp/factory-weather-test-states.db",
        ),
        supabase_auth_client=FakeSupabaseAuthProvider(),
    )
    app.dependency_overrides[get_weather_provider] = lambda: provider
    return TestClient(app, headers={"Authorization": "Bearer weather-test-token"})


def test_locations_returns_normalized_response_and_cache_policy() -> None:
    provider = FakeWeatherProvider()

    response = client_for(provider).get("/app/weather/v1/locations?q=%20Portland%20")

    assert response.status_code == 200
    assert response.headers["cache-control"] == (
        "private, no-store"
    )
    assert response.json() == {"locations": [LOCATION]}
    assert provider.queries == ["Portland"]


def test_locations_rejects_invalid_or_repeated_queries_without_calling_provider() -> None:
    provider = FakeWeatherProvider()

    for path in (
        "/app/weather/v1/locations",
        "/app/weather/v1/locations?q=a",
        "/app/weather/v1/locations?q=Portland&q=Maine",
    ):
        response = client_for(provider).get(path)
        assert response.status_code == 400
        assert response.headers["cache-control"] == "no-store"
        assert response.json() == {
            "error": {
                "code": "INVALID_REQUEST",
                "message": "Request parameters are invalid.",
            }
        }
    assert provider.queries == []


def test_current_conditions_returns_response_and_cache_policy() -> None:
    provider = FakeWeatherProvider()

    response = client_for(provider).get(
        "/app/weather/v1/current-conditions?latitude=45.5234&longitude=-122.6762"
    )

    assert response.status_code == 200
    assert response.headers["cache-control"] == (
        "private, no-store"
    )
    assert response.json() == {"conditions": CONDITIONS}
    assert provider.coordinates == [(45.5234, -122.6762)]


def test_current_conditions_rejects_malformed_coordinates_without_calling_provider() -> None:
    provider = FakeWeatherProvider()

    response = client_for(provider).get(
        "/app/weather/v1/current-conditions?latitude=1e2&longitude=0"
    )

    assert response.status_code == 400
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["error"]["code"] == "INVALID_REQUEST"
    assert provider.coordinates == []


def test_upstream_errors_are_stable_and_do_not_leak_details() -> None:
    provider = FakeWeatherProvider(
        error=UpstreamHttpError(429, "upstream secret https://provider.example")
    )

    response = client_for(provider).get("/app/weather/v1/locations?q=Portland")

    assert response.status_code == 429
    assert response.headers["cache-control"] == "no-store"
    assert response.json() == {
        "error": {
            "code": "UPSTREAM_RATE_LIMITED",
            "message": "The upstream service is rate limited.",
        }
    }
    assert "secret" not in response.text


def test_invalid_provider_payload_maps_to_stable_error() -> None:
    provider = FakeWeatherProvider(error=ProviderPayloadError("secret payload"))

    response = client_for(provider).get("/app/weather/v1/locations?q=Portland")

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "UPSTREAM_INVALID_RESPONSE"
