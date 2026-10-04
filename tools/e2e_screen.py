#!/usr/bin/env python3
"""Uji integrasi UI+API: unggah citra X-ray lewat halaman /skrining, ambil screenshot hasil.

Menjalankan dua pass: mobile (390×844) untuk kedua kasus dan desktop (1440×900)
untuk kasus TB — bukti workspace web-first.

Jalankan dengan helper server (web 3210 + api 8000):
  python /home/alvn/.agents/skills/webapp-testing/scripts/with_server.py \
    --server "cd web && npm start -- --port 3210" --port 3210 \
    --server ".venv/bin/python -m uvicorn api.main:app --port 8000" --port 8000 \
    -- .venv/bin/python tools/e2e_screen.py
"""
from __future__ import annotations

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3210"
OUT = Path("submission/screenshots")
OUT.mkdir(parents=True, exist_ok=True)

CASES = [
    ("data/raw/nlm/shenzhen/CXR_png/CHNCXR_0327_1.png", "tb", "S-014"),
    ("data/raw/nlm/shenzhen/CXR_png/CHNCXR_0001_0.png", "normal", "S-015"),
]


def run_case(page, img: str, tag: str, pid: str, suffix: str) -> None:
    page.goto(f"{BASE}/skrining", wait_until="networkidle")
    page.set_input_files('input[type="file"]', img)
    page.fill('input[placeholder="e.g. S-014"]', pid)
    page.fill('input[placeholder="34"]', "42")
    page.click("text=Analyze image")
    page.wait_for_selector("text=Analysis result", timeout=120_000)
    page.wait_for_timeout(600)
    page.screenshot(path=str(OUT / f"skrining_hasil_{tag}_{suffix}.png"), full_page=True)
    print(f"[ok] {tag} ({suffix}): {img}")


def main() -> None:
    passes = [
        ("mobile", {"width": 390, "height": 844}, 2, CASES),
        ("desktop", {"width": 1440, "height": 900}, 1, CASES[:1]),
    ]
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for suffix, vp, ds, cases in passes:
            ctx = browser.new_context(viewport=vp, device_scale_factor=ds)
            page = ctx.new_page()
            console: list[str] = []
            page.on(
                "console",
                lambda m: console.append(f"{m.type}: {m.text}") if m.type == "error" else None,
            )
            for img, tag, pid in cases:
                if not Path(img).exists():
                    print("[skip]", img)
                    continue
                run_case(page, img, tag, pid, suffix)
            if console:
                print(f"[{suffix} console errors]", console[:6])
            ctx.close()
        browser.close()
    print("E2E SCREENSHOTS DONE")


if __name__ == "__main__":
    main()