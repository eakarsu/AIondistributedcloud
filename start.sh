#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[[ -f "$ROOT/.env" ]] || { echo "Missing .env; copy .env.example." >&2; exit 1; }
set -a
. "$ROOT/.env"
set +a
BACKEND_PORT="${BACKEND_PORT:?BACKEND_PORT is required}"
FRONTEND_PORT="${FRONTEND_PORT:?FRONTEND_PORT is required}"
[[ "$BACKEND_PORT" != "$FRONTEND_PORT" ]] || { echo "Backend and frontend ports must differ." >&2; exit 1; }
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
: "${CLOUD_WEBHOOK_SECRET:?CLOUD_WEBHOOK_SECRET is required}"
: "${OPENROUTER_API_KEY:?OPENROUTER_API_KEY is required}"
: "${OPENROUTER_MODEL:?OPENROUTER_MODEL is required}"
[[ "${OPENROUTER_BASE_URL:-}" == "https://openrouter.ai/api/v1" ]] || { echo "OPENROUTER_BASE_URL must be https://openrouter.ai/api/v1." >&2; exit 1; }
[[ "${ALLOW_SCHEMA_MIGRATION:-}" == true ]] || { echo "ALLOW_SCHEMA_MIGRATION=true is required." >&2; exit 1; }
for directory in "$ROOT/backend/node_modules" "$ROOT/frontend/node_modules"; do [[ -d "$directory" ]] || { echo "Missing $directory; install dependencies explicitly." >&2; exit 1; }; done
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then echo "Port $port is occupied; no process was changed." >&2; exit 1; fi; done
(cd "$ROOT/backend" && node scripts/prepare-runtime.js)
(cd "$ROOT/backend" && BACKEND_PORT="$BACKEND_PORT" npm start) & backend_pid=$!
(cd "$ROOT/frontend" && HOST=127.0.0.1 PORT="$FRONTEND_PORT" REACT_APP_BACKEND_URL="http://127.0.0.1:$BACKEND_PORT" BROWSER=none npm start) & frontend_pid=$!
cleanup(){ kill "$backend_pid" "$frontend_pid" 2>/dev/null || true; wait "$backend_pid" "$frontend_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
wait "$backend_pid" "$frontend_pid"
