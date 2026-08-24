import hashlib
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from starlette.testclient import TestClient

from factory_api.config import Settings
from factory_api.main import create_app


class FakeSupabaseAuthProvider:
    def __init__(self) -> None:
        self.exchanges: list[tuple[str, str]] = []
        self.verified: list[str] = []
        self.refreshes: list[str] = []
        self.challenges: list[str] = []
        self.logged_out: list[str] = []

    def authorization_url(self, *, callback_url: str, code_challenge: str, state: str) -> str:
        assert callback_url == "https://api.factory.example/auth/callback"
        assert code_challenge
        return f"https://supabase.example/auth/v1/authorize?code_challenge={code_challenge}&state={state}"

    async def exchange_code(self, *, code: str, code_verifier: str) -> dict:
        self.exchanges.append((code, code_verifier))
        return {
            "access_token": "supabase-access-token",
            "refresh_token": "supabase-refresh-token",
            "expires_in": 3600,
            "token_type": "bearer",
            "user": {"id": "5d594e47-d4d1-4bbd-a461-f4794fc491a6", "email": "person@example.com"},
        }

    async def verify_access_token(self, token: str) -> dict:
        self.verified.append(token)
        if token == "expired-jwt":
            from factory_api.routers.auth import SupabaseAccessTokenExpired

            raise SupabaseAccessTokenExpired
        if token == "invalid":
            raise Exception("invalid token")
        return {"sub": "5d594e47-d4d1-4bbd-a461-f4794fc491a6", "email": "person@example.com"}

    async def refresh_session(self, *, refresh_token: str) -> dict:
        self.refreshes.append(refresh_token)
        if refresh_token == "bad-refresh":
            raise Exception("bad refresh")
        return {"access_token": "rotated-access-token", "refresh_token": "rotated-refresh-token", "expires_in": 3600, "token_type": "bearer", "user": {"id": "5d594e47-d4d1-4bbd-a461-f4794fc491a6"}}

    async def exchange_google_id_token(self, *, id_token: str, nonce: str) -> dict:
        self.challenges.append(nonce)
        if id_token != "google-id-token":
            raise Exception("invalid google token")
        return {"access_token": "native-access-token", "refresh_token": "native-refresh-token", "expires_in": 3600, "token_type": "bearer"}

    async def logout(self, *, access_token: str) -> None:
        self.logged_out.append(access_token)


def production_settings(tmp_path: Path) -> Settings:
    return Settings(
        cors_allow_origins=("https://factory.example",),
        environment="production",
        supabase_url="https://supabase.example",
        supabase_publishable_key="publishable-key",
        auth_public_url="https://api.factory.example",
        auth_allowed_return_paths=("/", "/weather", "/live-splash"),
        auth_session_encryption_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        auth_session_database_url=f"sqlite:///{tmp_path / 'states.db'}",
    )


def _cookie(response, name: str) -> str:
    return next(header for header in response.headers.get_list("set-cookie") if header.startswith(f"{name}="))


def test_callback_exchanges_code_server_side_and_sets_transient_supabase_token_cookies(tmp_path: Path) -> None:
    provider = FakeSupabaseAuthProvider()
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=provider)
    client = TestClient(app, base_url="https://api.factory.example")
    login_response = client.get("/auth/login?next=/weather", follow_redirects=False)
    state = parse_qs(urlparse(login_response.headers["location"]).query)["state"][0]

    response = client.get(f"/auth/callback?code=one-time-code&state={state}", follow_redirects=False)

    assert response.status_code == 303
    assert response.headers["location"] == "/weather"
    assert provider.exchanges and provider.exchanges[0][0] == "one-time-code"
    access_cookie = _cookie(response, "Factory-Access-Token")
    refresh_cookie = _cookie(response, "Factory-Refresh-Token")
    assert "supabase-access-token" in access_cookie
    assert "supabase-refresh-token" in refresh_cookie
    assert "HttpOnly" in access_cookie and "Secure" in access_cookie and "SameSite=lax" in access_cookie
    assert "HttpOnly" in refresh_cookie and "Secure" in refresh_cookie and "SameSite=lax" in refresh_cookie
    assert not any(header.startswith("Factory-Session=") for header in response.headers.get_list("set-cookie"))
    assert "Max-Age=0" in _cookie(response, "Factory-OAuth-Transaction")
    assert not hasattr(app.state.session_store, "get_session")
    assert app.state.session_store.consume_oauth_state(state, hashlib.sha256("irrelevant".encode()).hexdigest()) is None


class FakeWeatherProvider:
    async def search_locations(self, query: str) -> list[dict]:
        return []

    async def get_current_conditions(self, latitude: float, longitude: float) -> dict:
        return {}


def test_protected_routes_accept_exactly_one_verified_bearer_or_cookie_and_reject_ambiguous_credentials(tmp_path: Path) -> None:
    from factory_api.dependencies import get_weather_provider

    provider = FakeSupabaseAuthProvider()
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=provider)
    app.dependency_overrides[get_weather_provider] = lambda: FakeWeatherProvider()
    client = TestClient(app, base_url="https://api.factory.example")

    bearer = client.get("/app/weather/v1/locations?q=Portland", headers={"Authorization": "Bearer native-jwt"})
    cookie = client.get("/app/weather/v1/locations?q=Portland", headers={"Cookie": "Factory-Access-Token=browser-jwt"})
    ambiguous = client.get("/app/weather/v1/locations?q=Portland", headers={"Authorization": "Bearer native-jwt", "Cookie": "Factory-Access-Token=browser-jwt"})
    malformed = client.get("/app/weather/v1/locations?q=Portland", headers={"Authorization": "Basic nope"})

    assert bearer.status_code == 200 and cookie.status_code == 200
    assert provider.verified == ["native-jwt", "browser-jwt"]
    assert ambiguous.status_code == malformed.status_code == 401
    assert ambiguous.json()["error"]["code"] == malformed.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_protected_route_refreshes_expired_browser_access_cookie(tmp_path: Path) -> None:
    from factory_api.dependencies import get_weather_provider

    provider = FakeSupabaseAuthProvider()
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=provider)
    app.dependency_overrides[get_weather_provider] = lambda: FakeWeatherProvider()
    client = TestClient(app, base_url="https://api.factory.example")

    response = client.get(
        "/app/weather/v1/locations?q=Portland",
        headers={"Cookie": "Factory-Access-Token=expired-jwt; Factory-Refresh-Token=browser-refresh"},
    )

    assert response.status_code == 200
    assert provider.refreshes == ["browser-refresh"]
    assert "rotated-access-token" in _cookie(response, "Factory-Access-Token")


def test_native_challenge_exchange_and_refresh_return_only_supabase_tokens(tmp_path: Path) -> None:
    provider = FakeSupabaseAuthProvider()
    client = TestClient(create_app(settings=production_settings(tmp_path), supabase_auth_client=provider))

    challenge = client.post("/auth/native/challenge")
    nonce = challenge.json()["nonce"]
    exchange = client.post("/auth/native/exchange", json={"id_token": "google-id-token", "nonce": nonce})
    refresh = client.post("/auth/token/refresh", json={"refresh_token": "native-refresh-token"})

    assert challenge.status_code == exchange.status_code == refresh.status_code == 200
    assert provider.challenges == [nonce] and provider.refreshes == ["native-refresh-token"]
    assert exchange.json() == {"access_token": "native-access-token", "refresh_token": "native-refresh-token", "expires_in": 3600, "token_type": "bearer"}
    assert refresh.json()["access_token"] == "rotated-access-token"


def test_session_refresh_and_logout_rotate_or_clear_browser_supabase_cookies(tmp_path: Path) -> None:
    provider = FakeSupabaseAuthProvider()
    client = TestClient(create_app(settings=production_settings(tmp_path), supabase_auth_client=provider), base_url="https://api.factory.example")

    refreshed = client.get("/auth/session", headers={"Cookie": "Factory-Access-Token=expired-jwt; Factory-Refresh-Token=browser-refresh"})
    logout = client.post("/auth/logout", headers={"Cookie": "Factory-Access-Token=browser-jwt; Factory-Refresh-Token=browser-refresh"})

    assert refreshed.status_code == 200
    assert provider.refreshes == ["browser-refresh"]
    assert "rotated-access-token" in _cookie(refreshed, "Factory-Access-Token")
    assert logout.status_code == 204 and provider.logged_out == ["browser-jwt"]
    assert "Max-Age=0" in _cookie(logout, "Factory-Access-Token")
    assert "Max-Age=0" in _cookie(logout, "Factory-Refresh-Token")


def test_session_rejects_malformed_or_duplicate_credentials(tmp_path: Path) -> None:
    provider = FakeSupabaseAuthProvider()
    client = TestClient(create_app(settings=production_settings(tmp_path), supabase_auth_client=provider))

    blank_header = client.get("/auth/session", headers={"Authorization": "", "Cookie": "Factory-Access-Token=browser-jwt"})
    duplicate_cookie = client.get("/auth/session", headers={"Cookie": "Factory-Access-Token=bad; Factory-Access-Token=browser-jwt"})

    assert blank_header.status_code == duplicate_cookie.status_code == 401
    assert blank_header.json()["error"]["code"] == duplicate_cookie.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_failed_protected_cookie_refresh_clears_both_browser_cookies(tmp_path: Path) -> None:
    from factory_api.dependencies import get_weather_provider

    provider = FakeSupabaseAuthProvider()
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=provider)
    app.dependency_overrides[get_weather_provider] = lambda: FakeWeatherProvider()
    client = TestClient(app, base_url="https://api.factory.example")

    response = client.get(
        "/app/weather/v1/locations?q=Portland",
        headers={"Cookie": "Factory-Access-Token=expired-jwt; Factory-Refresh-Token=bad-refresh"},
    )

    assert response.status_code == 401
    assert "Max-Age=0" in _cookie(response, "Factory-Access-Token")
    assert "Max-Age=0" in _cookie(response, "Factory-Refresh-Token")


def test_invalid_browser_access_cookie_never_uses_its_refresh_cookie(tmp_path: Path) -> None:
    from factory_api.dependencies import get_weather_provider

    provider = FakeSupabaseAuthProvider()
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=provider)
    app.dependency_overrides[get_weather_provider] = lambda: FakeWeatherProvider()
    client = TestClient(app, base_url="https://api.factory.example")

    response = client.get(
        "/app/weather/v1/locations?q=Portland",
        headers={"Cookie": "Factory-Access-Token=invalid; Factory-Refresh-Token=browser-refresh"},
    )

    assert response.status_code == 401
    assert provider.refreshes == []
    assert "Max-Age=0" in _cookie(response, "Factory-Access-Token")


def test_malformed_browser_access_cookie_clears_both_browser_cookies(tmp_path: Path) -> None:
    from factory_api.dependencies import get_weather_provider

    provider = FakeSupabaseAuthProvider()
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=provider)
    app.dependency_overrides[get_weather_provider] = lambda: FakeWeatherProvider()
    client = TestClient(app, base_url="https://api.factory.example")

    response = client.get(
        "/app/weather/v1/locations?q=Portland",
        headers={"Cookie": "Factory-Access-Token=; Factory-Refresh-Token=browser-refresh"},
    )
    duplicate = client.get(
        "/app/weather/v1/locations?q=Portland",
        headers={"Cookie": "Factory-Access-Token=bad; Factory-Access-Token=also-bad; Factory-Refresh-Token=browser-refresh"},
    )
    whitespace_name = client.get(
        "/app/weather/v1/locations?q=Portland",
        headers={"Cookie": "Factory-Access-Token = browser-jwt; Factory-Refresh-Token=browser-refresh"},
    )

    assert response.status_code == duplicate.status_code == whitespace_name.status_code == 401
    assert "Max-Age=0" in _cookie(response, "Factory-Access-Token")
    assert "Max-Age=0" in _cookie(response, "Factory-Refresh-Token")
    assert "Max-Age=0" in _cookie(duplicate, "Factory-Access-Token")
    assert "Max-Age=0" in _cookie(whitespace_name, "Factory-Access-Token")


def test_duplicate_refresh_cookie_never_refreshes_an_expired_access_cookie(tmp_path: Path) -> None:
    from factory_api.dependencies import get_weather_provider

    provider = FakeSupabaseAuthProvider()
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=provider)
    app.dependency_overrides[get_weather_provider] = lambda: FakeWeatherProvider()
    client = TestClient(app, base_url="https://api.factory.example")

    response = client.get(
        "/app/weather/v1/locations?q=Portland",
        headers={"Cookie": "Factory-Access-Token=expired-jwt; Factory-Refresh-Token=first; Factory-Refresh-Token=second"},
    )

    assert response.status_code == 401
    assert provider.refreshes == []
    assert "Max-Age=0" in _cookie(response, "Factory-Access-Token")
    assert "Max-Age=0" in _cookie(response, "Factory-Refresh-Token")


def test_logout_revokes_a_valid_native_bearer_token(tmp_path: Path) -> None:
    provider = FakeSupabaseAuthProvider()
    client = TestClient(create_app(settings=production_settings(tmp_path), supabase_auth_client=provider))

    response = client.post("/auth/logout", headers={"Authorization": "Bearer native-jwt"})

    assert response.status_code == 204
    assert provider.logged_out == ["native-jwt"]


def test_native_token_endpoints_reject_malformed_json(tmp_path: Path) -> None:
    client = TestClient(create_app(settings=production_settings(tmp_path), supabase_auth_client=FakeSupabaseAuthProvider()))

    exchange = client.post("/auth/native/exchange", content=b"{")
    refresh = client.post("/auth/token/refresh", content=b"{")

    assert exchange.status_code == refresh.status_code == 401


def test_explicit_browser_origin_may_send_authorization_header(tmp_path: Path) -> None:
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=FakeSupabaseAuthProvider())
    client = TestClient(app)

    response = client.options(
        "/app/weather/v1/locations?q=Portland",
        headers={
            "Origin": "https://factory.example",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )

    assert response.status_code == 200
    assert "authorization" in response.headers["access-control-allow-headers"].lower()
