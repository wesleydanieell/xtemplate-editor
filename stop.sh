#!/usr/bin/env bash
set -euo pipefail
PORT="${XTEMPLATE_PORT:-8765}"
PIDFILE="${XDG_RUNTIME_DIR:-/tmp}/xtemplate-studio-${PORT}.pid"
if [[ ! -f "$PIDFILE" ]]; then
  echo "Nenhum PID do XTemplate Studio foi registrado em $PIDFILE."
  echo "Se o servidor foi iniciado manualmente, encerre o processo no terminal correspondente."
  exit 0
fi
PID="$(cat "$PIDFILE")"
if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  echo "Servidor XTemplate Studio encerrado (PID $PID)."
else
  echo "O processo $PID não está mais ativo."
fi
rm -f "$PIDFILE"
