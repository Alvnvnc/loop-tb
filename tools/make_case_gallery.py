#!/usr/bin/env python3
"""Bangun galeri kasus arsip untuk deployment statis (tanpa server).

Memilih 4 kasus showcase dari prediksi offline (satu per perilaku band:
TB→rujuk, normal→ragu, TB→ragu, normal→negatif bila ada), lalu memanggil API
lokal untuk merekam keluaran ensemble asli + heatmap, dan menyimpan gambar
tampilan. Output → web/public/cases/ (ikut ke static export / GitHub Pages).

Jalankan (API lokal harus hidup di :8000):
  .venv/bin/python tools/make_case_gallery.py
"""
from __future__ import annotations

import csv
import io
import json
import urllib.request
import uuid
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web/public/cases"
API = "http://localhost:8000"

TAU_LOW, TAU_HIGH, TAU_U = 0.0233, 0.0977, 0.25


def load(f: str, col: str) -> dict[str, float]:
    return {Path(r["path"]).stem: float(r[col]) for r in csv.DictReader(open(ROOT / f))}


def band_of(p: float, u: float) -> str:
    if u > TAU_U:
        return "ragu"
    if p >= TAU_HIGH:
        return "rujuk_prioritas"
    if p < TAU_LOW:
        return "negatif_skrining"
    return "ragu"


def infer(path: Path) -> dict:
    boundary = uuid.uuid4().hex
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{path.name}"\r\n'
        f"Content-Type: image/png\r\n\r\n"
    ).encode() + path.read_bytes() + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        f"{API}/predict", data=body, method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    pr = load("ml/runs/ssl_eval/preds_rad_dino.csv", "p")
    pd = load("ml/runs/ssl_eval/preds_dinov2.csv", "p")
    ps = load("ml/runs/eval_external_ens/preds.csv", "p_ens")

    man = json.loads((ROOT / "ml/data/artifacts/manifest.json").read_text())
    cands = []
    for it in man["external"]:
        stem = Path(it["path"]).stem
        if stem not in pr or stem not in pd or stem not in ps:
            continue
        import statistics
        u = statistics.pstdev([pr[stem], pd[stem], ps[stem]])
        cands.append({
            "stem": stem, "path": it["path"], "label": it["label"],
            "p": pr[stem], "u": u, "band": band_of(pr[stem], u),
        })

    def best(pred, key, rev=True):
        xs = [c for c in cands if pred(c)]
        xs.sort(key=key, reverse=rev)
        return xs[0] if xs else None

    picks = [
        best(lambda c: c["label"] == 1 and c["band"] == "rujuk_prioritas", lambda c: c["p"]),
        best(lambda c: c["label"] == 0 and c["band"] == "ragu", lambda c: c["u"]),
        best(lambda c: c["label"] == 1 and c["band"] == "ragu", lambda c: c["u"]),
        best(lambda c: c["label"] == 0 and c["band"] == "ragu", lambda c: c["u"], rev=False),
    ]
    picks = [p for p in picks if p]
    # dedupe bila ada pemilihan sama
    seen, uniq = set(), []
    for c in picks:
        if c["stem"] not in seen:
            seen.add(c["stem"])
            uniq.append(c)
    picks = uniq

    TITLES = [
        ("Kasus A — TB aktif", "Ensemble sepakat: prioritas rujukan hari ini."),
        ("Kasus B — normal dari RS asing", "Keluarga model tidak sepakat → sistem menahan keputusan."),
        ("Kasus C — TB, bukti tidak konklusif", "Bahkan untuk TB, ketidakpastian tinggi → pembacaan ulang oleh manusia."),
        ("Kasus D — normal, mendekati negatif", "Model cenderung rendah, tetapi ketidakpastian menjaga band ragu."),
    ]

    index = []
    for i, c in enumerate(picks):
        src = ROOT / c["path"]
        res = infer(src)
        cid = c["stem"].lower()
        # gambar tampilan (maks 900px, jpg)
        with Image.open(src) as im:
            im = im.convert("L")
            w, h = im.size
            sc = 900 / max(w, h)
            if sc < 1:
                im = im.resize((round(w * sc), round(h * sc)), Image.LANCZOS)
            buf = io.BytesIO()
            im.save(buf, format="JPEG", quality=88)
        (OUT / f"{cid}.jpg").write_bytes(buf.getvalue())
        payload = {**res, "case_id": cid, "source_image": src.name, "dataset": c["path"].split("/")[2]}
        (OUT / f"{cid}.json").write_text(json.dumps(payload))
        title, desc = TITLES[i] if i < len(TITLES) else (f"Kasus {cid}", "")
        index.append({
            "id": cid, "title": title, "desc": desc,
            "label": "TB" if c["label"] == 1 else "normal",
            "image": f"{cid}.jpg", "result": f"{cid}.json",
            "band": res["band"], "p": res["p_tb"], "u": res["uncertainty"],
        })
        print(f"{cid}: band={res['band']} p={res['p_tb']} u={res['uncertainty']} ({title})")

    (OUT / "index.json").write_text(json.dumps(index, indent=1))
    print("index ->", OUT / "index.json")


if __name__ == "__main__":
    main()