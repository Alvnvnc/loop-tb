#!/usr/bin/env bash
# Unduh dataset training dari Kaggle (butuh ~/.kaggle/kaggle.json).
# Dataset: TBX11K (train utama) + Rahman composite (train, WAJIB dedup provenance).
set -euo pipefail
RAW="${1:-data/raw}"
mkdir -p "$RAW"

kaggle datasets download -d vbookshelf/tbx11k-simplified -p "$RAW" --unzip
kaggle datasets download -d tawsifurrahman/tuberculosis-tb-chest-xray-dataset -p "$RAW" --unzip

echo "Kaggle selesai -> $RAW"
find "$RAW" -maxdepth 3 -type d | head -30