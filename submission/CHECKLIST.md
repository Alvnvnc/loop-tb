# Checklist Submission — UnivaBio 2026

Deadline platform: **13 Okt 2026 23:45 EDT** · halaman Rules (basi) menulis 7 Okt → target internal: **submit ≤ 7 Okt** (buffer). Panitia: biocataalysis@gmail.com.

## Requirement resmi → status

| # | Requirement | Artefak | Status |
|---|---|---|---|
| 1 | Project (website/app/prototipe dengan interaksi user) | `web/` (5 halaman) + `api/` (inference/Grad-CAM/band) | ✅ jalan & teruji e2e |
| 2 | Demo video (tujuan + fitur + interaksi) | `submission/sigap_demo.mp4` | 🔄 diproduksi (slide + screencast + narasi) |
| 3 | One Page Project Description (PDF) | `submission/onepager.pdf` (+ sumber `onepager.html`) | ✅ |
| 4 | GitHub repo / Code PDF | repo publik + `submission/code_listing.pdf` (65 file) | ✅ |

## Kualitas submission (rubrik internal)

- [x] Angka beban penyakit dengan sumber (WHO GTR 2025, Kemenkes 2024)
- [x] Audit data terukur (338 dup internal + 19 kebocoran cross-corpus)
- [x] Evaluasi eksternal + CI + kalibrasi + subgrup (jujur: val vs eksternal)
- [x] Studi representasi (supervised vs DINOv2 vs RAD-DINO vs kombinasi/stack)
- [x] Keputusan model terdokumentasi (ADR-007) & config tersimpan
- [x] Batasan dilaporkan eksplisit (bukan alat diagnosis; TPP WHO belum terpenuhi)
- [x] UI ID-first mobile-first + screenshot + aksesibilitas dasar (kontras, fokus, target sentuh)
- [ ] **Deploy live** (HF Spaces) — butuh token HF dari pemilik akun
- [ ] Devpost writeup versi EN + gambar (draft ada di `submission/devpost.md`)
- [ ] Upload video (YouTube unlisted) → tempel link ke Devpost
- [ ] Submit di platform (isi form Devpost: deskripsi, link repo, link video, gunakan One-Pager sebagai deskripsi)

## Fakta kunci untuk ditulis di form Devpost

- Model final: **RAD-DINO** (SSL khusus X-ray dada) + probe linear; AUROC eksternal **0,887 [0,862–0,909]**; sens@spec90 **0,713**.
- Audit data: 338 duplikat internal + **19 citra train bocor ke test eksternal** dibuang (menifest frozen, pHash).
- Supervised baseline (EB0+ConvNeXt): eksternal 0,675. Kombinasi/stack: lebih buruk (0,858/0,809).
- Deferral: std lintas-keluarga 4 anggota; τ_u=0,25 → defer 25% (TB-rate 32% vs 55%).
- Demo: TB → refer (p 0,98); normal lintas-situs → uncertain (u 0,37).

## Sebelum menekan Submit

1. Cek ulang link repo publik & README (angka final sudah di-update).
2. Cek video: durasi, suara, angka di slide = angka final.
3. Isi Devpost: EN, sertakan 2–3 gambar (`submission/screenshots/skrining_hasil_*.png`).
4. Simpan bukti submit (screenshot konfirmasi).