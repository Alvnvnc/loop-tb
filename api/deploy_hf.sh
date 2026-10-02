#!/usr/bin/env bash
# Deploy SIGAP API ke Hugging Face Spaces (butuh HF token: env HF_TOKEN atau `hf auth login`).
# Space: docker SDK, port 7860. Encoder DINOv2 diunduh saat runtime (butuh internet Space).
set -euo pipefail
SPACE_NAME="${SPACE_NAME:-sigap-api}"
STAGE="/tmp/opencode/hf_space"

rm -rf "$STAGE" && mkdir -p "$STAGE/models"
cp api/main.py api/requirements.txt api/model_config_space.json "$STAGE/"
mv "$STAGE/model_config_space.json" "$STAGE/model_config.json"
cp ml/runs/ssl_eval/probe_rad_dino.npz ml/runs/ssl_eval/probe_dinov2.npz ml/runs/eb0/best.pt ml/runs/convnext/best.pt "$STAGE/models/"

cat > "$STAGE/README.md" <<'EOF'
---
title: SIGAP API
emoji: 🩺
colorFrom: blue
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

API triase skrining TB (prototipe riset SIGAP, UnivaBio 2026).
`POST /predict` (multipart `file`) → `{p_tb, uncertainty, band, heatmap_png_b64}`.
Bukan alat diagnosis — wajib konfirmasi tenaga kesehatan.
EOF

.venv/bin/python - "$SPACE_NAME" "$STAGE" <<'PY'
import sys
from huggingface_hub import HfApi

name, stage = sys.argv[1], sys.argv[2]
api = HfApi()
user = api.whoami()["name"]
repo_id = f"{user}/{name}"
api.create_repo(repo_id, repo_type="space", space_sdk="docker", exist_ok=True)
api.upload_folder(repo_id=repo_id, repo_type="space", folder_path=stage)
print(f"DEPLOYED: https://huggingface.co/spaces/{repo_id}")
PY