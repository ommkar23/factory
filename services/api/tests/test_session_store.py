from pathlib import Path

from factory_api import session_store


def test_state_store_factory_selects_postgresql_store() -> None:
    assert isinstance(session_store.create_session_store("postgresql://factory:***@database.example/factory", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="), session_store.PostgresSessionStore)


def test_state_store_encrypts_and_consumes_browser_pkce_state_once(tmp_path: Path) -> None:
    database_url = "sqlite:///" + str(tmp_path / Path("states.db"))
    store = session_store.SqliteSessionStore(database_url, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
    store.store_oauth_state("state", "verifier", "/weather", "binding")
    assert store.consume_oauth_state("state", "binding").next_path == "/weather"
    assert store.consume_oauth_state("state", "binding") is None
    assert not hasattr(store, "create_session")


def test_state_store_consumes_native_challenge_once(tmp_path: Path) -> None:
    database_url = "sqlite:///" + str(tmp_path / Path("states.db"))
    store = session_store.SqliteSessionStore(database_url, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
    store.store_native_challenge("nonce")
    assert store.consume_native_challenge("nonce") is True
    assert store.consume_native_challenge("nonce") is False
