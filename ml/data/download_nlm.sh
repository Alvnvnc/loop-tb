#!/usr/bin/env bash
# Unduh dataset NLM (Shenzhen + Montgomery) dari bucket publik resmi:
# https://data.lhncbc.nlm.nih.gov/public/Tuberculosis-Chest-X-ray-Datasets/
# Termasuk ClinicalReadings (metadata usia/jenis kelamin untuk analisis subgrup).
set -uo pipefail
BASE="https://data.lhncbc.nlm.nih.gov/public/Tuberculosis-Chest-X-ray-Datasets"
RAW="${1:-data/raw/nlm}"

fetch_tree() { # $1 = path setelah BASE, $2 = folder tujuan
  local s3path="$1" out="$RAW/$2"
  mkdir -p "$out"
  local keys
  keys=$(curl -sf "$BASE/$s3path/index.json" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for c in d.get('Contents',[]):
    k=c['Key']
    if k.endswith('index.html') or k.endswith('index.json'):
        continue
    print(k.split('/')[-1])
" 2>/dev/null) || { echo "warn: index tidak terbaca: $s3path"; return 0; }
  echo "$keys" | grep -v '^$' | xargs -P 16 -I {} curl -sf "$BASE/$s3path/{}" -o "$out/{}" || echo "warn: sebagian gagal: $s3path"
}

fetch_tree "Shenzhen-Hospital-CXR-Set/CXR_png"                        "shenzhen/CXR_png"
fetch_tree "Shenzhen-Hospital-CXR-Set/ClinicalReadings"               "shenzhen/ClinicalReadings"
fetch_tree "Montgomery-County-CXR-Set/MontgomerySet/CXR_png"          "montgomery/CXR_png"
fetch_tree "Montgomery-County-CXR-Set/MontgomerySet/ClinicalReadings" "montgomery/ClinicalReadings"

echo "NLM selesai -> $RAW"
echo "shenzhen images:   $(ls "$RAW"/shenzhen/CXR_png/*.png 2>/dev/null | wc -l)"
echo "montgomery images: $(ls "$RAW"/montgomery/CXR_png/*.png 2>/dev/null | wc -l)"