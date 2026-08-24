import json
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from starlette.testclient import TestClient

from factory_api.auth import AuthenticatedPrincipal, TokenVerifier, TokenVerificationError
from factory_api.config import Settings
from factory_api.dependencies import get_weather_provider
from factory_api.main import create_app


ISSUER = "https://auth.example"
AUDIENCE = "authenticated"


def production_settings() -> Settings:
    return Settings(
        cors_allow_origins=("https://factory.example",),
        environment="production",
        supabase_jwks_url=f"{ISSUER}/.well-known/jwks.json",
        supabase_jwt_audience=AUDIENCE,
        supabase_jwt_issuer=ISSUER,
    )


class StaticJwksClient:
    def __init__(self, signing_key: jwt.PyJWK) -> None:
        self.signing_key = signing_key

    def get_signing_key_from_jwt(self, _: str) -> jwt.PyJWK:
        return self.signing_key


class MissingKeyJwksClient:
    def get_signing_key_from_jwt(self, _: str) -> jwt.PyJWK:
        raise jwt.PyJWKClientError("No matching key")


class FakeWeatherProvider:
    def __init__(self) -> None:
        self.queries: list[str] = []

    async def search_locations(self, query: str) -> list[dict]:
        self.queries.append(query)
        return []


def signed_token(private_key: object, **claims: object) -> str:
    return jwt.encode(
        {
            "aud": AUDIENCE,
            "exp": time.time() + 60,
            "iss": ISSUER,
            "sub": "user-123",
            **claims,
        },
        private_key,
        algorithm="RS256",
        headers={"kid": "test-key"},
    )


def test_protected_weather_rejects_missing_token_before_provider_call() -> None:
    app = create_app(settings=production_settings())
    provider = FakeWeatherProvider()
    app.dependency_overrides[get_weather_provider] = lambda: provider

    response = TestClient(app).get("/app/weather/v1/locations?q=Portland")

    assert response.status_code == 401
    assert response.headers["cache-control"] == "no-store"
    assert response.json() == {
        "error": {
            "code": "MISSING_TOKEN",
            "message": "Authentication credentials are required.",
        }
    }
    assert provider.queries == []


def test_token_verifier_accepts_only_a_valid_supabase_user_token() -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    signing_key = jwt.PyJWK.from_dict(
        json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key()))
    )

    principal = TokenVerifier(
        production_settings(), jwks_client=StaticJwksClient(signing_key)
    ).verify(signed_token(private_key))

    assert principal == AuthenticatedPrincipal(subject="user-123")


def test_protected_weather_uses_verified_token_and_rejects_invalid_token() -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    signing_key = jwt.PyJWK.from_dict(
        json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key()))
    )
    verifier = TokenVerifier(
        production_settings(), jwks_client=StaticJwksClient(signing_key)
    )
    provider = FakeWeatherProvider()
    app = create_app(settings=production_settings(), token_verifier=verifier)
    app.dependency_overrides[get_weather_provider] = lambda: provider
    client = TestClient(app)

    accepted = client.get(
        "/app/weather/v1/locations?q=Portland",
        headers={"Authorization": f"Bearer {signed_token(private_key)}"},
    )
    rejected = client.get(
        "/app/weather/v1/locations?q=Maine",
        headers={"Authorization": "Bearer malformed"},
    )

    assert accepted.status_code == 200
    assert accepted.headers["cache-control"] == "private, no-store"
    assert rejected.status_code == 401
    assert rejected.json()["error"]["code"] == "INVALID_TOKEN"
    assert provider.queries == ["Portland"]


def test_environment_defaults_to_production_and_requires_validation_settings(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.delenv("SUPABASE_JWKS_URL", raising=False)
    monkeypatch.delenv("SUPABASE_JWT_AUDIENCE", raising=False)
    monkeypatch.delenv("SUPABASE_JWT_ISSUER", raising=False)

    with pytest.raises(RuntimeError, match="SUPABASE_JWKS_URL"):
        Settings.from_environment()


def test_cors_preflight_allows_authorization_before_authentication() -> None:
    response = TestClient(create_app(settings=production_settings())).options(
        "/app/weather/v1/locations",
        headers={
            "Origin": "https://factory.example",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )

    assert response.status_code == 200
    assert "authorization" in response.headers["access-control-allow-headers"].lower()


@pytest.mark.parametrize(
    ("claims", "sign_with_expected_key"),
    [
        ({"aud": "wrong-audience"}, True),
        ({"exp": time.time() - 60}, True),
        ({"iss": "https://wrong.example"}, True),
        ({}, False),
    ],
)
def test_token_verifier_rejects_invalid_claims_and_signatures(
    claims: dict[str, object],
    sign_with_expected_key: bool,
) -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    signing_key = jwt.PyJWK.from_dict(
        json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key()))
    )
    token_key = (
        private_key
        if sign_with_expected_key
        else rsa.generate_private_key(public_exponent=65537, key_size=2048)
    )

    with pytest.raises(TokenVerificationError):
        TokenVerifier(
            production_settings(), jwks_client=StaticJwksClient(signing_key)
        ).verify(signed_token(token_key, **claims))


def test_token_verifier_rejects_an_unknown_signing_key() -> None:
    with pytest.raises(TokenVerificationError):
        TokenVerifier(
            production_settings(), jwks_client=MissingKeyJwksClient()
        ).verify("header.payload.signature")
