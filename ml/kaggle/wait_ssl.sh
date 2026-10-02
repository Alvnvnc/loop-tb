#!/usr/bin/env bash
# Pantau kernel ekstraksi SSL sampai selesai/gagal, lalu unduh embedding.
set -uo pipefail
SLUG="alvinreba/loop-tb-ssl-extract"
OUT="ml/kaggle/out_ssl"

for i in $(seq 1 120); do
  s=$(kaggle kernels status "$SLUG" 2>&1 || true)
  echo "[$(date +%H:%M:%S)] $s"
  case "$s" in
    *COMPLETE*)
      echo "SSL EXTRACT COMPLETE — mengunduh"
      kaggle kernels output "$SLUG" -p "$OUT" 2>&1 | tail -3
      echo "EMBEDDING SIAP di $OUT"
      exit 0
      ;;
    *ERROR*|*CANCEL*)
      echo "SSL EXTRACT GAGAL — unduh log"
      kaggle kernels output "$SLUG" -p "$OUT" 2>&1 | tail -3 || true
      exit 1
      ;;
  esac
  sleep 60
done
echo "TIMEOUT"
exit 2