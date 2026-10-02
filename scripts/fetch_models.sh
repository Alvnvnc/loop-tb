#!/usr/bin/env bash
# Unduh artefak model dari GitHub Release `models-v1` ke lokasi yang diharapkan
# api/model_config.json dan ml/evaluate.py (ml/runs/...).
set -euo pipefail
REPO="${REPO:-Alvnvnc/loop-tb}"
TAG="${TAG:-models-v1}"
BASE="https://github.com/$REPO/releases/download/$TAG"

mkdir -p ml/runs/eb0 ml/runs/convnext ml/runs/linear_probe ml/runs/ssl_eval

fetch() { # $1 = nama file, $2 = tujuan
  if [ -f "$2" ]; then echo "skip (ada): $2"; return; fi
  echo "unduh $1 -> $2"
  curl -fL --retry 3 -o "$2" "$BASE/$1"
}

fetch eb0.pt            ml/runs/eb0/best.pt
fetch convnext.pt       ml/runs/convnext/best.pt
fetch linear_probe.pt   ml/runs/linear_probe/best.pt
fetch probe_rad_dino.npz ml/runs/ssl_eval/probe_rad_dino.npz
fetch probe_dinov2.npz   ml/runs/ssl_eval/probe_dinov2.npz

echo "Model siap. Jalankan API:"
echo "  .venv/bin/python -m uvicorn api.main:app --port 8000"
echo "  (atau LOOPTB_CONFIG=api/model_config_probe.json untuk probe DINOv2 saja)"