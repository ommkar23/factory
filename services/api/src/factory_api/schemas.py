from pydantic import BaseModel, ConfigDict, Field


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ErrorDetail(ApiModel):
    code: str = Field(description="Stable machine-readable error code.")
    message: str = Field(description="Safe, user-displayable error message.")


class ErrorResponse(ApiModel):
    error: ErrorDetail = Field(description="Details of the failed request.")


class Condition(ApiModel):
    kind: str = Field(description="Stable normalized weather-condition kind.")
    label: str = Field(description="Human-readable weather-condition label.")


class Location(ApiModel):
    countryCode: str = Field(
        description="ISO 3166-1 alpha-2 country code.", examples=["US"]
    )
    id: str = Field(
        description="Stable provider location identifier.", examples=["5746545"]
    )
    latitude: float = Field(
        description="WGS84 latitude in decimal degrees.", examples=[45.5234]
    )
    longitude: float = Field(
        description="WGS84 longitude in decimal degrees.", examples=[-122.6762]
    )
    name: str = Field(description="Location display name.", examples=["Portland"])
    region: str = Field(description="Normalized administrative region and country.")
    timezone: str = Field(
        description="IANA time-zone identifier for the location.",
        examples=["America/Los_Angeles"],
    )


class CurrentConditions(ApiModel):
    apparentTemperatureC: float = Field(
        description="Apparent temperature in degrees Celsius."
    )
    condition: Condition = Field(description="Normalized weather condition.")
    humidityPercent: float = Field(description="Relative humidity as a percentage.")
    isDay: bool = Field(description="Whether the observation was during local daytime.")
    observedAt: str = Field(
        description="Provider-local ISO 8601 observation timestamp."
    )
    precipitationMm: float = Field(description="Precipitation in millimetres.")
    temperatureC: float = Field(description="Air temperature in degrees Celsius.")
    timezone: str = Field(description="IANA time zone of the observation.")
    weatherCode: int = Field(description="Open-Meteo WMO weather code.")
    windDirectionDegrees: float = Field(
        description="Wind direction in degrees clockwise from north."
    )
    windDirectionLabel: str = Field(description="Eight-point cardinal wind direction.")
    windSpeedKmh: float = Field(description="Wind speed in kilometres per hour.")


class LocationsResponse(ApiModel):
    locations: list[Location] = Field(
        description="At most five normalized location matches."
    )


class CurrentConditionsResponse(ApiModel):
    conditions: CurrentConditions = Field(
        description="Normalized metric current conditions."
    )


class SessionUser(ApiModel):
    id: str = Field(description="Stable Supabase user identifier.")
    email: str | None = Field(
        default=None, description="Verified user email when Supabase provides one."
    )


class SessionResponse(ApiModel):
    user: SessionUser = Field(
        description="Selected signed-in user fields. OAuth credentials are never returned."
    )
