import uuid
from dataclasses import dataclass

from fastapi import Request

from factory_api.errors import ApiError
from factory_api.routers.auth import ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME, SupabaseAccessTokenExpired, validate_token_pair


@dataclass(frozen=True)
class AuthenticatedPrincipal:
    subject: str
    email: str | None = None


def authentication_error() -> ApiError:
    return ApiError("INVALID_CREDENTIALS", "A valid Supabase access credential is required.", 401)


def _single_bearer_token(request: Request) -> str | None:
    headers = request.headers.getlist("authorization")
    if len(headers) > 1:
        raise authentication_error()
    if not headers:
        return None
    scheme, separator, token = headers[0].partition(" ")
    if scheme.lower() != "bearer" or not separator or not token or token.strip() != token:
        raise authentication_error()
    return token


def _single_cookie(request: Request, cookie_name: str) -> str | None:
    cookie_headers = request.headers.getlist("cookie")
    occurrences = 0
    for header in cookie_headers:
        for segment in header.split(";"):
            name, separator, _ = segment.strip().partition("=")
            if name.strip() != cookie_name:
                continue
            occurrences += 1
            if not separator or name != cookie_name:
                raise authentication_error()
    if occurrences > 1:
        raise authentication_error()
    return request.cookies.get(cookie_name)


def _access_cookie(request: Request) -> str | None:
    return _single_cookie(request, ACCESS_TOKEN_COOKIE_NAME)


def _refresh_cookie(request: Request) -> str | None:
    return _single_cookie(request, REFRESH_TOKEN_COOKIE_NAME)


def _clear_browser_tokens_on_credential_error(request: Request) -> None:
    cookie_headers = request.headers.getlist("cookie")
    for header in cookie_headers:
        for segment in header.split(";"):
            name, separator, _ = segment.strip().partition("=")
            if separator and name.strip() in (ACCESS_TOKEN_COOKIE_NAME, REFRESH_TOKEN_COOKIE_NAME):
                request.state.clear_browser_tokens = True
                return


def principal_from_claims(claims: dict) -> AuthenticatedPrincipal:
    subject = claims.get("sub")
    try:
        canonical_subject = str(uuid.UUID(subject))
    except (ValueError, TypeError, AttributeError) as error:
        raise authentication_error() from error
    email = claims.get("email")
    return AuthenticatedPrincipal(subject=canonical_subject, email=email if isinstance(email, str) else None)


async def get_current_principal(request: Request) -> AuthenticatedPrincipal:
    try:
        bearer = _single_bearer_token(request)
        cookie = _access_cookie(request)
        if bool(bearer) == bool(cookie):
            raise authentication_error()
    except ApiError:
        _clear_browser_tokens_on_credential_error(request)
        raise
    if bearer:
        try:
            return principal_from_claims(await request.app.state.supabase_auth_client.verify_access_token(bearer))
        except Exception as error:
            raise authentication_error() from error

    try:
        return principal_from_claims(await request.app.state.supabase_auth_client.verify_access_token(cookie))
    except SupabaseAccessTokenExpired:
        try:
            refresh_token = _refresh_cookie(request)
        except ApiError:
            request.state.clear_browser_tokens = True
            raise
        if not refresh_token:
            request.state.clear_browser_tokens = True
            raise authentication_error()
        try:
            token_data = await request.app.state.supabase_auth_client.refresh_session(refresh_token=refresh_token)
            validate_token_pair(token_data)
            principal = principal_from_claims(await request.app.state.supabase_auth_client.verify_access_token(token_data["access_token"]))
        except Exception as error:
            request.state.clear_browser_tokens = True
            raise authentication_error() from error
        request.state.refreshed_token_data = token_data
        return principal
    except Exception as error:
        request.state.clear_browser_tokens = True
        raise authentication_error() from error
