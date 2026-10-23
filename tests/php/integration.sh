#!/usr/bin/env bash
# PHP yerleşik sunucusunu geçici bir özel dizinle başlatır ve integration.php'yi çalıştırır.
set -euo pipefail

PRIV="$(mktemp -d)"
export ARKOZ_PRIVATE_DIR="$PRIV"

php -S 127.0.0.1:8099 -t "$PWD" >/dev/null 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true; rm -rf "$PRIV"' EXIT

for _ in $(seq 1 100); do
  if curl -s -o /dev/null "http://127.0.0.1:8099/robots.txt"; then
    break
  fi
  sleep 0.2
done

php tests/php/integration.php "http://127.0.0.1:8099" "$PRIV"
