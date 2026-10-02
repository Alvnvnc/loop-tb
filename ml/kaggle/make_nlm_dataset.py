#!/usr/bin/env python3
"""Siapkan dataset Kaggle privat: NLM CXR di-resize (max dim 512) + ClinicalReadings.

Dipisah dari data asli agar unggahan ringan (~150 MB) dan resolusi tetap cukup
untuk encoder SSL (DINOv2/RAD-DINO resize ke 518).
"""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

SRC = Path("data/raw/nlm")
DST = Path("ml/kaggle/nlm_dataset/nlm")


def main() -> None:
    n = 0
    for corpus in ("shenzhen", "montgomery"):
        out_dir = DST / corpus / "CXR_png"
        out_dir.mkdir(parents=True, exist_ok=True)
        for p in sorted((SRC / corpus / "CXR_png").glob("*.png")):
            with Image.open(p) as im:
                im = im.convert("L")
                w, h = im.size
                scale = 512 / max(w, h)
                if scale < 1:
                    im = im.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
                im.save(out_dir / (p.stem + ".jpg"), quality=92)
            n += 1
        readings = SRC / corpus / "ClinicalReadings"
        if readings.exists():
            out_r = DST / corpus / "ClinicalReadings"
            out_r.mkdir(parents=True, exist_ok=True)
            for f in readings.glob("*.txt"):
                shutil.copy(f, out_r / f.name)
    print(f"selesai: {n} citra → {DST}")


if __name__ == "__main__":
    main()