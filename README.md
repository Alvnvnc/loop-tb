# SIGAP — triase skrining TB terkalibrasi

> Prototipe riset untuk **UnivaBio 2026** (AI for Human Health). Codename repositori: `loop-tb`.
> **Bukan alat medis** — alat triase yang wajib dikonfirmasi tenaga kesehatan (GeneXpert).

Indonesia adalah negara beban TB **#2 dunia** (10% kasus global 2024, WHO GTR 2025) dengan **±200 ribu kasus/tahun tak terdeteksi**. Akarnya: *loop perawatan bergerak lebih lambat daripada penularan.* SIGAP memampatkan latensi itu dengan **satu state risiko terkalibrasi** yang menggerakkan: **skrining → rujukan → pendampingan**.

## Status (2 Okt 2026)

| Bagian | Status |
|---|---|
| Audit data + split frozen (dedup pHash) | ✅ 338 duplikat internal + **19 kebocoran cross-corpus** dibuang |
| Training (EB0, ConvNeXt-T, linear probe) di Kaggle GPU T4 | ✅ checkpoint terarsip |
| Evaluasi eksternal (Shenzhen + Montgomery, 800 citra) | ✅ AUROC 0,64–0,68 — dilaporkan apa adanya |
| Studi representasi SSL (DINOv2 + RAD-DINO) | 🔄 berjalan |
| UI web (Skrining, Pasien, Klinisi, Tentang) | ✅ build hijau + screenshot di `submission/` |
| API + Grad-CAM + band triase | ✅ lokal (deploy menyusul) |

## Hasil inti (yang biasanya disembunyikan)

| Evaluasi | AUROC |
|---|---|
| Val internal (split acak) | 0,98–0,9999 ← *ilusi within-corpus* |
| Eksternal supervised (rumah sakit berbeda) | 0,64–0,68 |
| **Eksternal probe RAD-DINO (model final)** | **0,887 [0,862–0,909] · sens@spec90 0,713** |

Kami mengukur ilusi ita, membuang kebocoran yang ditemukan (338 duplikat internal + **19 citra train yang bocor ke test set eksternal**), lalu **studi representasi** menunjukkan pra-latih domain (RAD-DINO pada X-ray dada) mengalahkan fine-tuning supervised sebesar +0,21 AUROC di domain asing. **Dua angka dilaporkan, bukan satu.** Detail: `docs/04-evidensi-data.md`.

## Struktur

```
ml/          # data prep (dedup provenance), train, evaluate, export ONNX, SSL probe
ml/kaggle/   # kernel GPU via Kaggle API (training, ekstraksi SSL) + watcher
api/         # FastAPI: inference + Grad-CAM + band triase
web/         # Next.js: UI ID-first (skrining, pendampingan, ringkasan klinisi)
docs/        # charter + ADR, pohon masalah, arsitektur/scope, eksekusi, evidensi
submission/  # writeup, skrip video, screenshot
```

## Reproduksi (ringkas)

```bash
# 1) data
bash ml/data/download_kaggle.sh          # TBX11K + Rahman
bash ml/data/download_nlm.sh             # Shenzhen + Montgomery (external, resmi NLM)
# 2) split + audit
.venv/bin/python ml/data/prepare_data.py --raw data/raw --out ml/data/artifacts
# 3) training (GPU via Kaggle API; lihat ml/kaggle/train/)
kaggle kernels push -p ml/kaggle/train && bash ml/kaggle/wait_train.sh
# 4) evaluasi rigor (kalibrasi, CI, band, subgrup)
.venv/bin/python ml/evaluate.py --runs ml/runs/eb0 ml/runs/convnext \
    --manifest ml/data/artifacts/manifest.json --split external --temp-scale \
    --meta ml/data/artifacts/meta_nlm.csv --out ml/runs/eval_external_ens
# 5) artefak model (final RAD-DINO probe + baseline supervised)
bash scripts/fetch_models.sh
# 6) UI + API
cd web && npm run dev
uvicorn api.main:app --port 8000
```

## Live demo

- **UI statis (GitHub Pages, tanpa server):** https://alvnvnc.github.io/loop-tb/ — coba bagian **“Contoh arsip”** di halaman Skrining (4 kasus nyata dengan keluaran ensemble final + heatmap, dihitung offline).
- **UI + API penuh (RAD-DINO live):** sedang disiapkan ke Hugging Face Spaces (`api/deploy_hf.sh`, butuh token HF). Situs statis dapat di-upgrade ke API live hanya dengan membangun ulang dengan `NEXT_PUBLIC_API_URL=<url-space>`.

## Deployment (satu Space = UI + API)

`api/main.py` bisa menyajikan static export Next.js sehingga satu server melayani UI dan API (same-origin):

```bash
# butuh token Hugging Face (read+write): HF_TOKEN=... bash api/deploy_hf.sh
# skrip: build web (NEXT_EXPORT=1) → upload UI + API + models ke Space

# uji unified secara lokal:
(cd web && NEXT_EXPORT=1 NEXT_PUBLIC_API_URL="" npm run build)
LOOPTB_STATIC=web/out uvicorn api.main:app --port 8000   # buka http://localhost:8000
```

Artefak model: [Release `models-v1`](https://github.com/Alvnvnc/loop-tb/releases/tag/models-v1) — unduh otomatis dengan `bash scripts/fetch_models.sh`.

## Dokumen kunci

- `docs/00-charter.md` — problem statement, user, ADR log (keputusan terkunci)
- `docs/01-pohon-masalah.md` — akar masalah → wedge + bukti + lanskap solusi
- `docs/02-arsitektur.md` — invarian R(x,t), coverage matrix, protokol evaluasi
- `docs/04-evidensi-data.md` — angka audit data + hasil val vs eksternal