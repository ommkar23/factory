from collections.abc import AsyncIterator, Awaitable
from typing import Protocol

import httpx2

from factory_api.providers.open_meteo import OpenMeteoProvider


class WeatherProvider(Protocol):
    def search_locations(self, query: str) -> Awaitable[list[dict]]: ...

    def get_current_conditions(
        self, latitude: float, longitude: float
    ) -> Awaitable[dict]: ...


async def get_weather_provider() -> AsyncIterator[WeatherProvider]:
    async with httpx2.AsyncClient() as client:
        yield OpenMeteoProvider(client)
