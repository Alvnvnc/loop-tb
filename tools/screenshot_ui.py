#!/usr/bin/env python3
"""QA visual + screenshot semua halaman SIGAP (mobile & desktop).

Jalankan lewat helper server (lihat ml/kaggle/README atau riwayat commit):
  python /home/alvn/.agents/skills/webapp-testing/scripts/with_server.py \
    --server "cd web && npm run dev -- --port 3210" --port 3210 \
    -- .venv/bin/python tools/screenshot_ui.py http://localhost:3210
"""
from __future__ import annotations

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3210"
OUT = Path("submission/screenshots")
OUT.mkdir(parents=True, exist_ok=True)

ROUTES = [
    ("", "landing"),
    ("skrining", "skrining"),
    ("pasien", "pasien"),
    ("klinisi", "klinisi"),
    ("tentang", "tentang"),
]
VIEWPORTS = [("mobile", 390, 844), ("desktop", 1280, 900)]


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for vp_name, w, h in VIEWPORTS:
            ctx = browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=2)
            page = ctx.new_page()
            console_errors: list[str] = []
            page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
            for route, name in ROUTES:
                page.goto(f"{BASE}/{route}", wait_until="networkidle")
                page.wait_for_timeout(400)
                page.screenshot(path=str(OUT / f"{name}_{vp_name}.png"), full_page=True)
                print(f"[ok] {vp_name:7s} {name}")
            if console_errors:
                print(f"[warn] console errors ({vp_name}): {console_errors[:5]}")
            ctx.close()
        browser.close()
    print(f"SCREENSHOTS -> {OUT}")


if __name__ == "__main__":
    main()