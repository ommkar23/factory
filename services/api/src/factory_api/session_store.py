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

    def initialize(self) -> None:
        return None

    def store_oauth_state(
        self, state: str, code_verifier: str, next_path: str, transaction_binding: str
    ) -> None:
        payload = self._encrypt(
            {
                "code_verifier": code_verifier,
                "next_path": next_path,
                "transaction_binding": transaction_binding,
            }
        )
        now = int(time.time())
        with self._connect() as connection:
            connection.execute("DELETE FROM oauth_states WHERE expires_at < ?", (now,))
            connection.execute(
                "INSERT INTO oauth_states (state, payload, expires_at) VALUES (?, ?, ?)",
                (state, payload, now + 300),
            )

    def consume_oauth_state(
        self, state: str, transaction_binding: str
    ) -> OAuthState | None:
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            row = connection.execute(
                "SELECT payload, expires_at FROM oauth_states WHERE state = ?", (state,)
            ).fetchone()
            if row is None or row[1] < int(time.time()):
                if row is not None:
                    connection.execute(
                        "DELETE FROM oauth_states WHERE state = ?", (state,)
                    )
                return None
            payload = self._decrypt(row[0])
            binding = payload.get("transaction_binding")
            if not isinstance(binding, str) or not secrets.compare_digest(
                binding, transaction_binding
            ):
                return None
            connection.execute("DELETE FROM oauth_states WHERE state = ?", (state,))
            return OAuthState(
                code_verifier=payload["code_verifier"], next_path=payload["next_path"]
            )

    def store_native_challenge(self, nonce: str) -> None:
        self.store_oauth_state(f"native:{nonce}", "", "/", "native")

    def consume_native_challenge(self, nonce: str) -> bool:
        return self.consume_oauth_state(f"native:{nonce}", "native") is not None

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

    def store_oauth_state(
        self, state: str, code_verifier: str, next_path: str, transaction_binding: str
    ) -> None:
        payload = self._encrypt(
            {
                "code_verifier": code_verifier,
                "next_path": next_path,
                "transaction_binding": transaction_binding,
            }
        )
        now = int(time.time())
        with _connect_postgres(self._database_url) as connection:
            connection.execute(
                "DELETE FROM factory_auth.oauth_states WHERE expires_at < %s", (now,)
            )
            connection.execute(
                "INSERT INTO factory_auth.oauth_states (state, payload, expires_at) VALUES (%s, %s, %s)",
                (state, payload, now + 300),
            )

    def consume_oauth_state(
        self, state: str, transaction_binding: str
    ) -> OAuthState | None:
        with _connect_postgres(self._database_url) as connection:
            row = connection.execute(
                "SELECT payload, expires_at FROM factory_auth.oauth_states WHERE state = %s FOR UPDATE",
                (state,),
            ).fetchone()
            if row is None or row[1] < int(time.time()):
                if row is not None:
                    connection.execute(
                        "DELETE FROM factory_auth.oauth_states WHERE state = %s",
                        (state,),
                    )
                return None
            payload = self._decrypt(row[0])
            binding = payload.get("transaction_binding")
            if not isinstance(binding, str) or not secrets.compare_digest(
                binding, transaction_binding
            ):
                return None
            connection.execute(
                "DELETE FROM factory_auth.oauth_states WHERE state = %s", (state,)
            )
            return OAuthState(
                code_verifier=payload["code_verifier"], next_path=payload["next_path"]
            )

    def store_native_challenge(self, nonce: str) -> None:
        self.store_oauth_state(f"native:{nonce}", "", "/", "native")

    def consume_native_challenge(self, nonce: str) -> bool:
        return self.consume_oauth_state(f"native:{nonce}", "native") is not None

    def _encrypt(self, value: dict[str, Any]) -> bytes:
        return self._fernet.encrypt(json.dumps(value).encode())

    def _decrypt(self, value: bytes) -> dict[str, Any]:
        return json.loads(self._fernet.decrypt(value).decode())


def _connect_postgres(database_url: str) -> Any:
    import psycopg

    return psycopg.connect(database_url)


def create_session_store(
    database_url: str, encryption_key: str
) -> SqliteSessionStore | PostgresSessionStore:
    if database_url.startswith(("postgresql://", "postgres://")):
        return PostgresSessionStore(database_url, encryption_key)
    return SqliteSessionStore(database_url, encryption_key)
