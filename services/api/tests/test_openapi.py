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


def test_openapi_describes_opaque_factory_cookie_authentication_and_stable_errors() -> None:
    schema = create_app().openapi()

    locations = schema["paths"]["/app/weather/v1/locations"]["get"]
    assert "security" not in locations
    assert "HTTPBearer" not in schema.get("components", {}).get("securitySchemes", {})
    assert locations["responses"]["401"]["description"] == "A valid Factory session is required."
    assert locations["responses"]["401"]["content"]["application/json"]["example"]["error"]["code"] == "INVALID_SESSION"

    callback = schema["paths"]["/auth/callback"]["get"]
    assert callback["summary"] == "Complete Google sign-in"
    assert "200" not in callback["responses"]
    assert callback["responses"]["303"]["description"] == "OAuth code exchanged and Factory session cookie issued."
    assert callback["responses"]["400"]["content"]["application/json"]["example"]["error"]["code"] == "INVALID_OAUTH_STATE"
    callback_examples = callback["responses"]["400"]["content"]["application/json"]["examples"]
    assert callback_examples["oauthExchangeFailed"]["value"]["error"]["code"] == "OAUTH_EXCHANGE_FAILED"
    callback_parameters = {parameter["name"]: parameter for parameter in callback["parameters"]}
    assert callback_parameters["code"]["required"] is True
    assert callback_parameters["state"]["required"] is True

    login = schema["paths"]["/auth/login"]["get"]
    assert "200" not in login["responses"]
    assert "422" not in login["responses"]
    assert login["responses"]["307"]["description"] == "Browser redirect to Supabase Google OAuth."

    session = schema["paths"]["/auth/session"]["get"]
    assert session["responses"]["401"]["content"]["application/json"]["example"]["error"]["code"] == "INVALID_SESSION"
    assert session["responses"]["200"]["content"]["application/json"]["schema"]["$ref"] == "#/components/schemas/SessionResponse"

    for operation in (schema["paths"]["/auth/login"]["get"], callback, session, schema["paths"]["/auth/logout"]["post"]):
        assert operation["responses"]["503"]["content"]["application/json"]["example"]["error"]["code"] == "AUTH_NOT_CONFIGURED"
