import json
import secrets
import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from cryptography.fernet import Fernet


@dataclass(frozen=True)
class OAuthState:
    code_verifier: str
    next_path: str


@dataclass(frozen=True)
class ServerSession:
    access_token: str
    refresh_token: str
    expires_at: int
    user: dict[str, Any]
    version: int = 0


class SqliteSessionStore:
    def __init__(self, database_url: str, encryption_key: str) -> None:
        prefix = "sqlite:///"
        if not database_url.startswith(prefix):
            raise ValueError("AUTH_SESSION_DATABASE_URL must use sqlite:///.")
        self._path = Path(database_url.removeprefix(prefix))
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._fernet = Fernet(encryption_key.encode())
        with self._connect() as connection:
            connection.execute(
                "CREATE TABLE IF NOT EXISTS oauth_states (state TEXT PRIMARY KEY, payload BLOB NOT NULL, expires_at INTEGER NOT NULL)"
            )
            connection.execute(
                "CREATE TABLE IF NOT EXISTS sessions (session_id TEXT PRIMARY KEY, payload BLOB NOT NULL, expires_at INTEGER NOT NULL, version INTEGER NOT NULL DEFAULT 0)"
            )
            columns = {row[1] for row in connection.execute("PRAGMA table_info(sessions)")}
            if "version" not in columns:
                connection.execute("ALTER TABLE sessions ADD COLUMN version INTEGER NOT NULL DEFAULT 0")

    def initialize(self) -> None:
        return None

    def store_oauth_state(self, state: str, code_verifier: str, next_path: str, transaction_binding: str) -> None:
        payload = self._encrypt(
            {"code_verifier": code_verifier, "next_path": next_path, "transaction_binding": transaction_binding}
        )
        now = int(time.time())
        with self._connect() as connection:
            connection.execute("DELETE FROM oauth_states WHERE expires_at < ?", (now,))
            connection.execute(
                "INSERT INTO oauth_states (state, payload, expires_at) VALUES (?, ?, ?)",
                (state, payload, now + 300),
            )

    def consume_oauth_state(self, state: str, transaction_binding: str) -> OAuthState | None:
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute("SELECT payload, expires_at FROM oauth_states WHERE state = ?", (state,)).fetchone()
            if row is None or row[1] < int(time.time()):
                if row is not None:
                    connection.execute("DELETE FROM oauth_states WHERE state = ?", (state,))
                return None
            payload = self._decrypt(row[0])
            stored_binding = payload.get("transaction_binding")
            if not isinstance(stored_binding, str) or not secrets.compare_digest(stored_binding, transaction_binding):
                return None
            connection.execute("DELETE FROM oauth_states WHERE state = ?", (state,))
            return OAuthState(code_verifier=payload["code_verifier"], next_path=payload["next_path"])

    def create_session(self, token_data: dict[str, Any]) -> str:
        session = self._session_from_token_data(token_data)
        session_id = secrets.token_urlsafe(32)
        with self._connect() as connection:
            connection.execute("DELETE FROM sessions WHERE expires_at < ?", (int(time.time()),))
            connection.execute(
                "INSERT INTO sessions (session_id, payload, expires_at) VALUES (?, ?, ?)",
                (session_id, self._encrypt(session.__dict__), session.expires_at),
            )
        return session_id

    def get_session(self, session_id: str) -> ServerSession | None:
        with self._connect() as connection:
            row = connection.execute("SELECT payload, expires_at, version FROM sessions WHERE session_id = ?", (session_id,)).fetchone()
        if row is None:
            return None
        if row[1] < int(time.time()):
            self.delete_session_if_version(session_id, row[2])
            return None
        payload = self._decrypt(row[0])
        payload["version"] = row[2]
        return ServerSession(**payload)

    def replace_session(self, session_id: str, expected_version: int, token_data: dict[str, Any]) -> ServerSession | None:
        session = self._session_from_token_data(token_data, version=expected_version + 1)
        with self._connect() as connection:
            row = connection.execute(
                "UPDATE sessions SET payload = ?, expires_at = ?, version = version + 1 WHERE session_id = ? AND version = ? RETURNING version",
                (self._encrypt(session.__dict__), session.expires_at, session_id, expected_version),
            ).fetchone()
        return session if row is not None else None

    def delete_session_if_version(self, session_id: str, expected_version: int) -> bool:
        with self._connect() as connection:
            cursor = connection.execute("DELETE FROM sessions WHERE session_id = ? AND version = ?", (session_id, expected_version))
        return cursor.rowcount == 1

    def delete_session(self, session_id: str) -> None:
        with self._connect() as connection:
            connection.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))

    def _session_from_token_data(self, token_data: dict[str, Any], version: int = 0) -> ServerSession:
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in")
        user = token_data.get("user")
        user_id = user.get("id") if isinstance(user, dict) else None
        email = user.get("email") if isinstance(user, dict) else None
        if not isinstance(access_token, str) or not isinstance(refresh_token, str) or not isinstance(expires_in, int) or expires_in <= 0 or not isinstance(user_id, str) or not user_id:
            raise ValueError("Supabase returned an invalid session payload.")
        safe_user = {"id": user_id}
        if isinstance(email, str):
            safe_user["email"] = email
        return ServerSession(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=int(time.time()) + expires_in,
            user=safe_user,
            version=version,
        )

    def _encrypt(self, value: dict[str, Any]) -> bytes:
        return self._fernet.encrypt(json.dumps(value).encode())

    def _decrypt(self, value: bytes) -> dict[str, Any]:
        return json.loads(self._fernet.decrypt(value).decode())

    def _connect(self) -> sqlite3.Connection:
        return sqlite3.connect(self._path)


class PostgresSessionStore:
    def __init__(self, database_url: str, encryption_key: str) -> None:
        self._database_url = database_url
        self._fernet = Fernet(encryption_key.encode())

    def initialize(self) -> None:
        with _connect_postgres(self._database_url) as connection:
            connection.execute("CREATE SCHEMA IF NOT EXISTS factory_auth")
            connection.execute(
                "CREATE TABLE IF NOT EXISTS factory_auth.oauth_states (state TEXT PRIMARY KEY, payload BYTEA NOT NULL, expires_at BIGINT NOT NULL)"
            )
            connection.execute(
                "CREATE TABLE IF NOT EXISTS factory_auth.sessions (session_id TEXT PRIMARY KEY, payload BYTEA NOT NULL, expires_at BIGINT NOT NULL, version BIGINT NOT NULL DEFAULT 0)"
            )
            connection.execute("ALTER TABLE factory_auth.sessions ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0")

    def store_oauth_state(self, state: str, code_verifier: str, next_path: str, transaction_binding: str) -> None:
        payload = self._encrypt(
            {"code_verifier": code_verifier, "next_path": next_path, "transaction_binding": transaction_binding}
        )
        now = int(time.time())
        with _connect_postgres(self._database_url) as connection:
            connection.execute("DELETE FROM factory_auth.oauth_states WHERE expires_at < %s", (now,))
            connection.execute(
                "INSERT INTO factory_auth.oauth_states (state, payload, expires_at) VALUES (%s, %s, %s)",
                (state, payload, now + 300),
            )

    def consume_oauth_state(self, state: str, transaction_binding: str) -> OAuthState | None:
        with _connect_postgres(self._database_url) as connection:
            row = connection.execute(
                "SELECT payload, expires_at FROM factory_auth.oauth_states WHERE state = %s FOR UPDATE", (state,)
            ).fetchone()
            if row is None or row[1] < int(time.time()):
                if row is not None:
                    connection.execute("DELETE FROM factory_auth.oauth_states WHERE state = %s", (state,))
                return None
            payload = self._decrypt(row[0])
            stored_binding = payload.get("transaction_binding")
            if not isinstance(stored_binding, str) or not secrets.compare_digest(stored_binding, transaction_binding):
                return None
            connection.execute("DELETE FROM factory_auth.oauth_states WHERE state = %s", (state,))
            return OAuthState(code_verifier=payload["code_verifier"], next_path=payload["next_path"])

    def create_session(self, token_data: dict[str, Any]) -> str:
        session = self._session_from_token_data(token_data)
        session_id = secrets.token_urlsafe(32)
        with _connect_postgres(self._database_url) as connection:
            connection.execute("DELETE FROM factory_auth.sessions WHERE expires_at < %s", (int(time.time()),))
            connection.execute(
                "INSERT INTO factory_auth.sessions (session_id, payload, expires_at) VALUES (%s, %s, %s)",
                (session_id, self._encrypt(session.__dict__), session.expires_at),
            )
        return session_id

    def get_session(self, session_id: str) -> ServerSession | None:
        with _connect_postgres(self._database_url) as connection:
            row = connection.execute(
                "SELECT payload, expires_at, version FROM factory_auth.sessions WHERE session_id = %s", (session_id,)
            ).fetchone()
        if row is None:
            return None
        if row[1] < int(time.time()):
            self.delete_session_if_version(session_id, row[2])
            return None
        payload = self._decrypt(row[0])
        payload["version"] = row[2]
        return ServerSession(**payload)

    def replace_session(self, session_id: str, expected_version: int, token_data: dict[str, Any]) -> ServerSession | None:
        session = self._session_from_token_data(token_data, version=expected_version + 1)
        with _connect_postgres(self._database_url) as connection:
            row = connection.execute(
                "UPDATE factory_auth.sessions SET payload = %s, expires_at = %s, version = version + 1 WHERE session_id = %s AND version = %s RETURNING version",
                (self._encrypt(session.__dict__), session.expires_at, session_id, expected_version),
            ).fetchone()
        return session if row is not None else None

    def delete_session_if_version(self, session_id: str, expected_version: int) -> bool:
        with _connect_postgres(self._database_url) as connection:
            row = connection.execute(
                "DELETE FROM factory_auth.sessions WHERE session_id = %s AND version = %s RETURNING session_id",
                (session_id, expected_version),
            ).fetchone()
        return row is not None

    def delete_session(self, session_id: str) -> None:
        with _connect_postgres(self._database_url) as connection:
            connection.execute("DELETE FROM factory_auth.sessions WHERE session_id = %s", (session_id,))

    def _session_from_token_data(self, token_data: dict[str, Any], version: int = 0) -> ServerSession:
        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in")
        user = token_data.get("user")
        user_id = user.get("id") if isinstance(user, dict) else None
        email = user.get("email") if isinstance(user, dict) else None
        if not isinstance(access_token, str) or not isinstance(refresh_token, str) or not isinstance(expires_in, int) or expires_in <= 0 or not isinstance(user_id, str) or not user_id:
            raise ValueError("Supabase returned an invalid session payload.")
        safe_user = {"id": user_id}
        if isinstance(email, str):
            safe_user["email"] = email
        return ServerSession(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=int(time.time()) + expires_in,
            user=safe_user,
            version=version,
        )

    def _encrypt(self, value: dict[str, Any]) -> bytes:
        return self._fernet.encrypt(json.dumps(value).encode())

    def _decrypt(self, value: bytes) -> dict[str, Any]:
        return json.loads(self._fernet.decrypt(value).decode())


def _connect_postgres(database_url: str) -> Any:
    import psycopg

    return psycopg.connect(database_url)


def create_session_store(database_url: str, encryption_key: str) -> SqliteSessionStore | PostgresSessionStore:
    if database_url.startswith(("postgresql://", "postgres://")):
        return PostgresSessionStore(database_url, encryption_key)
    return SqliteSessionStore(database_url, encryption_key)
