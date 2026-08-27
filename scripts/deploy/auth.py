"""Development auth user provisioning for an isolated deployment."""
from __future__ import annotations

import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def api_request(url: str, headers: dict[str, str], method: str = "GET", payload: dict | None = None) -> dict:
    request = Request(url, data=json.dumps(payload).encode() if payload is not None else None, method=method, headers=headers)
    try:
        with urlopen(request, timeout=10) as response:
            parsed = json.loads(response.read().decode())
    except (HTTPError, URLError, json.JSONDecodeError) as error:
        raise RuntimeError("Isolated Supabase Auth admin request failed") from error
    if not isinstance(parsed, dict):
        raise RuntimeError("Isolated Supabase Auth returned an invalid response")
    return parsed


def find_user(admin_users_url: str, headers: dict[str, str], email: str) -> dict | None:
    for page in range(1, 11):
        response = api_request(f"{admin_users_url}?{urlencode({'page': page, 'per_page': 1000})}", headers)
        users = response.get("users")
        if not isinstance(users, list):
            raise RuntimeError("Isolated Supabase Auth returned an invalid user list")
        for user in users:
            if isinstance(user, dict) and user.get("email") == email:
                return user
        if len(users) < 1000:
            return None
    raise RuntimeError("Isolated Supabase Auth user search exceeded its page limit")


def provision(auth_url: str, service_role_key: str, email: str, password: str) -> str:
    headers = {"apikey": service_role_key, "Authorization": f"Bearer {service_role_key}", "Content-Type": "application/json"}
    users_url = f"{auth_url.rstrip('/')}/admin/users"
    user = find_user(users_url, headers, email)
    attributes = {"password": password, "email_confirm": True}
    if user is None:
        result = api_request(users_url, headers, method="POST", payload={"email": email, **attributes})
        user = result.get("user", result)
    else:
        user_id = user.get("id")
        if not isinstance(user_id, str):
            raise RuntimeError("Isolated Supabase Auth returned a user without an ID")
        result = api_request(f"{users_url}/{user_id}", headers, method="PUT", payload=attributes)
        user = result.get("user", result)
    user_id = user.get("id") if isinstance(user, dict) else None
    if not isinstance(user_id, str):
        raise RuntimeError("Isolated Supabase Auth returned a user without an ID")
    return user_id
