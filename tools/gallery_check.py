#!/usr/bin/env python3
"""Uji galeri contoh arsip: klik satu kasus → hasil tampil tanpa upload.

Jalankan dengan helper server (web 3210; API opsional):
  python /home/alvn/.agents/skills/webapp-testing/scripts/with_server.py \
    --server "cd web && npm start -- --port 3210" --port 3210 \
    -- .venv/bin/python tools/gallery_check.py http://localhost:3210
"""
from __future__ import annotations

import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3210"
OUT = Path("submission/screenshots/gallery_case_b.png")


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2).new_page()
        page.goto(f"{BASE}/skrining", wait_until="networkidle")
        page.wait_for_selector("text=Contoh arsip", timeout=30_000)
        page.click("text=Kasus B")
        page.wait_for_selector("text=Hasil analisis", timeout=30_000)
        page.wait_for_selector("text=Perlu pembacaan ulang", timeout=30_000)
        page.wait_for_timeout(600)
        page.screenshot(path=str(OUT), full_page=True)
        print("GALLERY CHECK OK —", OUT)
        browser.close()


if __name__ == "__main__":
    main()