# Eksekusi & Risk Register

## 1. Timeline (asumsi: deadline aman 7 Okt; jika 13 Okt terkonfirmasi → 8–13 Okt hanya polish/stretch)

| Hari | Tanggal | Kerja | Output |
|---|---|---|---|
| D0 | 2 Okt (malam) | Freeze docs; kirim email panitia; download data (Kaggle API); init repo; setup Colab | docs frozen; data lokal; repo jalan |
| D1 | 3 Okt | Prep data: dedup pHash, split manifest, EDA; baseline linear probe; mulai fine-tune arch-1 | Manifest split + baseline terukur |
| D2 | 4 Okt | Fine-tune arch-2 (+arch-3 bila lancar); temperature scaling; ensemble; eval harness | Tabel & grafik evaluasi v1 |
| D3 | 5 Okt | API + web end-to-end; Grad-CAM; triage band; surat rujukan; layar loop; deploy HF + Vercel | Demo hidup |
| D4 | 6 Okt | Polish UI; final eval run; 1-pager PDF; code PDF; writeup Devpost; video (script+rekam); submit draft | Submission draft |
| D5 | 7 Okt | Buffer + QA + **SUBMIT** | Submitted ✅ |
| D6+ | 8–13 Okt | HANYA stretch tercatat ADR: WASM offline, korpus eksternal tambahan, efisiensi | Opsional |

## 2. Deliverables & Definition of Done

| Deliverable | DoD |
|---|---|
| Repo GitHub publik | README (masalah, cara run, hasil, limitation), LICENSE, `submission/` lengkap; `make`/script reproducible |
| 1-Pager PDF | Tepat 1 halaman: masalah + angka bersitasi, solusi, bukti eval, roadmap |
| Code PDF | Auto-generate dari repo (script `ml/tools/export_code_pdf.py`) |
| Demo video (~3 mnt) | Narasi EN (juri internasional), UI ID; demo fitur benar-benar jalan; seksi rigor & roadmap jujur |
| Devpost writeup | Same story: problem → wedge → eval → honesty → roadmap |

## 3. Risk register

| # | Risiko | P | Dampak | Mitigasi |
|---|---|---|---|---|
| R1 | Deadline ganda (7 vs 13 Okt) | M | Tinggi | Email hari ini (§4); submit ≤ D5; buffer 8–13 Okt tidak dipercaya |
| R2 | GPU tidak tersedia | M | Tinggi | Colab/Kaggle T4; model kecil (B0); checkpoint tiap epoch; arch-3 opsional |
| R3 | Leakage/confounding dataset | H | Tinggi | Dedup + provenance audit + split terkunci; jadikan *bagian cerita*, bukan kejutan |
| R4 | Tanpa validator klinis | H | Sedang | Framing "triase, bukan diagnosis"; sitasi guideline resmi; limitations eksplisit |
| R5 | Scope creep | H | Tinggi | ADR gate; zero-sum; fitur tanpa baris coverage matrix = ditolak |
| R6 | Download Kaggle gagal (auth) | L | Sedang | kaggle CLI + fallback unduh manual; mirrors |
| R7 | Deployment HF Spaces mati saat judging | L | Sedang | Video demo = rekaman layar lokal; link demo sebagai bonus, bukan satu-satunya bukti |

## 4. Draft email verifikasi deadline

**To:** biocataalysis@gmail.com
**Subject:** UnivaBio — quick check on submission deadline

> Hi UnivaBio team,
> I noticed the Rules page lists "Hackathon End: October 7" while the Devpost schedule shows submissions until October 13 (11:45pm EDT). Could you confirm which deadline applies for submissions?
> Thank you!

## 5. Kebijakan change control

1. Semua keputusan tercatat sebagai ADR di `00-charter.md` §5; perubahan = ADR baru yang menggantikan (superseding).
2. Zero-sum: tambah 1 fitur = hapus 1 fitur setara.
3. Fitur wajib punya baris di coverage matrix (`02-arsitektur.md` §2).
4. Keputusan besar (>30 menit debat) ditolak default demi momentum.

## 6. Log progres

- **2 Okt — D0 selesai:** rencana frozen (ADR-003/005/006); data terunduh (TBX11K 8.399 berlabel + Rahman 4.200 + NLM 800); **manifest v1** (train 10.288 / val 1.815 / external 800; 338 duplikat internal + **19 kebocoran cross-corpus** dibuang); repo publik berisi kode + artefak manifest; metadata klinis NLM 789 baris (21 scar-flagged); **smoke test ML end-to-end di CPU** — 2 bug nyata ditemukan & diperbaiki (kondisi spesifisitas terbalik; exporter ONNX butuh `dynamo=False` + toleransi relatif); UI web lengkap (Skrining, Pendampingan, Ringkasan klinisi, Tentang) build hijau.