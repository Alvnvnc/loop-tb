#!/usr/bin/env python3
"""Screenshot halaman klinisi dalam keadaan TERISI (seed localStorage) — desktop & mobile.

  .venv/bin/python tools/klinisi_shot.py <BASE_URL>
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3210"
OUT = Path("submission/screenshots")
CASE = [
    {
        "id": "seed-1",
        "date": "2026-10-03T08:00:00.000Z",
        "name": "S-014",
        "age": "42",
        "sex": "L",
        "p": 0.9937,
        "band": "rujuk_prioritas",
        "history": [
            {"date": "2026-10-04T08:00:00.000Z", "med": True, "symptoms": 1, "danger": []},
            {"date": "2026-10-03T08:00:00.000Z", "med": False, "symptoms": 2, "danger": ["Shortness of breath"]},
        ],
    }
]


def main() -> None:
    seed = f"localStorage.setItem('sigap.cases', {json.dumps(json.dumps(CASE))});"
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        for vp, w, h, ds in (("desktop", 1440, 900, 1), ("mobile", 390, 844, 2)):
            ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=ds)
            ctx.add_init_script(seed)
            page = ctx.new_page()
            page.goto(f"{BASE}/klinisi", wait_until="networkidle")
            page.wait_for_selector("text=Clinician summary", timeout=30_000)
            page.wait_for_selector("text=S-014", timeout=15_000)
            page.wait_for_timeout(400)
            page.screenshot(path=str(OUT / f"klinisi_filled_{vp}.png"), full_page=True)
            print("ok", vp)
            ctx.close()
        b.close()
    print("KLINISI SHOT DONE")


if __name__ == "__main__":
    main()