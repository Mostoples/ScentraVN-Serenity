#!/usr/bin/env bash
# =============================================================================
#  ScentraVN Serenity - Launcher PWA Offline (macOS / Linux)
#  Jalankan untuk menyajikan PWA di http://localhost:8000 dan membuka browser.
#  Tanpa internet. Memilih otomatis: Python3 (bawaan) -> Node -> PHP.
#  Pakai port lain:  ./serve-offline.sh 9000
# =============================================================================
set -u
cd "$(dirname "$0")"

PORT="${1:-8000}"
URL="http://localhost:${PORT}/"

open_browser() {
  if command -v open >/dev/null 2>&1; then open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  else echo "[ScentraVN] Buka manual di browser: $URL"; fi
}

echo ""
echo "[ScentraVN] Menyajikan PWA di $URL"
echo "[ScentraVN] Biarkan terminal ini TERBUKA. Tekan Ctrl+C untuk berhenti."
echo ""

# Buka browser ~1.5 dtk setelah server siap (di latar belakang).
( sleep 1.5; open_browser ) &

if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT" --bind 127.0.0.1
elif command -v python >/dev/null 2>&1; then
  exec python -m http.server "$PORT" --bind 127.0.0.1
elif command -v node >/dev/null 2>&1; then
  exec node serve-offline.js "$PORT"
elif command -v php >/dev/null 2>&1; then
  exec php -S "127.0.0.1:${PORT}"
else
  echo "[ScentraVN] Tidak menemukan Python3 / Node / PHP. Pasang salah satu lalu coba lagi."
  exit 1
fi
