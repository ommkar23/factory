from factory_api.main import create_app


def test_openapi_describes_factory_weather_contract_for_client_implementers() -> None:
    schema = create_app().openapi()

    assert schema["info"]["title"] == "Factory API"
    assert "Shared REST API" in schema["info"]["description"]

    health = schema["paths"]["/health"]["get"]
    assert health["summary"] == "Service health"
    assert "load balancers" in health["description"]

    locations = schema["paths"]["/app/weather/v1/locations"]["get"]
    assert locations["summary"] == "Search locations"
    assert "Open-Meteo" in locations["description"]
    assert locations["responses"]["400"]["description"] == "Invalid request parameters."
    query = next(parameter for parameter in locations["parameters"] if parameter["name"] == "q")
    assert "A 2–100 character city, region, or postal-code search query." in query["description"]
    assert query["schema"]["minLength"] == 2
    assert query["schema"]["maxLength"] == 100

    conditions = schema["paths"]["/app/weather/v1/current-conditions"]["get"]
    assert conditions["summary"] == "Get current conditions"
    assert conditions["responses"]["502"]["description"] == "Weather provider unavailable or returned invalid data."
    latitude = next(parameter for parameter in conditions["parameters"] if parameter["name"] == "latitude")
    assert "WGS84 latitude from -90 through 90." in latitude["description"]

    location = schema["components"]["schemas"]["Location"]
    assert location["properties"]["latitude"]["description"] == "WGS84 latitude in decimal degrees."
    assert location["properties"]["timezone"]["description"] == "IANA time-zone identifier for the location."


def test_openapi_matches_manual_weather_validation_contract() -> None:
    schema = create_app().openapi()

    for path, names in {
        "/app/weather/v1/locations": ("q",),
        "/app/weather/v1/current-conditions": ("latitude", "longitude"),
    }.items():
        operation = schema["paths"][path]["get"]
        assert "422" not in operation["responses"]
        parameters = {parameter["name"]: parameter for parameter in operation["parameters"]}
        for name in names:
            assert parameters[name]["required"] is True
            assert "exactly once" in parameters[name]["description"]

    locations = schema["paths"]["/app/weather/v1/locations"]["get"]
    assert locations["responses"]["400"]["content"]["application/json"]["example"]["error"]["code"] == "INVALID_REQUEST"
