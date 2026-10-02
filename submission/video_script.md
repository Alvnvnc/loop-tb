# Skrip video demo — SIGAP (target 2:45–3:00, narasi EN, UI ID)

> Prinsip: juri harus melihat (1) masalah nyata + angka, (2) hal yang benar-benar jalan, (3) kejujuran yang terdokumentasi. Rekaman layar lokal + slide angka.

## Shot list

**0:00–0:20 — Masalah (slide angka)**
NARASI: "Indonesia has the world's second-highest tuberculosis burden: about ten percent of all cases. Around two hundred thousand people each year transmit TB before ever being detected. The root cause is latency — the care loop moves slower than the disease."
VISUAL: peta/angka bersih; 200.000 vs 885.000 ditemukan; kredit WHO GTR 2025 / Kemenkes.

**0:20–0:50 — Apa itu SIGAP (landing page)**
NARASI: "SIGAP compresses that latency with a single calibrated risk state that drives screening, referral, and treatment support."
VISUAL: halaman landing → navigasi ke Skrining.

**0:50–1:50 — Demo alur skrining (rekaman layar)**
- Unggah X-ray contoh (pakai model live; fallback: mode peragaan — TAMPILKAN labelnya).
- Hasil: verdict "Ragu — perlu pembacaan ulang" + heatmap + p(TB) + dua ambang.
- Klik "Peta perhatian" ↔ "Citra asli".
- NARASI: "Notice the middle band — when evidence is insufficient, the system says so instead of forcing a decision. That's the calibration layer."
- Klik "Cetak surat rujukan" → tampilkan hasil cetak.

**1:50–2:20 — Loop pendampingan (rekaman layar)**
- Halaman Pasien → check-in "obat terlewat" + gejala → risiko naik → banner eskalasi muncul.
- NARASI: "The same risk state follows the patient home. Missed doses and symptoms raise the score and trigger escalation."

**2:20–2:45 — Rigor & kejujuran (slide tabel)**
NARASI: "Here's where we differ from most submissions. On an internal split, our model looks perfect — 0.98 to 0.9999 AUROC. On external hospitals it drops to around 0.68. We report both, we measured the dataset leakage ourselves — 19 training images were near-duplicates of the external test set; we removed them — and we benchmarked self-supervised chest X-ray representations to push the honest number higher. The system is designed around what the model cannot see."
VISUAL: tabel val vs eksternal + angka leak + tabel studi representasi.

**2:45–3:00 — Roadmap jujur (slide)**
NARASI: "What's next: prospective validation with puskesmas, per-site threshold calibration, cough audio, and SITB integration. SIGAP is a research triage prototype — built to make the loop honest and faster."
VISUAL: 3 bullet roadmap + repo link.

## Checklist produksi
- [ ] Rekaman layar (1920×1080, cursor halus) dari `npm run dev` + model live
- [ ] Slide angka (bisa pakai halaman /tentang + tabel dari docs/04)
- [ ] Musik bebas royalti + subtitle EN
- [ ] Upload YouTube (unlisted) → link ke Devpost
- [ ] Rekam ulang bagian yang berubah setelah model final dipilih