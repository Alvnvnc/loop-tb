#!/usr/bin/env python3
"""Verifikasi UI v2: 3 viewport, console errors, overflow horizontal, tugas utama, toggle bahasa.

Jalankan dengan helper (web saja):
  python /home/alvn/.agents/skills/webapp-testing/scripts/with_server.py \
    --server "cd web && npm start -- --port 3210" --port 3210 \
    -- .venv/bin/python tools/ui_verify.py http://localhost:3210
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3210"
OUT = Path(".design/mobbin-stdir/run-01/proof")
OUT.mkdir(parents=True, exist_ok=True)

ROUTES = [("", "landing"), ("skrining", "skrining"), ("pasien", "pasien"), ("klinisi", "klinisi"), ("tentang", "tentang")]
VIEWPORTS = [("desktop", 1440, 900), ("tablet", 768, 1024), ("mobile", 390, 844)]


def main() -> None:
    report: dict = {"viewports": {}, "checks": {}, "consoleErrors": []}
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        for vp, w, h in VIEWPORTS:
            ctx = b.new_context(viewport={"width": w, "height": h}, device_scale_factor=1)
            page = ctx.new_page()
            errors: list[str] = []
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            for route, name in ROUTES:
                page.goto(f"{BASE}/{route}", wait_until="networkidle")
                page.wait_for_timeout(300)
                overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
                report["viewports"].setdefault(vp, {})[name] = {"overflowPx": overflow}
                if vp in ("desktop", "mobile"):
                    page.screenshot(path=str(OUT / f"{name}_{vp}.png"), full_page=(vp == "mobile"))
            report["consoleErrors"] += errors
            ctx.close()

        # tugas utama + toggle bahasa (mobile)
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        page = ctx.new_page()
        page.goto(f"{BASE}/skrining", wait_until="networkidle")
        page.wait_for_selector("text=Archive examples", timeout=30_000)
        page.click("text=Case B")
        page.wait_for_selector("text=Needs re-read", timeout=30_000)
        page.wait_for_timeout(400)
        page.screenshot(path=str(OUT / "main_task_archive_case_mobile.png"), full_page=True)
        report["checks"]["archiveCase"] = "passed"

        page.click('button:has-text("ID")')
        page.wait_for_selector("text=Contoh arsip", timeout=15_000)
        report["checks"]["switchToID"] = "passed"
        page.reload(wait_until="networkidle")
        page.wait_for_selector("text=Contoh arsip", timeout=15_000)
        report["checks"]["persistsAfterReload"] = "passed"
        page.screenshot(path=str(OUT / "after_lang_id_persist_mobile.png"), full_page=True)
        page.click('button:has-text("EN")')

        # fokus keyboard: Tab pertama harus masuk elemen interaktif
        page.keyboard.press("Tab")
        focused = page.evaluate("document.activeElement?.tagName")
        report["checks"]["keyboardFocus"] = focused
        ctx.close()
        b.close()
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    main()