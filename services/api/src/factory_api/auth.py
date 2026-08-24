from dataclasses import dataclass
import time

from fastapi import Request

from factory_api.errors import ApiError
from factory_api.routers.auth import COOKIE_NAME, SupabaseAuthError
from factory_api.session_store import ServerSession


_REFRESH_WINDOW_SECONDS = 60


@dataclass(frozen=True)
class AuthenticatedPrincipal:
    subject: str


async def get_current_principal(request: Request) -> AuthenticatedPrincipal:
    if request.app.state.settings.is_development:
        return AuthenticatedPrincipal(subject="development-bypass")
    session_id = request.cookies.get(COOKIE_NAME)
    session = request.app.state.session_store.get_session(session_id) if session_id else None
    if session is None:
        raise authentication_error()
    if session.expires_at <= int(time.time()) + _REFRESH_WINDOW_SECONDS:
        session = await refresh_session(request, session_id, session)
    subject = session.user.get("id")
    if not isinstance(subject, str) or not subject:
        request.app.state.session_store.delete_session(session_id)
        raise authentication_error()
    return AuthenticatedPrincipal(subject=subject)


async def refresh_session(request: Request, session_id: str, session: ServerSession) -> ServerSession:
    store = request.app.state.session_store
    try:
        token_data = await request.app.state.supabase_auth_client.refresh_session(refresh_token=session.refresh_token)
        refreshed_session = store.replace_session(session_id, session.version, token_data)
        if refreshed_session is not None:
            return refreshed_session
        current_session = store.get_session(session_id)
        if current_session is not None and current_session.version != session.version:
            return current_session
        raise authentication_error()
    except (SupabaseAuthError, ValueError) as error:
        store.delete_session_if_version(session_id, session.version)
        raise authentication_error() from error


def authentication_error() -> ApiError:
    return ApiError("INVALID_SESSION", "A valid Factory session is required.", 401)
