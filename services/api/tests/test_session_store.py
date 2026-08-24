from pathlib import Path

import pytest

from factory_api import session_store


def test_session_store_factory_selects_postgresql_store() -> None:
    store = session_store.create_session_store(
        "postgresql://factory:password@database.example/factory",
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    )

    assert isinstance(store, session_store.PostgresSessionStore)


def test_stale_refresh_failure_cannot_delete_a_session_replaced_by_another_request(tmp_path: Path) -> None:
    store = session_store.SqliteSessionStore(
        f"sqlite:///{tmp_path / 'sessions.db'}",
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    )
    session_id = store.create_session(
        {
            "access_token": "before-access",
            "refresh_token": "before-refresh",
            "expires_in": 1,
            "user": {"id": "user-123"},
        }
    )
    stale_session = store.get_session(session_id)
    assert stale_session is not None

    refreshed_session = store.replace_session(
        session_id,
        stale_session.version,
        {
            "access_token": "after-access",
            "refresh_token": "after-refresh",
            "expires_in": 3600,
            "user": {"id": "user-123"},
        },
    )

    assert refreshed_session is not None
    assert store.delete_session_if_version(session_id, stale_session.version) is False
    current_session = store.get_session(session_id)
    assert current_session is not None
    assert current_session.refresh_token == "after-refresh"


def test_expired_sqlite_cleanup_cannot_delete_a_session_rotated_after_the_expiry_read(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setattr(session_store.time, "time", lambda: 100)

    class InterleavingSqliteSessionStore(session_store.SqliteSessionStore):
        def delete_session_if_version(self, session_id: str, expected_version: int) -> bool:
            refreshed = self.replace_session(
                session_id,
                expected_version,
                {
                    "access_token": "rotated-access",
                    "refresh_token": "rotated-refresh",
                    "expires_in": 3600,
                    "user": {"id": "user-123"},
                },
            )
            assert refreshed is not None
            return super().delete_session_if_version(session_id, expected_version)

    store = InterleavingSqliteSessionStore(
        f"sqlite:///{tmp_path / 'sessions.db'}",
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    )
    session_id = store.create_session(
        {
            "access_token": "expired-access",
            "refresh_token": "expired-refresh",
            "expires_in": 1,
            "user": {"id": "user-123"},
        }
    )
    monkeypatch.setattr(session_store.time, "time", lambda: 102)

    assert store.get_session(session_id) is None
    current_session = store.get_session(session_id)

    assert current_session is not None
    assert current_session.refresh_token == "rotated-refresh"


def test_expired_postgres_cleanup_cannot_delete_a_session_rotated_after_the_expiry_read(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(session_store.time, "time", lambda: 100)
    store = session_store.PostgresSessionStore(
        "postgresql://factory:***@database.example/factory",
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    )
    rows = {
        "session-123": (
            store._encrypt(
                {
                    "access_token": "expired-access",
                    "refresh_token": "expired-refresh",
                    "expires_at": 99,
                    "user": {"id": "user-123"},
                    "version": 0,
                }
            ),
            99,
            0,
        )
    }
    rotated_row = (
        store._encrypt(
            {
                "access_token": "rotated-access",
                "refresh_token": "rotated-refresh",
                "expires_at": 3700,
                "user": {"id": "user-123"},
                "version": 1,
            }
        ),
        3700,
        1,
    )

    class Cursor:
        def __init__(self, row: tuple[object, ...] | None) -> None:
            self._row = row

        def fetchone(self) -> tuple[object, ...] | None:
            return self._row

    class InterleavingPostgresConnection:
        def __enter__(self) -> "InterleavingPostgresConnection":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def execute(self, statement: str, parameters: tuple[object, ...] = ()) -> Cursor:
            if statement.startswith("SELECT"):
                return Cursor(rows.get(parameters[0]))
            assert statement.startswith("DELETE")
            rows[parameters[0]] = rotated_row
            if "AND version = %s" not in statement or parameters[1] != 0:
                rows.pop(parameters[0], None)
            return Cursor(None)

    monkeypatch.setattr(session_store, "_connect_postgres", lambda database_url: InterleavingPostgresConnection())

    assert store.get_session("session-123") is None
    current_session = store.get_session("session-123")

    assert current_session is not None
    assert current_session.refresh_token == "rotated-refresh"


class RecordingConnection:
    def __init__(self) -> None:
        self.statements: list[str] = []

    def __enter__(self) -> "RecordingConnection":
        return self

    def __exit__(self, *args: object) -> None:
        return None

    def execute(self, statement: str) -> None:
        self.statements.append(statement)


def test_postgres_session_store_initializes_a_private_schema(monkeypatch) -> None:
    connection = RecordingConnection()
    monkeypatch.setattr(session_store, "_connect_postgres", lambda database_url: connection, raising=False)
    store = session_store.PostgresSessionStore(
        "postgresql://factory:password@database.example/factory",
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    )

    store.initialize()

    assert connection.statements == [
        "CREATE SCHEMA IF NOT EXISTS factory_auth",
        "CREATE TABLE IF NOT EXISTS factory_auth.oauth_states (state TEXT PRIMARY KEY, payload BYTEA NOT NULL, expires_at BIGINT NOT NULL)",
        "CREATE TABLE IF NOT EXISTS factory_auth.sessions (session_id TEXT PRIMARY KEY, payload BYTEA NOT NULL, expires_at BIGINT NOT NULL, version BIGINT NOT NULL DEFAULT 0)",
        "ALTER TABLE factory_auth.sessions ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0",
    ]



def test_production_settings_reject_sqlite_session_store(monkeypatch) -> None:
    from factory_api.config import Settings

    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("SUPABASE_URL", "https://supabase.example")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "publishable-key")
    monkeypatch.setenv("AUTH_PUBLIC_URL", "https://api.factory.example")
    monkeypatch.setenv("AUTH_SESSION_ENCRYPTION_KEY", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
    monkeypatch.setenv("AUTH_SESSION_DATABASE_URL", "sqlite:////var/lib/factory-api/sessions.db")

    with pytest.raises(RuntimeError, match="PostgreSQL"):
        Settings.from_environment()
