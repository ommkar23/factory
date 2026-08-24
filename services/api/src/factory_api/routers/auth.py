import base64
import hashlib
import secrets
from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse, Response

from factory_api.errors import ApiError
from factory_api.schemas import ErrorResponse, SessionResponse


COOKIE_NAME = "Factory-Session"
OAUTH_TRANSACTION_COOKIE_NAME = "Factory-OAuth-Transaction"
OAUTH_TRANSACTION_MAX_AGE_SECONDS = 300
router = APIRouter(prefix="/auth", tags=["authentication"])


AUTH_NOT_CONFIGURED_CODE = "AUTH_NOT_CONFIGURED"
AUTH_NOT_CONFIGURED_MESSAGE = "Authentication is not configured for this environment."


def documented_error(code: str, message: str, description: str) -> dict:
    return {
        "model": ErrorResponse,
        "description": description,
        "content": {"application/json": {"example": {"error": {"code": code, "message": message}}}},
    }


def documented_callback_error() -> dict:
    invalid_state = {"error": {"code": "INVALID_OAUTH_STATE", "message": "The sign-in state is invalid or expired."}}
    exchange_failed = {"error": {"code": "OAUTH_EXCHANGE_FAILED", "message": "The sign-in code could not be exchanged."}}
    return {
        "model": ErrorResponse,
        "description": "Invalid or expired sign-in state or code.",
        "content": {
            "application/json": {
                "example": invalid_state,
                "examples": {
                    "invalidOauthState": {"summary": "Invalid or expired browser-bound transaction", "value": invalid_state},
                    "oauthExchangeFailed": {"summary": "Supabase rejected the one-time code", "value": exchange_failed},
                },
            }
        },
    }


class SupabaseAuthError(Exception):
    pass


def require_auth_configuration(request: Request) -> None:
    if not request.app.state.settings.is_auth_configured:
        raise ApiError(AUTH_NOT_CONFIGURED_CODE, AUTH_NOT_CONFIGURED_MESSAGE, 503)


class SupabaseAuthClient:
    def __init__(self, supabase_url: str, publishable_key: str, authorization_url: str | None = None) -> None:
        self._supabase_url = supabase_url.rstrip("/")
        self._authorization_url = (authorization_url or supabase_url).rstrip("/")
        self._headers = {"apikey": publishable_key}

    def authorization_url(self, *, callback_url: str, code_challenge: str, state: str) -> str:
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
        return await self._token_request("pkce", {"auth_code": code, "code_verifier": code_verifier})

    async def refresh_session(self, *, refresh_token: str) -> dict[str, Any]:
        return await self._token_request("refresh_token", {"refresh_token": refresh_token})

    async def _token_request(self, grant_type: str, body: dict[str, str]) -> dict[str, Any]:
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
            "headers": {"Set-Cookie": {"description": "Short-lived browser-bound OAuth transaction cookie."}},
        },
        400: documented_error("INVALID_RETURN_PATH", "The requested return path is not allowed.", "Invalid return path."),
        503: documented_error(AUTH_NOT_CONFIGURED_CODE, AUTH_NOT_CONFIGURED_MESSAGE, "Authentication is not configured."),
    },
)
async def login(request: Request, next_path: str = Query("/", alias="next", description="Allow-listed relative Factory path to open after sign-in.")) -> RedirectResponse:
    settings = request.app.state.settings
    require_auth_configuration(request)
    if not allowed_return_path(next_path, settings.auth_allowed_return_paths):
        raise ApiError("INVALID_RETURN_PATH", "The requested return path is not allowed.", 400)
    verifier = secrets.token_urlsafe(64)
    state = secrets.token_urlsafe(32)
    transaction = secrets.token_urlsafe(32)
    transaction_binding = hashlib.sha256(transaction.encode()).hexdigest()
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    request.app.state.session_store.store_oauth_state(state, verifier, next_path, transaction_binding)
    url = request.app.state.supabase_auth_client.authorization_url(
        callback_url=f"{settings.auth_public_url}/auth/callback", code_challenge=challenge, state=state
    )
    response = RedirectResponse(url, status_code=307, headers={"Cache-Control": "no-store"})
    response.set_cookie(
        OAUTH_TRANSACTION_COOKIE_NAME,
        transaction,
        httponly=True,
        secure=True,
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
    description="Requires the initiating browser transaction, atomically consumes a one-time bound PKCE state, exchanges the Supabase authorization code server-side, and creates an opaque Factory session cookie.",
    responses={
        303: {
            "description": "OAuth code exchanged and Factory session cookie issued.",
            "headers": {"Set-Cookie": {"description": "Opaque Factory session cookie; expires the OAuth transaction cookie."}},
        },
        400: documented_callback_error(),
        503: documented_error(AUTH_NOT_CONFIGURED_CODE, AUTH_NOT_CONFIGURED_MESSAGE, "Authentication is not configured."),
    },
)
async def callback(
    request: Request,
    code: str | None = Query(None, description="Single-use Supabase PKCE authorization code."),
    state: str | None = Query(None, description="Single-use Factory PKCE state value."),
) -> Response:
    require_auth_configuration(request)
    transaction = request.cookies.get(OAUTH_TRANSACTION_COOKIE_NAME)
    if not code or not state or not transaction:
        return oauth_error_response("INVALID_OAUTH_STATE", "The sign-in state is invalid or expired.")
    transaction_binding = hashlib.sha256(transaction.encode()).hexdigest()
    oauth_state = request.app.state.session_store.consume_oauth_state(state, transaction_binding)
    if oauth_state is None:
        return oauth_error_response("INVALID_OAUTH_STATE", "The sign-in state is invalid or expired.")
    try:
        token_data = await request.app.state.supabase_auth_client.exchange_code(code=code, code_verifier=oauth_state.code_verifier)
        session_id = request.app.state.session_store.create_session(token_data)
    except (SupabaseAuthError, ValueError):
        return oauth_error_response("OAUTH_EXCHANGE_FAILED", "The sign-in code could not be exchanged.")
    response = RedirectResponse(oauth_state.next_path, status_code=303, headers={"Cache-Control": "no-store"})
    response.set_cookie(COOKIE_NAME, session_id, httponly=True, secure=True, samesite="lax", path="/")
    response.delete_cookie(OAUTH_TRANSACTION_COOKIE_NAME, path="/", httponly=True, secure=True, samesite="lax")
    return response


def oauth_error_response(code: str, message: str) -> JSONResponse:
    response = JSONResponse({"error": {"code": code, "message": message}}, status_code=400, headers={"Cache-Control": "no-store"})
    response.delete_cookie(OAUTH_TRANSACTION_COOKIE_NAME, path="/", httponly=True, secure=True, samesite="lax")
    return response


def allowed_return_path(path: str, allow_list: tuple[str, ...]) -> bool:
    if not path.startswith("/") or path.startswith("//") or "\\" in path:
        return False
    return any(path == allowed or (allowed != "/" and path.startswith(f"{allowed}/")) for allowed in allow_list)



@router.get(
    "/session",
    summary="Read the Factory session",
    description="Returns the signed-in user profile for a valid opaque Factory cookie. OAuth credentials are never returned.",
    response_model=SessionResponse,
    responses={
        401: documented_error("INVALID_SESSION", "A valid Factory session is required.", "A valid Factory session is required."),
        503: documented_error(AUTH_NOT_CONFIGURED_CODE, AUTH_NOT_CONFIGURED_MESSAGE, "Authentication is not configured."),
    },
)
async def get_session(request: Request) -> JSONResponse:
    require_auth_configuration(request)
    session_id = request.cookies.get(COOKIE_NAME)
    session = request.app.state.session_store.get_session(session_id) if session_id else None
    if session is None:
        raise ApiError("INVALID_SESSION", "A valid Factory session is required.", 401)
    return JSONResponse(SessionResponse(user=session.user).model_dump(exclude_none=True), headers={"Cache-Control": "no-store"})



@router.post(
    "/logout",
    status_code=204,
    summary="End the Factory session",
    description="Deletes the server-side session and expires the opaque Factory cookie.",
    responses={503: documented_error(AUTH_NOT_CONFIGURED_CODE, AUTH_NOT_CONFIGURED_MESSAGE, "Authentication is not configured.")},
)
async def logout(request: Request) -> Response:
    require_auth_configuration(request)
    session_id = request.cookies.get(COOKIE_NAME)
    if session_id:
        request.app.state.session_store.delete_session(session_id)
    response = Response(status_code=204, headers={"Cache-Control": "no-store"})
    response.delete_cookie(COOKIE_NAME, path="/", httponly=True, secure=True, samesite="lax")
    return response
