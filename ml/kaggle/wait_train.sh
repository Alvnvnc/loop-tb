#!/usr/bin/env bash
# Pantau kernel training Kaggle sampai selesai/gagal, lalu unduh output.
# Dipakai sebagai background job; menulis progres tiap 60 detik.
set -uo pipefail
SLUG="alvinreba/loop-tb-train-eb0-convnext-baseline"
OUT="ml/kaggle/out_train"

for i in $(seq 1 300); do
  s=$(kaggle kernels status "$SLUG" 2>&1 || true)
  echo "[$(date +%H:%M:%S)] $s"
  case "$s" in
    *COMPLETE*)
      echo "TRAIN COMPLETE — mengunduh output"
      kaggle kernels output "$SLUG" -p "$OUT" 2>&1 | tail -3
      echo "OUTPUT SIAP di $OUT"
      exit 0
      ;;
    *ERROR*|*CANCEL*)
      echo "TRAIN GAGAL — mengunduh log untuk diagnosis"
      kaggle kernels output "$SLUG" -p "$OUT" 2>&1 | tail -3 || true
      exit 1
      ;;
  esac
  sleep 60
done
echo "TIMEOUT setelah 5 jam"
exit 2