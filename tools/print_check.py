#!/usr/bin/env python3
"""Uji tampilan cetak surat rujukan (print media emulation) — screenshot bukti.

Jalankan dengan helper server (web 3210 + api 8000):
  python /home/alvn/.agents/skills/webapp-testing/scripts/with_server.py \
    --server "cd web && npm start -- --port 3210" --port 3210 \
    --server ".venv/bin/python -m uvicorn api.main:app --port 8000" --port 8000 \
    -- .venv/bin/python tools/print_check.py
"""
from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path("submission/screenshots/referral_letter_print.png")
IMG = "data/raw/nlm/shenzhen/CXR_png/CHNCXR_0327_1.png"


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 794, "height": 1123}, device_scale_factor=2)
        page.goto("http://localhost:3210/skrining", wait_until="networkidle")
        page.set_input_files('input[type="file"]', IMG)
        page.fill('input[placeholder="mis. S-014"]', "S-014")
        page.fill('input[placeholder="34"]', "42")
        page.click("text=Analisis citra")
        page.wait_for_selector("text=Hasil analisis", timeout=120_000)
        page.emulate_media(media="print")
        page.wait_for_timeout(500)
        page.screenshot(path=str(OUT), full_page=True)
        print("print check ok ->", OUT)
        browser.close()


if __name__ == "__main__":
    main()