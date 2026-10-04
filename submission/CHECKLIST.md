# Checklist Submission — UnivaBio 2026

Deadline platform: **13 Okt 2026 23:45 EDT** · halaman Rules (basi) menulis 7 Okt → target internal: **submit ≤ 7 Okt** (buffer). Panitia: biocataalysis@gmail.com.

## Requirement resmi → status

| # | Requirement | Artefak | Status |
|---|---|---|---|
| 1 | Project (website/app/prototipe dengan interaksi user) | `web/` (5 halaman) + `api/` (ensemble + Grad-CAM + band) | ✅ jalan & teruji e2e |
| 2 | Demo video (tujuan + fitur + interaksi) | `submission/sigap_demo.mp4` — **1:36, 1080p, narasi EN, UI v3 web-first** (klip 1920×1080 dari deployment final) | ✅ |
| 3 | One Page Project Description (PDF) | `submission/onepager.pdf` | ✅ |
| 4 | GitHub repo / Code PDF | repo publik + `submission/code_listing.pdf` | ✅ |

## Kualitas submission (rubrik internal)

- [x] Angka beban penyakit dengan sumber (WHO GTR 2025, Kemenkes 2024)
- [x] Audit data terukur (338 dup internal + 19 kebocoran cross-corpus)
- [x] Evaluasi eksternal + CI + kalibrasi + subgrup (jujur: val vs eksternal)
- [x] Studi representasi (supervised vs DINOv2 vs RAD-DINO vs kombinasi/stack)
- [x] Keputusan model terdokumentasi (ADR-007) & config tersimpan
- [x] Batasan dilaporkan eksplisit (bukan alat diagnosis; TPP WHO belum terpenuhi)
- [x] UI EN default + ID toggle; **web-first responsif** (workspace desktop dua kolom) + mobile utuh + aksesibilitas dasar
- [x] **Artefak model dipublikasikan** (GitHub Release `models-v1` + `scripts/fetch_models.sh`)
- [x] **Surat rujukan (cetak) terverifikasi** — `submission/screenshots/referral_letter_print.png`
- [x] LICENSE (MIT + catatan intended use)
- [x] **Uji perilaku deployment**: API vs offline r=0,986 (AUROC sampel 0,864 vs 0,867); robustness JPEG terdokumentasi
- [x] **Model card** formal (`docs/05-model-card.md`)
- [x] **UI v2 dwibahasa** (EN default + ID toggle) — redesign berbasis referensi Mobbin; verifikasi: overflow 0px ×5 halaman ×3 viewport, nol console error, toggle persist (`.design/mobbin-stdir/run-01/verification.json`)
- [x] **Revisi web-first (v3, 5 Okt)**: container `max-w-6xl`; skrining jadi workspace 2 kolom (form kiri ↔ rail hasil/galeri kanan); pasien & klinisi dashboard grid; referensi web baru (Exa/fal/Zoho CRM/Base44/Mintlify/Semrush/Cloudflare/Optimal Workshop — `references.json` v2); verifikasi ulang lolos; video + screenshot dirender ulang
- [x] **Live demo penuh (VPS + Tailscale Funnel, HTTPS):** https://ip-172-26-13-244.tail40f715.ts.net — container Docker auto-restart, verifikasi publik lolos (health + UI 200 + predict p 0,9937 + fetch dari server pihak ketiga). RAM 1,86/3,74 GB.
- [x] **UI statis (GitHub Pages)** memakai API live yang sama: https://alvnvnc.github.io/loop-tb/
- [ ] Upload video (YouTube unlisted) → link ke Devpost
- [ ] Submit di platform Devpost (butuh login pemilik akun)

## Fakta kunci untuk form Devpost

- Model final: **RAD-DINO** (SSL khusus X-ray dada) + probe linear; AUROC eksternal **0,887 [0,862–0,909]**; sens@spec90 **0,713**.
- Audit data: 338 duplikat internal + **19 citra train bocor ke test eksternal** dibuang (manifest frozen, pHash).
- Supervised baseline (EB0+ConvNeXt): eksternal 0,675. Kombinasi/stack: lebih buruk (0,858/0,809).
- Deferral: std lintas-keluarga 4 anggota; τ_u=0,25 → defer 25% (TB-rate 32% vs 55%).
- Demo: TB → refer (p 0,98); normal lintas-situs → uncertain (u 0,37).

## Sebelum menekan Submit

1. Cek ulang link repo publik, Release `models-v1`, dan README (semua angka final sudah terpasang).
2. Cek video: durasi, suara, angka di slide = angka final.
3. Isi Devpost (EN), sertakan gambar (web-first): `skrining_hasil_tb_desktop.png` (workspace + hasil), `skrining_desktop.png` (workspace + galeri), `landing_desktop.png`, `skrining_hasil_tb_mobile.png` (paritas mobile), `referral_letter_print.png`; opsional: `klinisi_filled_desktop.png`.
4. Simpan bukti submit (screenshot konfirmasi).