import base64
import hashlib
import hmac
import json
import secrets
from typing import Any, Protocol
from urllib.parse import urlencode

import httpx
import jwt
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse, Response

from factory_api.errors import ApiError
from factory_api.schemas import ErrorResponse, SessionResponse

ACCESS_TOKEN_COOKIE_NAME = "Factory-Access-Token"
REFRESH_TOKEN_COOKIE_NAME = "Factory-Refresh-Token"
COOKIE_NAME = ACCESS_TOKEN_COOKIE_NAME
OAUTH_TRANSACTION_COOKIE_NAME = "Factory-OAuth-Transaction"
OAUTH_TRANSACTION_MAX_AGE_SECONDS = 300
router = APIRouter(prefix="/auth", tags=["authentication"])
dev_router = APIRouter(prefix="/auth/dev", tags=["development authentication"])


AUTH_NOT_CONFIGURED_CODE = "AUTH_NOT_CONFIGURED"
AUTH_NOT_CONFIGURED_MESSAGE = "Authentication is not configured for this environment."


def documented_error(code: str, message: str, description: str) -> dict:
    return {
        "model": ErrorResponse,
        "description": description,
        "content": {
            "application/json": {
                "example": {"error": {"code": code, "message": message}}
            }
        },
    }


def documented_callback_error() -> dict:
    invalid_state = {
        "error": {
            "code": "INVALID_OAUTH_STATE",
            "message": "The sign-in state is invalid or expired.",
        }
    }
    exchange_failed = {
        "error": {
            "code": "OAUTH_EXCHANGE_FAILED",
            "message": "The sign-in code could not be exchanged.",
        }
    }
    return {
        "model": ErrorResponse,
        "description": "Invalid or expired sign-in state or code.",
        "content": {
            "application/json": {
                "example": invalid_state,
                "examples": {
                    "invalidOauthState": {
                        "summary": "Invalid or expired browser-bound transaction",
                        "value": invalid_state,
                    },
                    "oauthExchangeFailed": {
                        "summary": "Supabase rejected the one-time code",
                        "value": exchange_failed,
                    },
                },
            }
        },
    }


class SupabaseAuthError(Exception):
    pass


class SupabaseAccessTokenExpired(SupabaseAuthError):
    pass


class SupabaseAuthProvider(Protocol):
    async def verify_access_token(self, token: str) -> dict[str, Any]: ...


def require_auth_configuration(request: Request) -> None:
    if not request.app.state.settings.is_auth_configured:
        raise ApiError(AUTH_NOT_CONFIGURED_CODE, AUTH_NOT_CONFIGURED_MESSAGE, 503)


class SupabaseAuthClient:
    def __init__(
        self,
        supabase_url: str,
        publishable_key: str,
        authorization_url: str | None = None,
    ) -> None:
        self._supabase_url = supabase_url.rstrip("/")
        self._authorization_url = (authorization_url or supabase_url).rstrip("/")
        self._headers = {"apikey": publishable_key}

    def authorization_url(
        self, *, callback_url: str, code_challenge: str, state: str
    ) -> str:
        return f"{self._authorization_url}/auth/v1/authorize?" + urlencode(
            {
                "provider": "google",
                "redirect_to": callback_url,
                "code_challenge": code_challenge,
                "code_challenge_method": "s256",
                "state": state,
            }
        )

    async def exchange_code(self, *, code: str, code_verifier: str) -> dict[str, Any]:
        return await self._token_request(
            "pkce", {"auth_code": code, "code_verifier": code_verifier}
        )

    async def password_sign_in(self, *, email: str, password: str) -> dict[str, Any]:
        return await self._token_request(
            "password", {"email": email, "password": password}
        )

    async def refresh_session(self, *, refresh_token: str) -> dict[str, Any]:
        return await self._token_request(
            "refresh_token", {"refresh_token": refresh_token}
        )

    async def exchange_google_id_token(
        self, *, id_token: str, nonce: str
    ) -> dict[str, Any]:
        return await self._token_request(
            "id_token", {"provider": "google", "id_token": id_token, "nonce": nonce}
        )

    async def logout(self, *, access_token: str) -> None:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    f"{self._supabase_url}/auth/v1/logout",
                    headers={
                        **self._headers,
                        "Authorization": f"Bearer {access_token}",
                    },
                )
            response.raise_for_status()
        except httpx.HTTPError as error:
            raise SupabaseAuthError from error

    async def verify_access_token(self, token: str) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                jwks_response = await client.get(
                    f"{self._supabase_url}/auth/v1/.well-known/jwks.json",
                    headers=self._headers,
                )
            jwks = jwks_response.json() if jwks_response.is_success else {}
        except (httpx.HTTPError, ValueError):
            jwks = {}
        keys = jwks.get("keys") if isinstance(jwks, dict) else None
        if isinstance(keys, list) and keys:
            try:
                header = jwt.get_unverified_header(token)
                key = next(
                    key
                    for key in jwt.PyJWKSet.from_dict(jwks).keys
                    if key.key_id == header.get("kid")
                )
                return jwt.decode(
                    token,
                    key.key,
                    algorithms=["RS256", "ES256", "EdDSA"],
                    audience="authenticated",
                    issuer=f"{self._supabase_url}/auth/v1",
                    options={"require": ["exp", "sub", "aud", "iss"]},
                )
            except jwt.ExpiredSignatureError as error:
                raise SupabaseAccessTokenExpired from error
            except (jwt.PyJWTError, StopIteration, ValueError) as error:
                raise SupabaseAuthError from error
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    f"{self._supabase_url}/auth/v1/user",
                    headers={**self._headers, "Authorization": f"Bearer {token}"},
                )
            response.raise_for_status()
            user = response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise SupabaseAuthError from error
        if not isinstance(user, dict) or not isinstance(user.get("id"), str):
            raise SupabaseAuthError
        return {"sub": user["id"], "email": user.get("email")}

    async def _token_request(
        self, grant_type: str, body: dict[str, str]
    ) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    f"{self._supabase_url}/auth/v1/token?grant_type={grant_type}",
                    headers=self._headers,
                    json=body,
                )
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise SupabaseAuthError from error
        if not isinstance(payload, dict):
            raise SupabaseAuthError
        return payload


@router.get(
    "/login",
    status_code=307,
    response_class=RedirectResponse,
    summary="Start Google sign-in",
    description="Validates an allow-listed Factory return path, creates a browser-bound OAuth transaction, and redirects to Supabase Google OAuth using PKCE.",
    responses={
        307: {
            "description": "Browser redirect to Supabase Google OAuth.",
            "headers": {
                "Set-Cookie": {
                    "description": "Short-lived browser-bound OAuth transaction cookie."
                }
            },
        },
        400: documented_error(
            "INVALID_RETURN_PATH",
            "The requested return path is not allowed.",
            "Invalid return path.",
        ),
        503: documented_error(
            AUTH_NOT_CONFIGURED_CODE,
            AUTH_NOT_CONFIGURED_MESSAGE,
            "Authentication is not configured.",
        ),
    },
)
async def login(
    request: Request,
    next_path: str = Query(
        "/",
        alias="next",
        description="Allow-listed relative Factory path to open after sign-in.",
    ),
) -> RedirectResponse:
    settings = request.app.state.settings
    require_auth_configuration(request)
    if not allowed_return_path(next_path, settings.auth_allowed_return_paths):
        raise ApiError(
            "INVALID_RETURN_PATH", "The requested return path is not allowed.", 400
        )
    verifier = secrets.token_urlsafe(64)
    state = secrets.token_urlsafe(32)
    transaction = secrets.token_urlsafe(32)
    transaction_binding = hashlib.sha256(transaction.encode()).hexdigest()
    challenge = (
        base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest())
        .rstrip(b"=")
        .decode()
    )
    request.app.state.session_store.store_oauth_state(
        state, verifier, next_path, transaction_binding
    )
    url = request.app.state.supabase_auth_client.authorization_url(
        callback_url=f"{settings.auth_public_url}/auth/callback",
        code_challenge=challenge,
        state=state,
    )
    response = RedirectResponse(
        url, status_code=307, headers={"Cache-Control": "no-store"}
    )
    response.set_cookie(
        OAUTH_TRANSACTION_COOKIE_NAME,
        transaction,
        httponly=True,
        secure=settings.browser_cookie_secure,
        samesite="lax",
        path="/",
        max_age=OAUTH_TRANSACTION_MAX_AGE_SECONDS,
    )
    return response


@router.get(
    "/callback",
    status_code=303,
    response_class=RedirectResponse,
    summary="Complete Google sign-in",
    description="Requires the initiating browser transaction, atomically consumes a one-time bound PKCE state, exchanges the Supabase authorization code server-side, and sets HttpOnly Supabase access and refresh cookies.",
    responses={
        303: {
            "description": "OAuth code exchanged and Supabase browser token cookies issued.",
            "headers": {
                "Set-Cookie": {
                    "description": "HttpOnly Supabase access and refresh cookies; expires the OAuth transaction cookie."
                }
            },
        },
        400: documented_callback_error(),
        503: documented_error(
            AUTH_NOT_CONFIGURED_CODE,
            AUTH_NOT_CONFIGURED_MESSAGE,
            "Authentication is not configured.",
        ),
    },
)
async def callback(
    request: Request,
    code: str | None = Query(
        None, description="Single-use Supabase PKCE authorization code."
    ),
    state: str | None = Query(None, description="Single-use Factory PKCE state value."),
) -> Response:
    require_auth_configuration(request)
    transaction = request.cookies.get(OAUTH_TRANSACTION_COOKIE_NAME)
    if not code or not state or not transaction:
        return oauth_error_response(
            "INVALID_OAUTH_STATE", "The sign-in state is invalid or expired."
        )
    transaction_binding = hashlib.sha256(transaction.encode()).hexdigest()
    oauth_state = request.app.state.session_store.consume_oauth_state(
        state, transaction_binding
    )
    if oauth_state is None:
        return oauth_error_response(
            "INVALID_OAUTH_STATE", "The sign-in state is invalid or expired."
        )
    try:
        token_data = await request.app.state.supabase_auth_client.exchange_code(
            code=code, code_verifier=oauth_state.code_verifier
        )
        validate_token_pair(token_data)
    except (SupabaseAuthError, ValueError):
        return oauth_error_response(
            "OAUTH_EXCHANGE_FAILED", "The sign-in code could not be exchanged."
        )
    response = RedirectResponse(
        oauth_state.next_path, status_code=303, headers={"Cache-Control": "no-store"}
    )
    set_token_cookies(
        response, token_data, secure=request.app.state.settings.browser_cookie_secure
    )
    response.delete_cookie(
        OAUTH_TRANSACTION_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=request.app.state.settings.browser_cookie_secure,
        samesite="lax",
    )
    return response


def validate_token_pair(token_data: dict[str, Any]) -> None:
    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in")
    if (
        not isinstance(access_token, str)
        or not access_token
        or not isinstance(refresh_token, str)
        or not refresh_token
        or not isinstance(expires_in, int)
        or expires_in <= 0
    ):
        raise ValueError("Supabase returned an invalid token pair.")


REFRESH_TOKEN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30


def set_token_cookies(
    response: Response, token_data: dict[str, Any], *, secure: bool = True
) -> None:
    response.set_cookie(
        ACCESS_TOKEN_COOKIE_NAME,
        token_data["access_token"],
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
        max_age=token_data["expires_in"],
    )
    response.set_cookie(
        REFRESH_TOKEN_COOKIE_NAME,
        token_data["refresh_token"],
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
        max_age=token_data.get(
            "refresh_expires_in", REFRESH_TOKEN_COOKIE_MAX_AGE_SECONDS
        ),
    )


def clear_token_cookies(response: Response, *, secure: bool = True) -> None:
    for name in (ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME):
        response.delete_cookie(
            name, path="/", httponly=True, secure=secure, samesite="lax"
        )


def oauth_error_response(code: str, message: str) -> JSONResponse:
    response = JSONResponse(
        {"error": {"code": code, "message": message}},
        status_code=400,
        headers={"Cache-Control": "no-store"},
    )
    response.delete_cookie(
        OAUTH_TRANSACTION_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=True,
        samesite="lax",
    )
    return response


def allowed_return_path(path: str, allow_list: tuple[str, ...]) -> bool:
    if not path.startswith("/") or path.startswith("//") or "\\" in path:
        return False
    return any(
        path == allowed or (allowed != "/" and path.startswith(f"{allowed}/"))
        for allowed in allow_list
    )


@router.get(
    "/session",
    summary="Read the signed-in Supabase user",
    description="Returns selected user data for a verified browser cookie or Bearer access token. Browser refresh tokens are never returned.",
    response_model=SessionResponse,
    responses={
        401: documented_error(
            "INVALID_CREDENTIALS",
            "A valid Supabase access credential is required.",
            "Invalid credential.",
        ),
        503: documented_error(
            AUTH_NOT_CONFIGURED_CODE,
            AUTH_NOT_CONFIGURED_MESSAGE,
            "Authentication is not configured.",
        ),
    },
)
async def get_session(request: Request) -> JSONResponse:
    require_auth_configuration(request)
    from factory_api.auth import get_current_principal

    principal = await get_current_principal(request)
    return JSONResponse(
        SessionResponse(
            user={"id": principal.subject, "email": principal.email}
        ).model_dump(exclude_none=True),
        headers={"Cache-Control": "no-store"},
    )


@router.post(
    "/logout",
    status_code=204,
    summary="Revoke Supabase browser credentials",
    description="Attempts provider sign-out then clears both HttpOnly browser token cookies.",
)
async def logout(request: Request) -> Response:
    require_auth_configuration(request)
    from factory_api.auth import _single_bearer_token, get_current_principal

    bearer = _single_bearer_token(request)
    access_token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)
    if bearer:
        await get_current_principal(request)
        access_token = bearer
    if access_token:
        try:
            await request.app.state.supabase_auth_client.logout(
                access_token=access_token
            )
        except Exception:  # noqa: BLE001, S110 -- Provider logout is best-effort.
            pass
    response = Response(status_code=204, headers={"Cache-Control": "no-store"})
    clear_token_cookies(
        response, secure=request.app.state.settings.browser_cookie_secure
    )
    return response


@router.post(
    "/native/challenge",
    summary="Create a native Google nonce",
    description="Creates a one-time, five-minute nonce for a native Google ID-token exchange.",
)
async def native_challenge(request: Request) -> JSONResponse:
    require_auth_configuration(request)
    nonce = secrets.token_urlsafe(32)
    request.app.state.session_store.store_native_challenge(nonce)
    return JSONResponse({"nonce": nonce}, headers={"Cache-Control": "no-store"})


@router.post(
    "/native/exchange",
    summary="Exchange a native Google ID token",
    description="Consumes a one-time nonce and returns only the Supabase token pair.",
)
async def native_exchange(request: Request) -> JSONResponse:
    require_auth_configuration(request)
    payload = await request_json_object(request)
    id_token = payload.get("id_token") if isinstance(payload, dict) else None
    nonce = payload.get("nonce") if isinstance(payload, dict) else None
    if (
        not isinstance(id_token, str)
        or not isinstance(nonce, str)
        or not request.app.state.session_store.consume_native_challenge(nonce)
    ):
        raise ApiError(
            "INVALID_NATIVE_CHALLENGE",
            "The native sign-in challenge is invalid or expired.",
            401,
        )
    try:
        token_data = (
            await request.app.state.supabase_auth_client.exchange_google_id_token(
                id_token=id_token, nonce=nonce
            )
        )
        validate_token_pair(token_data)
    except Exception as error:
        raise ApiError(
            "NATIVE_EXCHANGE_FAILED", "The Google ID token could not be exchanged.", 401
        ) from error
    return JSONResponse(
        token_pair_response(token_data), headers={"Cache-Control": "no-store"}
    )


@router.post(
    "/token/refresh",
    summary="Refresh a native Supabase token pair",
    description="Refreshes a native Supabase refresh token and returns the provider's rotated pair.",
)
async def refresh_token(request: Request) -> JSONResponse:
    require_auth_configuration(request)
    payload = await request_json_object(request)
    value = payload.get("refresh_token") if isinstance(payload, dict) else None
    if not isinstance(value, str):
        raise ApiError(
            "INVALID_REFRESH_TOKEN", "A valid Supabase refresh token is required.", 401
        )
    try:
        token_data = await request.app.state.supabase_auth_client.refresh_session(
            refresh_token=value
        )
        validate_token_pair(token_data)
    except Exception as error:
        raise ApiError(
            "INVALID_REFRESH_TOKEN", "A valid Supabase refresh token is required.", 401
        ) from error
    return JSONResponse(
        token_pair_response(token_data), headers={"Cache-Control": "no-store"}
    )


def token_pair_response(token_data: dict[str, Any]) -> dict[str, Any]:
    return {
        name: token_data[name]
        for name in ("access_token", "refresh_token", "expires_in")
        if name in token_data
    } | {"token_type": token_data.get("token_type", "bearer")}


async def request_json_object(request: Request) -> dict[str, Any] | None:
    try:
        payload = await request.json()
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None
    return payload if isinstance(payload, dict) else None


DEV_AUTH_ERROR_CODE = "INVALID_DEVELOPMENT_AUTH"
DEV_AUTH_ERROR_MESSAGE = "The development auth credential is invalid."


def require_development_auth_secret(request: Request) -> None:
    values = request.headers.getlist("x-dev-auth-secret")
    secret = request.app.state.settings.dev_auth_secret
    if len(values) != 1 or not secret or not hmac.compare_digest(values[0], secret):
        raise ApiError(DEV_AUTH_ERROR_CODE, DEV_AUTH_ERROR_MESSAGE, 401)


async def issue_development_token_pair(request: Request) -> dict[str, Any]:
    require_auth_configuration(request)
    require_development_auth_secret(request)
    settings = request.app.state.settings
    try:
        token_data = await request.app.state.supabase_auth_client.password_sign_in(
            email=settings.dev_auth_email, password=settings.dev_auth_password
        )
        validate_token_pair(token_data)
        return token_data
    except Exception as error:
        raise ApiError(
            "DEVELOPMENT_AUTH_ISSUANCE_FAILED",
            "The local Supabase test login could not be authenticated.",
            503,
        ) from error


@dev_router.post(
    "/token",
    summary="Issue local Supabase test tokens",
    description="Requires the local development issuer secret and returns a Supabase token pair for the configured local test login.",
)
async def development_token(request: Request) -> JSONResponse:
    token_data = await issue_development_token_pair(request)
    return JSONResponse(
        token_pair_response(token_data), headers={"Cache-Control": "no-store"}
    )


@dev_router.post(
    "/session",
    status_code=204,
    summary="Issue local Supabase test cookies",
    description="Requires the local development issuer secret and sets HttpOnly Supabase token cookies for the configured local test login.",
)
async def development_session(request: Request) -> Response:
    token_data = await issue_development_token_pair(request)
    response = Response(status_code=204, headers={"Cache-Control": "no-store"})
    set_token_cookies(
        response, token_data, secure=request.app.state.settings.browser_cookie_secure
    )
    return response
