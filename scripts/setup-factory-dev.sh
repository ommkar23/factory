#!/usr/bin/env bash
# Idempotent Factory development bootstrap. Run from repository root.
set -Eeuo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$root"
command -v docker >/dev/null || { echo "Docker is required." >&2; exit 1; }
docker compose version >/dev/null

if [[ ! -f supabase/.env ]]; then
  cp supabase/.env.example supabase/.env
  (cd supabase && ./utils/generate-keys.sh --update-env >/dev/null 2>&1 && ./utils/add-new-auth-keys.sh --update-env >/dev/null 2>&1)
  python3 - <<PY
from pathlib import Path
p=Path("supabase/.env")
values={"SUPABASE_PUBLIC_URL":"http://localhost:8000","API_EXTERNAL_URL":"http://localhost:8000/auth/v1","SITE_URL":"http://localhost:3001","ADDITIONAL_REDIRECT_URLS":"http://localhost:3001,http://localhost:3002,http://localhost:3003"}
p.write_text("\n".join(values.get(line.split("=",1)[0], line) for line in p.read_text().splitlines())+"\n")
PY
  chmod 600 supabase/.env
fi

key=$(grep "^SUPABASE_PUBLISHABLE_KEY=" supabase/.env | cut -d= -f2-)
if [[ -z "$key" ]]; then
  key=$(grep "^ANON_KEY=" supabase/.env | cut -d= -f2-)
fi
[[ -n "$key" ]] || { echo "No local Supabase publishable or anon key is configured." >&2; exit 1; }
for app in home live-splash weather; do
  umask 077
  printf "FACTORY_SHARED_ORIGIN=false\nNEXT_PUBLIC_SUPABASE_URL=http://localhost:8000\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=%s\n" "$key" > "apps/$app/.env.local"
  chmod 600 "apps/$app/.env.local"
done
if [[ ! -f services/api/.env ]];
then
  umask 077
  session_key=$(python3 -c "import base64, secrets; print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())")
  printf "SUPABASE_URL=http://api-gw:8000\nSUPABASE_AUTHORIZATION_URL=http://localhost:8000\nSUPABASE_PUBLISHABLE_KEY=%s\nAUTH_PUBLIC_URL=http://localhost:3004\nAUTH_ALLOWED_RETURN_PATHS=/,/weather,/live-splash\nAUTH_SESSION_ENCRYPTION_KEY=%s\nAUTH_SESSION_DATABASE_URL=sqlite:////data/factory-api/sessions.db\n" "$key" "$session_key" > services/api/.env
  unset session_key
fi
ensure_api_env_value() {
  local name=$1
  local value=$2
  grep -q "^${name}=" services/api/.env || printf "%s=%s\n" "$name" "$value" >> services/api/.env
}
ensure_api_env_value DEV_AUTH_ENABLED true
ensure_api_env_value DEV_AUTH_EMAIL factory-development@example.test
if ! grep -q "^DEV_AUTH_PASSWORD=" services/api/.env; then
  ensure_api_env_value DEV_AUTH_PASSWORD "$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")"
fi
if ! grep -q "^DEV_AUTH_SECRET=" services/api/.env; then
  ensure_api_env_value DEV_AUTH_SECRET "$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")"
fi
chmod 600 services/api/.env
unset key

docker compose config >/dev/null
docker compose up -d --build
service_role_key=$(grep "^SERVICE_ROLE_KEY=" supabase/.env | cut -d= -f2-)
dev_auth_email=$(grep "^DEV_AUTH_EMAIL=" services/api/.env | cut -d= -f2-)
dev_auth_password=$(grep "^DEV_AUTH_PASSWORD=" services/api/.env | cut -d= -f2-)
provisioned=false
for _ in {1..30}; do
  if SUPABASE_AUTH_URL=http://127.0.0.1:8000/auth/v1 SUPABASE_SERVICE_ROLE_KEY="$service_role_key" DEV_AUTH_EMAIL="$dev_auth_email" DEV_AUTH_PASSWORD="$dev_auth_password" python3 scripts/provision-dev-auth-user.py; then
    provisioned=true
    break
  fi
  sleep 1
done
[[ "$provisioned" == true ]] || { echo "Local Supabase development user provisioning failed." >&2; exit 1; }
unset provisioned service_role_key dev_auth_email dev_auth_password
for volume in home-node-modules home-pnpm-cache live-splash-node-modules live-splash-pnpm-cache weather-node-modules weather-pnpm-cache; do
  docker volume create "factory-dev_${volume}" >/dev/null
  docker run --rm -v "factory-dev_${volume}:/v" alpine:3.22 chown -R 1001:1002 /v >/dev/null
done
docker compose up -d --force-recreate home live-splash weather

for _ in {1..30}; do
  if curl -fsS --max-time 5 http://127.0.0.1:3001/ >/dev/null && curl -fsS --max-time 5 http://127.0.0.1:3002/ >/dev/null && curl -fsS --max-time 5 http://127.0.0.1:3003/ >/dev/null; then
    echo "Factory development stack is ready."
    exit 0
  fi
  sleep 5
done

echo "Stack started but app readiness timed out; inspect: docker compose logs" >&2
exit 1
