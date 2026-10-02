#!/usr/bin/env python3
"""Hasilkan PDF submission: one-pager (dari HTML) + code PDF (dari repo).

Jalankan:
  .venv/bin/python tools/make_pdfs.py
"""
from __future__ import annotations

import html
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "submission"

CODE_GLOBS = [
    "ml/*.py",
    "ml/data/*.py",
    "ml/kaggle/**/*.py",
    "api/*.py",
    "api/*.json",
    "scripts/*.sh",
    "tools/*.py",
    "web/src/**/*.ts",
    "web/src/**/*.tsx",
    "web/src/**/*.css",
    "web/*.json",
    "web/*.ts",
    "docs/*.md",
]
EXCLUDE_PARTS = {"node_modules", ".next", "__pycache__", ".venv"}


def collect_files() -> list[Path]:
    files: list[Path] = []
    seen: set[Path] = set()
    for g in CODE_GLOBS:
        for p in sorted(ROOT.glob(g)):
            if not p.is_file() or any(part in EXCLUDE_PARTS for part in p.parts):
                continue
            if p in seen or p.suffix == ".png":
                continue
            seen.add(p)
            files.append(p.relative_to(ROOT))
    return files


def build_code_html(files: list[Path]) -> str:
    parts = [
        """<!DOCTYPE html><html><head><meta charset="utf-8"><title>SIGAP — Code</title>
<style>
@page { size: A4; margin: 14mm 12mm; }
body { font-family: "DejaVu Sans Mono", monospace; font-size: 8.4px; color: #14181d; }
h1 { font-family: sans-serif; font-size: 20px; margin-bottom: 6px; }
h2 { font-family: sans-serif; font-size: 12px; margin: 14px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 3px; }
.filetree { font-size: 9px; line-height: 1.5; margin-bottom: 10px; }
pre { white-space: pre-wrap; word-break: break-word; border: 1px solid #ddd; border-radius: 4px; padding: 6px 8px; margin-bottom: 10px; }
.filehead { font-family: sans-serif; font-weight: bold; font-size: 10px; margin: 14px 0 4px; page-break-before: always; }
</style></head><body>""",
        "<h1>SIGAP — complete code listing</h1>",
        "<p class='filetree'><b>Repository:</b> github.com/Alvnvnc/loop-tb — prototipe riset UnivaBio 2026.<br>"
        "Berisi: pipeline data (audit dedup), training, studi representasi SSL, evaluasi rigor, API, dan UI.</p>",
        "<h2>Daftar file</h2><div class='filetree'>" + "<br>".join(html.escape(str(f)) for f in files) + "</div>",
    ]
    for f in files:
        text = (ROOT / f).read_text(errors="ignore")
        parts.append(f"<div class='filehead'>{html.escape(str(f))}</div>")
        parts.append(f"<pre>{html.escape(text)}</pre>")
    parts.append("</body></html>")
    return "".join(parts)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1) One-pager
        page.goto((OUT / "onepager.html").as_uri(), wait_until="networkidle")
        page.pdf(path=str(OUT / "onepager.pdf"), format="A4", print_background=True,
                 margin={"top": "0", "right": "0", "bottom": "0", "left": "0"})
        print("onepager.pdf OK")

        # 2) Code PDF
        files = collect_files()
        code_html = build_code_html(files)
        tmp = Path("/tmp/opencode/code_listing.html")
        tmp.write_text(code_html)
        page.goto(tmp.as_uri(), wait_until="load")
        page.pdf(path=str(OUT / "code_listing.pdf"), format="A4", print_background=True)
        print(f"code_listing.pdf OK — {len(files)} file")

        browser.close()


if __name__ == "__main__":
    main()