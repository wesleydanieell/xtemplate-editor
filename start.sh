#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
HOST="127.0.0.1"
PORT="${XTEMPLATE_PORT:-8765}"
URL="http://${HOST}:${PORT}/"
PIDFILE="${XDG_RUNTIME_DIR:-/tmp}/xtemplate-studio-${PORT}.pid"
LOGFILE="${XDG_CACHE_HOME:-$HOME/.cache}/xtemplate-studio-${PORT}.log"
mkdir -p "$(dirname "$LOGFILE")"
if curl --silent --fail "$URL" >/dev/null 2>&1; then
  echo "XTemplate Studio já está disponível em $URL"
  xdg-open "$URL" >/dev/null 2>&1 || true
  exit 0
fi
nohup python3 -m http.server "$PORT" --bind "$HOST" --directory "$ROOT" >"$LOGFILE" 2>&1 </dev/null &
echo "$!" >"$PIDFILE"
for _ in $(seq 1 30); do
  if curl --silent --fail "$URL" >/dev/null 2>&1; then
    echo "XTemplate Studio iniciado em $URL"
    xdg-open "$URL" >/dev/null 2>&1 || true
    exit 0
  fi
  sleep 0.2
done
echo "Não foi possível iniciar o servidor. Consulte: $LOGFILE" >&2
exit 1
