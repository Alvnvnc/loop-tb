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
| **Eksternal (rumah sakit berbeda)** | **0,64–0,68** (supervised) · *SSL menyusul* |

Fenomena ini persis yang didokumentasikan `Bilal 2026` (*class-conditional acquisition confounding*). Kami mengukurnya di data kami sendiri, membuang kebocoran yang ditemukan, dan **melaporkan dua angka, bukan satu**. Detail: `docs/04-evidensi-data.md`.

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
# 5) UI + API
cd web && npm run dev
uvicorn api.main:app --port 8000
```

## Dokumen kunci

- `docs/00-charter.md` — problem statement, user, ADR log (keputusan terkunci)
- `docs/01-pohon-masalah.md` — akar masalah → wedge + bukti + lanskap solusi
- `docs/02-arsitektur.md` — invarian R(x,t), coverage matrix, protokol evaluasi
- `docs/04-evidensi-data.md` — angka audit data + hasil val vs eksternal