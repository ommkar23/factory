import hashlib
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse

import pytest
from starlette.testclient import TestClient

from factory_api.auth import refresh_session
from factory_api.config import Settings
from factory_api.dependencies import get_weather_provider
from factory_api.errors import ApiError
from factory_api.main import create_app
from factory_api.routers.auth import SupabaseAuthError
from factory_api.session_store import ServerSession


class FakeSupabaseAuthClient:
    def __init__(self) -> None:
        self.exchanges: list[tuple[str, str]] = []
        self.refreshes: list[str] = []
        self.refresh_fails = False

    def authorization_url(self, *, callback_url: str, code_challenge: str, state: str) -> str:
        assert callback_url == "https://api.factory.example/auth/callback"
        assert code_challenge
        return f"https://supabase.example/auth/v1/authorize?code_challenge={code_challenge}&state={state}"

    async def exchange_code(self, *, code: str, code_verifier: str) -> dict:
        self.exchanges.append((code, code_verifier))
        return {
            "access_token": "server-access-token",
            "refresh_token": "server-refresh-token",
            "expires_in": 3600,
            "user": {"id": "user-123", "email": "person@example.com", "user_metadata": {"internal": "do-not-return"}},
        }

    async def refresh_session(self, *, refresh_token: str) -> dict:
        self.refreshes.append(refresh_token)
        if self.refresh_fails:
            raise SupabaseAuthError
        return {
            "access_token": "rotated-access-token",
            "refresh_token": "rotated-refresh-token",
            "expires_in": 3600,
            "user": {"id": "user-123", "email": "person@example.com"},
        }


class FailedRefreshStore:
    def __init__(self) -> None:
        self.delete_attempts: list[tuple[str, int]] = []

    def delete_session_if_version(self, session_id: str, expected_version: int) -> bool:
        self.delete_attempts.append((session_id, expected_version))
        return False


def production_settings(tmp_path: Path) -> Settings:
    return Settings(
        cors_allow_origins=("https://factory.example",),
        environment="production",
        supabase_url="https://supabase.example",
        supabase_publishable_key="publishable-key",
        auth_public_url="https://api.factory.example",
        auth_allowed_return_paths=("/", "/weather", "/live-splash"),
        auth_session_encryption_key="AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        auth_session_database_url=f"sqlite:///{tmp_path / 'sessions.db'}",
    )


def _cookie(response, name: str) -> str:
    return next(header for header in response.headers.get_list("set-cookie") if header.startswith(f"{name}="))


def test_login_issues_a_short_lived_secure_browser_transaction_cookie_and_binds_its_hash_to_state(tmp_path: Path) -> None:
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=FakeSupabaseAuthClient())

    response = TestClient(app, base_url="https://api.factory.example").get("/auth/login?next=/weather", follow_redirects=False)

    transaction_cookie = _cookie(response, "Factory-OAuth-Transaction")
    transaction = transaction_cookie.split(";", 1)[0].split("=", 1)[1]
    state = parse_qs(urlparse(response.headers["location"]).query)["state"][0]
    oauth_state = app.state.session_store.consume_oauth_state(state, hashlib.sha256(transaction.encode()).hexdigest())

    assert oauth_state is not None
    assert oauth_state.next_path == "/weather"
    assert "HttpOnly" in transaction_cookie
    assert "Secure" in transaction_cookie
    assert "SameSite=lax" in transaction_cookie
    assert "Path=/" in transaction_cookie
    assert "Max-Age=300" in transaction_cookie


def test_login_validates_return_path_stores_pkce_state_and_redirects_to_google(tmp_path: Path) -> None:
    app = create_app(
        settings=production_settings(tmp_path),
        supabase_auth_client=FakeSupabaseAuthClient(),
    )

    response = TestClient(app, base_url="https://api.factory.example").get("/auth/login?next=/weather/forecast", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"].startswith("https://supabase.example/auth/v1/authorize?")
    assert "code_challenge=" in response.headers["location"]
    assert "state=" in response.headers["location"]
    assert response.headers["cache-control"] == "no-store"
    state = parse_qs(urlparse(response.headers["location"]).query)["state"][0]
    transaction = _cookie(response, "Factory-OAuth-Transaction").split(";", 1)[0].split("=", 1)[1]
    assert app.state.session_store.consume_oauth_state(state, hashlib.sha256(transaction.encode()).hexdigest()).next_path == "/weather/forecast"


def test_local_auth_configuration_uses_a_browser_reachable_authorization_origin(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("ENVIRONMENT", "development")
    monkeypatch.setenv("SUPABASE_URL", "http://api-gw:8000")
    monkeypatch.setenv("SUPABASE_AUTHORIZATION_URL", "http://localhost:8000")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    monkeypatch.setenv("AUTH_PUBLIC_URL", "http://localhost:3004")
    monkeypatch.setenv("AUTH_SESSION_ENCRYPTION_KEY", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
    monkeypatch.setenv("AUTH_SESSION_DATABASE_URL", f"sqlite:///{tmp_path / 'sessions.db'}")

    settings = Settings.from_environment()
    app = create_app(settings=settings)
    response = TestClient(app, base_url="http://localhost:3004").get("/auth/login", follow_redirects=False)

    assert settings.supabase_authorization_url == "http://localhost:8000"
    assert response.status_code == 307
    assert response.headers["location"].startswith("http://localhost:8000/auth/v1/authorize?")


def test_login_rejects_return_paths_outside_the_allow_list(tmp_path: Path) -> None:
    app = create_app(
        settings=production_settings(tmp_path),
        supabase_auth_client=FakeSupabaseAuthClient(),
    )

    response = TestClient(app).get("/auth/login?next=https://attacker.example")

    assert response.status_code == 400
    assert response.json() == {
        "error": {
            "code": "INVALID_RETURN_PATH",
            "message": "The requested return path is not allowed.",
        }
    }


@pytest.mark.parametrize("transaction_cookie", [None, "mismatched-transaction"])
def test_callback_rejects_missing_or_mismatched_browser_transaction_without_exchanging_code(
    tmp_path: Path, transaction_cookie: str | None
) -> None:
    auth_client = FakeSupabaseAuthClient()
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=auth_client)
    login_client = TestClient(app, base_url="https://api.factory.example")
    login_response = login_client.get("/auth/login", follow_redirects=False)
    state = parse_qs(urlparse(login_response.headers["location"]).query)["state"][0]
    headers = {} if transaction_cookie is None else {"Cookie": f"Factory-OAuth-Transaction={transaction_cookie}"}

    response = TestClient(app, base_url="https://api.factory.example").get(
        f"/auth/callback?code=one-time-code&state={state}", headers=headers, follow_redirects=False
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_OAUTH_STATE"
    assert auth_client.exchanges == []
    assert not any(header.startswith("Factory-Session=") for header in response.headers.get_list("set-cookie"))
    assert "Max-Age=0" in _cookie(response, "Factory-OAuth-Transaction")


def test_callback_exchanges_code_server_side_and_sets_only_an_opaque_secure_cookie(tmp_path: Path) -> None:
    auth_client = FakeSupabaseAuthClient()
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=auth_client)
    client = TestClient(app, base_url="https://api.factory.example")
    login_response = client.get("/auth/login?next=/weather", follow_redirects=False)
    state = parse_qs(urlparse(login_response.headers["location"]).query)["state"][0]

    response = client.get(f"/auth/callback?code=one-time-code&state={state}", follow_redirects=False)

    assert response.status_code == 303
    assert response.headers["location"] == "/weather"
    assert len(auth_client.exchanges) == 1
    assert auth_client.exchanges[0][0] == "one-time-code"
    assert "Factory-Session=" in response.headers["set-cookie"]
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "Secure" in response.headers["set-cookie"]
    assert "SameSite=lax" in response.headers["set-cookie"]
    assert "Max-Age=0" in _cookie(response, "Factory-OAuth-Transaction")
    assert "server-access-token" not in response.text
    assert "server-refresh-token" not in response.text



def test_session_returns_only_server_selected_user_data_for_the_opaque_cookie(tmp_path: Path) -> None:
    auth_client = FakeSupabaseAuthClient()
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=auth_client)
    client = TestClient(app, base_url="https://api.factory.example")
    login_response = client.get("/auth/login", follow_redirects=False)
    state = parse_qs(urlparse(login_response.headers["location"]).query)["state"][0]
    callback_response = client.get(f"/auth/callback?code=one-time-code&state={state}", follow_redirects=False)
    session_id = callback_response.headers["set-cookie"].split(";", 1)[0].split("=", 1)[1]

    response = client.get("/auth/session", headers={"Cookie": f"Factory-Session={session_id}"})

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json() == {"user": {"id": "user-123", "email": "person@example.com"}}
    assert "access_token" not in response.text
    assert "refresh_token" not in response.text



class FakeWeatherProvider:
    async def search_locations(self, query: str) -> list[dict]:
        return []

    async def get_current_conditions(self, latitude: float, longitude: float) -> dict:
        return {}


def test_unconfigured_development_auth_endpoints_return_a_stable_error_while_protected_routes_stay_bypassed() -> None:
    settings = Settings(
        cors_allow_origins=(),
        environment="development",
        supabase_url=None,
        supabase_publishable_key=None,
        auth_public_url=None,
        auth_allowed_return_paths=("/",),
        auth_session_encryption_key=None,
        auth_session_database_url=None,
    )
    app = create_app(settings=settings)
    app.dependency_overrides[get_weather_provider] = lambda: FakeWeatherProvider()
    client = TestClient(app)

    for method, path in (("get", "/auth/login"), ("get", "/auth/callback?code=code&state=state"), ("get", "/auth/session"), ("post", "/auth/logout")):
        response = getattr(client, method)(path)
        assert response.status_code == 503
        assert response.headers["cache-control"] == "no-store"
        assert response.json() == {
            "error": {
                "code": "AUTH_NOT_CONFIGURED",
                "message": "Authentication is not configured for this environment.",
            }
        }

    assert client.get("/app/weather/v1/locations?q=Portland").status_code == 200



def test_protected_routes_accept_a_valid_factory_cookie_not_a_bearer_token(tmp_path: Path) -> None:
    auth_client = FakeSupabaseAuthClient()
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=auth_client)
    app.dependency_overrides[get_weather_provider] = lambda: FakeWeatherProvider()
    client = TestClient(app, base_url="https://api.factory.example")
    login_response = client.get("/auth/login", follow_redirects=False)
    state = parse_qs(urlparse(login_response.headers["location"]).query)["state"][0]
    callback_response = client.get(f"/auth/callback?code=one-time-code&state={state}", follow_redirects=False)
    session_id = callback_response.headers["set-cookie"].split(";", 1)[0].split("=", 1)[1]

    response = client.get(
        "/app/weather/v1/locations?q=Portland",
        headers={"Cookie": f"Factory-Session={session_id}", "Authorization": "Bearer ignored-token"},
    )

    assert response.status_code == 200
    assert response.headers["cache-control"] == "private, no-store"



def test_protected_routes_refresh_expiring_credentials_only_on_the_server(tmp_path: Path) -> None:
    auth_client = FakeSupabaseAuthClient()
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=auth_client)
    app.dependency_overrides[get_weather_provider] = lambda: FakeWeatherProvider()
    client = TestClient(app, base_url="https://api.factory.example")
    login_response = client.get("/auth/login", follow_redirects=False)
    state = parse_qs(urlparse(login_response.headers["location"]).query)["state"][0]
    callback_response = client.get(f"/auth/callback?code=one-time-code&state={state}", follow_redirects=False)
    session_id = callback_response.headers["set-cookie"].split(";", 1)[0].split("=", 1)[1]
    existing_session = app.state.session_store.get_session(session_id)
    assert existing_session is not None
    app.state.session_store.replace_session(
        session_id,
        existing_session.version,
        {
            "access_token": "expiring-access-token",
            "refresh_token": "refresh-before-expiry",
            "expires_in": 1,
            "user": {"id": "user-123"},
        },
    )

    response = client.get("/app/weather/v1/locations?q=Portland", headers={"Cookie": f"Factory-Session={session_id}"})

    assert response.status_code == 200
    assert auth_client.refreshes == ["refresh-before-expiry"]
    refreshed = app.state.session_store.get_session(session_id)
    assert refreshed.refresh_token == "rotated-refresh-token"



def test_logout_deletes_the_server_session_and_expires_the_factory_cookie(tmp_path: Path) -> None:
    auth_client = FakeSupabaseAuthClient()
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=auth_client)
    client = TestClient(app, base_url="https://api.factory.example")
    login_response = client.get("/auth/login", follow_redirects=False)
    state = parse_qs(urlparse(login_response.headers["location"]).query)["state"][0]
    callback_response = client.get(f"/auth/callback?code=one-time-code&state={state}", follow_redirects=False)
    session_id = callback_response.headers["set-cookie"].split(";", 1)[0].split("=", 1)[1]

    response = client.post("/auth/logout", headers={"Cookie": f"Factory-Session={session_id}"})

    assert response.status_code == 204
    assert response.headers["cache-control"] == "no-store"
    assert "Factory-Session=""" in response.headers["set-cookie"]
    assert "Max-Age=0" in response.headers["set-cookie"]
    assert app.state.session_store.get_session(session_id) is None



def test_callback_rejects_a_reused_pkce_state_without_reexchanging_the_code(tmp_path: Path) -> None:
    auth_client = FakeSupabaseAuthClient()
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=auth_client)
    client = TestClient(app, base_url="https://api.factory.example")
    login_response = client.get("/auth/login", follow_redirects=False)
    state = parse_qs(urlparse(login_response.headers["location"]).query)["state"][0]

    first = client.get(f"/auth/callback?code=one-time-code&state={state}", follow_redirects=False)
    reused = client.get(f"/auth/callback?code=another-code&state={state}", follow_redirects=False)

    assert first.status_code == 303
    assert reused.status_code == 400
    assert reused.json()["error"]["code"] == "INVALID_OAUTH_STATE"
    assert auth_client.exchanges == [("one-time-code", auth_client.exchanges[0][1])]


def test_callback_missing_code_returns_the_documented_stable_error_envelope(tmp_path: Path) -> None:
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=FakeSupabaseAuthClient())

    response = TestClient(app).get("/auth/callback?state=unused")

    assert response.status_code == 400
    assert response.json() == {
        "error": {
            "code": "INVALID_OAUTH_STATE",
            "message": "The sign-in state is invalid or expired.",
        }
    }


@pytest.mark.asyncio
async def test_stale_refresh_failure_only_attempts_to_delete_the_matching_session_version() -> None:
    auth_client = FakeSupabaseAuthClient()
    auth_client.refresh_fails = True
    store = FailedRefreshStore()
    request = SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(supabase_auth_client=auth_client, session_store=store)))
    stale_session = ServerSession(
        access_token="before-access",
        refresh_token="before-refresh",
        expires_at=1,
        user={"id": "user-123"},
        version=4,
    )

    with pytest.raises(ApiError) as error:
        await refresh_session(request, "session-123", stale_session)

    assert error.value.status_code == 401
    assert store.delete_attempts == [("session-123", 4)]



def test_refresh_failure_deletes_the_session_and_returns_a_stable_401(tmp_path: Path) -> None:
    auth_client = FakeSupabaseAuthClient()
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=auth_client)
    app.dependency_overrides[get_weather_provider] = lambda: FakeWeatherProvider()
    client = TestClient(app, base_url="https://api.factory.example")
    login_response = client.get("/auth/login", follow_redirects=False)
    state = parse_qs(urlparse(login_response.headers["location"]).query)["state"][0]
    callback_response = client.get(f"/auth/callback?code=one-time-code&state={state}", follow_redirects=False)
    session_id = callback_response.headers["set-cookie"].split(";", 1)[0].split("=", 1)[1]
    existing_session = app.state.session_store.get_session(session_id)
    assert existing_session is not None
    app.state.session_store.replace_session(
        session_id,
        existing_session.version,
        {
            "access_token": "expiring-access-token",
            "refresh_token": "failed-refresh-token",
            "expires_in": 1,
            "user": {"id": "user-123"},
        },
    )
    auth_client.refresh_fails = True

    response = client.get("/app/weather/v1/locations?q=Portland", headers={"Cookie": f"Factory-Session={session_id}"})

    assert response.status_code == 401
    assert response.json() == {"error": {"code": "INVALID_SESSION", "message": "A valid Factory session is required."}}
    assert app.state.session_store.get_session(session_id) is None



def test_cookie_cors_preflight_allows_credentials_without_authorization_headers(tmp_path: Path) -> None:
    app = create_app(settings=production_settings(tmp_path), supabase_auth_client=FakeSupabaseAuthClient())

    response = TestClient(app).options(
        "/auth/session",
        headers={
            "Origin": "https://factory.example",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-credentials"] == "true"
    assert "POST" in response.headers["access-control-allow-methods"]
    assert "authorization" not in response.headers["access-control-allow-headers"].lower()


def test_production_settings_require_server_owned_oauth_and_session_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in (
        "ENVIRONMENT",
        "SUPABASE_URL",
        "SUPABASE_PUBLISHABLE_KEY",
        "AUTH_PUBLIC_URL",
        "AUTH_SESSION_ENCRYPTION_KEY",
        "AUTH_SESSION_DATABASE_URL",
    ):
        monkeypatch.delenv(name, raising=False)

    with pytest.raises(RuntimeError, match="SUPABASE_URL"):
        Settings.from_environment()
