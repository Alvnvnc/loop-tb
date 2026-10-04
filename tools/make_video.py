#!/usr/bin/env python3
"""Produksi video demo SIGAP secara otomatis.

Tahapan: render slide → rekam screencast (Playwright) → sintesis narasi (Piper TTS)
→ rakit dengan ffmpeg → submission/sigap_demo.mp4.

Jalankan lewat helper (web 3210 + api 8000):
  python /home/alvn/.agents/skills/webapp-testing/scripts/with_server.py \
    --server "cd web && npm start -- --port 3210" --port 3210 \
    --server ".venv/bin/python -m uvicorn api.main:app --port 8000" --port 8000 \
    -- .venv/bin/python tools/make_video.py
"""
from __future__ import annotations

import os
import subprocess
import wave
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "submission" / "video_assets"
ASSETS.mkdir(parents=True, exist_ok=True)
FINAL = ROOT / "submission" / "sigap_demo.mp4"
VOICE_MODEL = str(Path.home() / ".cache/piper/en/en_US/lessac/medium/en_US-lessac-medium.onnx")
BASE = "http://localhost:3210"
W, H = 1920, 1080

SLIDE_CSS = """
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1920px; height:1080px; background:#0b0f13; color:#e9e7e0;
         font-family:'Plus Jakarta Sans',sans-serif; display:flex; align-items:center; }
  .pad { padding: 0 140px; width:100%; }
  h1 { font-size:96px; font-weight:800; letter-spacing:-0.03em; line-height:1.04; }
  p  { font-size:38px; line-height:1.45; color:rgba(233,231,224,.85); margin-top:36px; max-width:1500px; }
  .small { font-size:26px; color:rgba(233,231,224,.55); margin-top:44px; }
  .accent { color:#ee8b7e; } .defer { color:#e5b95c; } .clear { color:#83c7a4; }
  table { border-collapse:collapse; margin-top:40px; font-size:34px; }
  td, th { text-align:left; padding:14px 28px 14px 0; border-bottom:1px solid rgba(233,231,224,.18); }
  th { font-size:26px; color:rgba(233,231,224,.55); font-weight:600; }
  .num { font-variant-numeric: tabular-nums; font-weight:800; }
</style>"""

SLIDES = {
    "slide_problem": f"""{SLIDE_CSS}<div class="pad">
      <h1>≈200,000 people a year<br>transmit TB <span class="accent">before ever being detected</span>.</h1>
      <p>Indonesia carries 10% of the world's TB burden. The care loop — detect, refer, treat, monitor —
         moves slower than the disease transmits.</p>
      <div class="small">Source: WHO Global TB Report 2025 · Kemenkes 2024</div></div>""",
    "slide_solution": f"""{SLIDE_CSS}<div class="pad">
      <h1>One calibrated risk state.<br>Three interfaces.</h1>
      <p><b>Screen</b> — CXR triage with a <span class="defer">deferral band</span>. &nbsp;
         <b>Refer</b> — action band + printable referral letter. &nbsp;
         <b>Support</b> — adherence loop with escalation.</p>
      <p>When model families disagree, SIGAP says <i>“uncertain — human re-read”</i> instead of forcing a verdict.</p></div>""",
    "slide_evidence": f"""{SLIDE_CSS}<div class="pad">
      <h1>We report the number most projects hide.</h1>
      <table>
        <tr><th>Evaluation</th><th>AUROC</th><th>sens@spec90</th></tr>
        <tr><td>Internal random split <i>(the illusion)</i></td><td class="num">0.98 – 0.9999</td><td class="num">—</td></tr>
        <tr><td>External hospitals · supervised fine-tune</td><td class="num">0.675</td><td class="num">0.27</td></tr>
        <tr><td><b>External · RAD-DINO self-supervised probe (final)</b></td><td class="num clear">0.887</td><td class="num clear">0.71</td></tr>
      </table>
      <div class="small">Data audit removed 338 duplicate images and 19 training images that leaked into the external test set.</div></div>""",
    "slide_close": f"""{SLIDE_CSS}<div class="pad">
      <h1>SIGAP — screen faster<br>than the disease spreads.</h1>
      <p>Research triage prototype — not a diagnostic device. WHO sensitivity target not yet met; reported as-is.
         Next: prospective validation, per-site calibration, cough audio.</p>
      <div class="small">Code, frozen splits &amp; evaluation: github.com/Alvnvnc/loop-tb</div></div>""",
}

# (jenis, id, teks narasi)
SEGMENTS = [
    ("slide", "slide_problem",
     "Indonesia carries ten percent of the world's tuberculosis burden. Around two hundred thousand people "
     "each year transmit TB before ever being detected. The root cause is latency. The care loop moves "
     "slower than the disease."),
    ("slide", "slide_solution",
     "SIGAP compresses that latency with one calibrated risk state. It drives screening, referral, and "
     "treatment support. And when model families disagree, it says so, instead of forcing a decision."),
    ("clip", "clip_tb",
     "A health worker uploads a chest X-ray. For a real TB case, the model families agree: refer today, "
     "with a referral letter for GeneXpert confirmation. The attention map shows where the model looked."),
    ("clip", "clip_normal",
     "For a normal X-ray from an unseen hospital, the families disagree — so SIGAP answers: uncertain, "
     "human re-read. That is the deferral band doing its job on a case the model should not decide."),
    ("clip", "clip_pasien",
     "The same risk state follows the patient home. Missed doses and symptoms raise the score and trigger "
     "escalation, so the loop keeps moving until the patient is cured."),
    ("slide", "slide_evidence",
     "Here is the evidence, honestly. On an internal split the model looks perfect. On external hospitals, "
     "supervised fine-tuning falls to zero point six eight AUROC. Our final model, a self-supervised chest "
     "X-ray representation called RAD-DINO, holds zero point eight nine. We also removed nineteen training "
     "images that had leaked into the test set."),
    ("slide", "slide_close",
     "This is a research triage prototype, not a diagnostic device. The WHO sensitivity target is not met "
     "yet, and we report that. Next steps: prospective validation, per-site threshold calibration, and "
     "cough audio. SIGAP — screen faster than the disease spreads."),
]


def sh(cmd: list[str], **kw) -> None:
    subprocess.run(cmd, check=True, **kw)


def wav_duration(p: Path) -> float:
    with wave.open(str(p)) as w:
        return w.getnframes() / w.getframerate()


def render_slides() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": W, "height": H, "device_scale_factor": 1})
        for name, html in SLIDES.items():
            tmp = ASSETS / f"{name}.html"
            tmp.write_text(f"<!DOCTYPE html><html><head><meta charset='utf-8'></head><body>{html}</body></html>")
            page.goto(tmp.resolve().as_uri(), wait_until="networkidle")
            page.wait_for_timeout(400)
            page.screenshot(path=str(ASSETS / f"{name}.png"))
            print("slide:", name)
        browser.close()


def record_clips() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        def new_ctx(tag: str):
            return browser.new_context(
                viewport={"width": W, "height": H},
                record_video_dir=str(ASSETS / "raw"),
                record_video_size={"width": W, "height": H},
            )

        # --- clip TB ---
        ctx = new_ctx("tb")
        page = ctx.new_page()
        page.goto(f"{BASE}/skrining", wait_until="networkidle")
        page.wait_for_timeout(1200)
        page.set_input_files('input[type="file"]', str(ROOT / "data/raw/nlm/shenzhen/CXR_png/CHNCXR_0327_1.png"))
        page.fill('input[placeholder="e.g. S-014"]', "S-014")
        page.wait_for_timeout(800)
        page.click("text=Analyze image")
        page.wait_for_selector("text=Analysis result", timeout=120_000)
        page.wait_for_timeout(2500)
        page.click("text=Original")
        page.wait_for_timeout(1400)
        page.click("text=Attention map")
        page.wait_for_timeout(1200)
        page.mouse.wheel(0, 420)
        page.wait_for_timeout(1400)
        video = page.video
        ctx.close()
        video.save_as(ASSETS / "clip_tb.webm")
        print("clip_tb ok")

        # --- clip normal ---
        ctx = new_ctx("normal")
        page = ctx.new_page()
        page.goto(f"{BASE}/skrining", wait_until="networkidle")
        page.wait_for_timeout(900)
        page.set_input_files('input[type="file"]', str(ROOT / "data/raw/nlm/shenzhen/CXR_png/CHNCXR_0001_0.png"))
        page.fill('input[placeholder="e.g. S-014"]', "S-015")
        page.click("text=Analyze image")
        page.wait_for_selector("text=Analysis result", timeout=120_000)
        page.wait_for_timeout(3200)
        page.mouse.wheel(0, 380)
        page.wait_for_timeout(1600)
        video = page.video
        ctx.close()
        video.save_as(ASSETS / "clip_normal.webm")
        print("clip_normal ok")

        # --- clip pasien ---
        ctx = new_ctx("pasien")
        page = ctx.new_page()
        page.goto(f"{BASE}/pasien", wait_until="networkidle")
        page.wait_for_timeout(1200)
        page.locator('input[type="checkbox"]').first.click()  # batalkan "minum obat"
        page.select_option("select", "2")
        page.wait_for_timeout(700)
        page.click("text=Save check-in")
        page.wait_for_timeout(2600)
        page.mouse.wheel(0, 300)
        page.wait_for_timeout(1400)
        video = page.video
        ctx.close()
        video.save_as(ASSETS / "clip_pasien.webm")
        print("clip_pasien ok")

        browser.close()


def narrate() -> list[Path]:
    from piper import PiperVoice

    voice = PiperVoice.load(VOICE_MODEL)
    wavs = []
    for i, (_, _, text) in enumerate(SEGMENTS):
        w = ASSETS / f"seg{i}.wav"
        with wave.open(str(w), "wb") as f:
            voice.synthesize_wav(text, f)
        wavs.append(w)
        print(f"narasi seg{i}: {wav_duration(w):.1f}s")
    return wavs


def clip_duration(p: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


def assemble(wavs: list[Path]) -> None:
    parts = []
    for i, ((kind, ident, _), wav) in enumerate(zip(SEGMENTS, wavs)):
        dur = wav_duration(wav) + 0.6
        out = ASSETS / f"part{i}.mp4"
        if kind == "slide":
            sh(["ffmpeg", "-y", "-loglevel", "error",
                "-loop", "1", "-i", str(ASSETS / f"{ident}.png"),
                "-i", str(wav),
                "-af", "apad=pad_dur=0.6",
                "-t", f"{dur:.2f}",
                "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20",
                "-c:a", "aac", "-ar", "44100", "-ac", "2", str(out)])
        else:
            clip = ASSETS / f"{ident}.webm"
            cd = clip_duration(clip)
            pad = max(0.0, dur - cd)
            vf = f"tpad=stop_mode=clone:stop_duration={pad:.2f},scale={W}:{H},fps=30,format=yuv420p"
            sh(["ffmpeg", "-y", "-loglevel", "error",
                "-i", str(clip), "-i", str(wav),
                "-filter_complex", f"[0:v]{vf}[v]",
                "-map", "[v]", "-map", "1:a",
                "-af", "apad=pad_dur=0.6",
                "-t", f"{dur:.2f}",
                "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                "-c:a", "aac", "-ar", "44100", "-ac", "2", str(out)])
        parts.append(out)
        print(f"part{i} ok ({kind}:{ident}, {dur:.1f}s)")

    lst = ASSETS / "concat.txt"
    lst.write_text("".join(f"file '{p.name}'\n" for p in parts))
    sh(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
        "-i", str(lst), "-c", "copy", str(FINAL)])
    print("FINAL:", FINAL, f"({clip_duration(FINAL):.1f}s)")


def main() -> None:
    force = os.environ.get("FORCE", "0") == "1"
    need_slides = force or not all((ASSETS / f"{k}.png").exists() for k in SLIDES)
    need_clips = force or not all((ASSETS / f"{n}.webm").exists() for n in ("clip_tb", "clip_normal", "clip_pasien"))
    if need_slides:
        render_slides()
    else:
        print("slides: skip (ada)")
    if need_clips:
        record_clips()
    else:
        print("clips: skip (ada)")
    wavs = narrate()
    assemble(wavs)


if __name__ == "__main__":
    main()