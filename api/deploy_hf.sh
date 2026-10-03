#!/usr/bin/env bash
# Deploy SIGAP API ke Hugging Face Spaces (butuh HF token: env HF_TOKEN atau `hf auth login`).
# Space: docker SDK, port 7860. Encoder DINOv2 diunduh saat runtime (butuh internet Space).
set -euo pipefail
SPACE_NAME="${SPACE_NAME:-sigap-api}"
STAGE="/tmp/opencode/hf_space"

rm -rf "$STAGE" && mkdir -p "$STAGE/models"

# UI statis (Next export, API same-origin via path relatif)
( cd web && NEXT_EXPORT=1 NEXT_PUBLIC_API_URL="" npm run build )
cp -r web/out "$STAGE/static"

cp api/main.py api/requirements.txt api/model_config_space.json api/Dockerfile "$STAGE/"
mv "$STAGE/model_config_space.json" "$STAGE/model_config.json"
cp ml/runs/ssl_eval/probe_rad_dino.npz "$STAGE/models/probe_rad_dino.npz"
cp ml/runs/ssl_eval/probe_dinov2.npz "$STAGE/models/probe_dinov2.npz"
cp ml/runs/eb0/best.pt "$STAGE/models/eb0.pt"
cp ml/runs/convnext/best.pt "$STAGE/models/convnext.pt"

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
UI (Next.js static) + API satu server: halaman skrining, pendampingan pasien, ringkasan klinisi.
`POST /predict` (multipart `file`) → `{p_tb, uncertainty, band, heatmap_png_b64}`.
Bukan alat diagnosis — wajib konfirmasi tenaga kesehatan.
EOF

if [ "${STAGE_ONLY:-0}" = "1" ]; then
  echo "STAGE_ONLY=1 → staging siap di $STAGE (upload dilewati)."
  du -sh "$STAGE" "$STAGE/models"
  exit 0
fi

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