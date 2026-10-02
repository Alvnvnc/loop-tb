#!/usr/bin/env python3
"""Uji jalur deployment: API vs evaluasi offline + robustness kompresi JPEG.

- 60 citra eksternal (30 TB + 30 normal) dikirim ke POST /predict,
  dibandingkan dengan probabilitas offline (ml/runs/ssl_eval/preds_rad_dino.csv).
- 15 citra diuji sebagai PNG vs JPEG q85 (sensitivitas kompresi).

Jalankan dengan helper (API saja):
  python /home/alvn/.agents/skills/webapp-testing/scripts/with_server.py \
    --server ".venv/bin/python -m uvicorn api.main:app --port 8000" --port 8000 \
    -- .venv/bin/python tools/model_checks.py
"""
from __future__ import annotations

import csv
import io
import json
import random
import statistics
import urllib.request
import uuid
from pathlib import Path

from PIL import Image

API = "http://localhost:8000"
ROOT = Path(__file__).resolve().parent.parent
MANIFEST = json.loads((ROOT / "ml/data/artifacts/manifest.json").read_text())
OFFLINE = {Path(r["path"]).stem: float(r["p"]) for r in csv.DictReader((ROOT / "ml/runs/ssl_eval/preds_rad_dino.csv").open())}


def post_image(data: bytes, name: str) -> float:
    boundary = uuid.uuid4().hex
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{name}"\r\n'
        f"Content-Type: image/png\r\n\r\n"
    ).encode() + data + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        f"{API}/predict", data=body, method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        return float(json.loads(r.read())["p_tb"])


def pearson(a: list[float], b: list[float]) -> float:
    ma, mb = statistics.fmean(a), statistics.fmean(b)
    num = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    den = (sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b)) ** 0.5
    return num / den if den else float("nan")


def auroc(y: list[int], p: list[float]) -> float:
    pairs = sorted(zip(p, y))
    # rank-based AUROC (Mann–Whitney)
    ranks = [0.0] * len(pairs)
    i = 0
    while i < len(pairs):
        j = i
        while j + 1 < len(pairs) and pairs[j + 1][0] == pairs[i][0]:
            j += 1
        avg = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[k] = avg
        i = j + 1
    pos = sum(r for r, (_, lab) in zip(ranks, pairs) if lab == 1)
    n_pos = sum(1 for _, lab in pairs if lab == 1)
    n_neg = len(pairs) - n_pos
    return (pos - n_pos * (n_pos + 1) / 2) / (n_pos * n_neg)


def main() -> None:
    ext = MANIFEST["external"]
    rng = random.Random(42)
    tb = [it for it in ext if it["label"] == 1]
    neg = [it for it in ext if it["label"] == 0]
    sample = rng.sample(tb, 30) + rng.sample(neg, 30)
    rng.shuffle(sample)

    api_p, off_p, labels = [], [], []
    for it in sample:
        data = Path(it["path"]).read_bytes()
        p = post_image(data, Path(it["path"]).name)
        api_p.append(p)
        off_p.append(OFFLINE[Path(it["path"]).stem])
        labels.append(it["label"])

    diffs = [abs(a - b) for a, b in zip(api_p, off_p)]
    report = {
        "n": len(sample),
        "pearson_r_api_vs_offline": round(pearson(api_p, off_p), 4),
        "mean_abs_delta_p": round(statistics.fmean(diffs), 4),
        "max_abs_delta_p": round(max(diffs), 4),
        "auroc_api_sample": round(auroc(labels, api_p), 4),
        "auroc_offline_sample": round(auroc(labels, off_p), 4),
    }
    print("== konsistensi API vs offline ==")
    print(json.dumps(report, indent=1))

    # robustness kompresi
    jdiffs = []
    for it in sample[:15]:
        img = Image.open(ROOT / it["path"]).convert("L")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        p_jpg = post_image(buf.getvalue(), "x.jpg")
        p_png = post_image((ROOT / it["path"]).read_bytes(), Path(it["path"]).name)
        jdiffs.append(abs(p_jpg - p_png))
    report["jpeg_q85_mean_abs_delta_p"] = round(statistics.fmean(jdiffs), 4)
    report["jpeg_q85_max_abs_delta_p"] = round(max(jdiffs), 4)
    print("== robustness JPEG q85 ==")
    print(f"mean|Δp|={report['jpeg_q85_mean_abs_delta_p']}  max|Δp|={report['jpeg_q85_max_abs_delta_p']}")

    out = ROOT / "ml/runs/deploy_checks.json"
    out.write_text(json.dumps(report, indent=1))
    print("saved:", out)


if __name__ == "__main__":
    main()