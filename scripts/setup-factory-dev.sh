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
for app in home live-splash weather; do
  umask 077
  printf "AUTH_MODE=supabase\nFACTORY_SHARED_ORIGIN=false\nNEXT_PUBLIC_SUPABASE_URL=http://localhost:8000\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=%s\n" "$key" > "apps/$app/.env.local"
  chmod 600 "apps/$app/.env.local"
done
unset key

docker compose config >/dev/null
docker compose up -d --build
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
