from dataclasses import dataclass
from typing import Annotated, Any

import jwt
from fastapi import Request, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from factory_api.config import Settings
from factory_api.errors import ApiError


bearer_scheme = HTTPBearer(auto_error=False, bearerFormat="JWT", description="Supabase user access token.")
_ALLOWED_ALGORITHMS = ("ES256", "RS256")


@dataclass(frozen=True)
class AuthenticatedPrincipal:
    subject: str


class TokenVerificationError(Exception):
    pass


class TokenVerifier:
    def __init__(self, settings: Settings, jwks_client: Any | None = None) -> None:
        self._audience = settings.supabase_jwt_audience
        self._issuer = settings.supabase_jwt_issuer
        self._jwks_client = jwks_client or jwt.PyJWKClient(settings.supabase_jwks_url, cache_keys=True)

    def verify(self, token: str) -> AuthenticatedPrincipal:
        try:
            signing_key = self._jwks_client.get_signing_key_from_jwt(token)
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=_ALLOWED_ALGORITHMS,
                audience=self._audience,
                issuer=self._issuer,
                options={"require": ["aud", "exp", "iss", "sub"]},
                leeway=5,
            )
        except (jwt.PyJWTError, ValueError) as error:
            raise TokenVerificationError from error
        subject = claims.get("sub")
        if not isinstance(subject, str) or not subject.strip():
            raise TokenVerificationError
        return AuthenticatedPrincipal(subject=subject)


async def get_current_principal(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Security(bearer_scheme)],
) -> AuthenticatedPrincipal:
    settings = request.app.state.settings
    if settings.is_development:
        return AuthenticatedPrincipal(subject="development-bypass")

    values = request.headers.getlist("authorization")
    if not values:
        raise ApiError("MISSING_TOKEN", "Authentication credentials are required.", 401)
    if len(values) != 1 or credentials is None:
        raise ApiError("INVALID_TOKEN", "Authentication credentials are invalid.", 401)
    try:
        return request.app.state.token_verifier.verify(credentials.credentials)
    except TokenVerificationError as error:
        raise ApiError("INVALID_TOKEN", "Authentication credentials are invalid.", 401) from error
