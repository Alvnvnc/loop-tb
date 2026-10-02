# Model Card — SIGAP TB Triage v1

> Format mengikuti praktik umum model card (Mitchell et al.). Status: **prototipe riset UnivaBio 2026 — bukan alat medis.**

## 1. Ringkasan

| Item | Detail |
|---|---|
| Model final | **RAD-DINO** (ViT-B/14, self-supervised pada X-ray dada) + **linear probe** terkalibrasi |
| Tugas | Klasifikasi biner pada citra X-ray dada: TB (radiografis) vs bukan-TB (termasuk `sick-but-no-TB`) |
| Peran dalam sistem | Menghasilkan **skor risiko** p(TB); bukan diagnosis. Dipakai bersama pita deferral. |
| Keluaran | `p_tb` (probabilitas terkalibrasi), `u` (ketidakpastian lintas-keluarga), `band` ∈ {rujuk_prioritas, ragu, negatif_skrining} |
| Versi | `models-v1` (GitHub Release) · probe_rad_dino.npz · T=0,749 |

## 2. Penggunaan yang dimaksudkan

- **Untuk:** triase skrining oleh kader/petugas puskesmas — memprioritaskan siapa yang perlu GeneXpert hari ini, dan **menahan keputusan ketika model tidak yakin**.
- **Pantang digunakan untuk:** diagnosis, meniadakan pemeriksaan konfirmasi, populasi <15 tahun (di luar rekomendasi CAD WHO), kehamilan sebagai satu-satunya dasar keputusan, atau setting tanpa jalur rujukan.
- **Pengguna:** petugas terlatih; output selalu disertai disclaimer dan instruksi konfirmasi.

## 3. Data

| Korpus | Peran | n | Label |
|---|---|---|---|
| TBX11K (Kaggle) | train/val | 7.914 setelah dedup | radiografis; `sick-but-no-TB` = negatif |
| Rahman et al. (Kaggle) | train/val | 4.189 setelah dedup | radiografis |
| NLM Shenzhen + Montgomery | **external test** | 800 | radiografis + readings klinis |

- Dedup pHash (Hamming ≤3): **338 duplikat internal** + **19 kebocoran train→external** dibuang sebelum training. Manifest frozen (seed 42).
- Tidak ada data Indonesia dalam training/evaluasi (dilaporkan sebagai limitation).
- Model SSL (RAD-DINO) pra-latih pada data publik pihak ketiga (MIMIC-CXR) — lisensi mengikuti sumber.

## 4. Evaluasi

| Evaluasi | AUROC [95% CI] | Sens@Spec90 | ECE |
|---|---|---|---|
| Val internal (split acak, per-klaster) | 0,9982 | 0,96 | — |
| **Eksternal (Shenzhen+Montgomery)** | **0,887 [0,862–0,909]** | **0,713** | 0,247 |
| Subgrup eksternal — perempuan / laki-laki | 0,87 / 0,90 (perkiraan dari run terkait) | — | — |
| Pembanding: supervised EB0+ConvNeXt | 0,675 [0,636–0,712] | 0,266 | 0,212 |
| Pembanding: DINOv2 umum | 0,736 [0,698–0,768] | 0,383 | 0,329 |

- **Uji perilaku deployment** (`tools/model_checks.py`, 60 citra eksternal via HTTP API): API vs evaluasi offline → **Pearson r=0,986**, mean|Δp|=0,034, AUROC sampel **0,864 vs 0,867** offline — jalur deployment mereproduksi evaluasi setelah preprocessing disamakan (pra-resize 512px).
- Robustness kompresi **JPEG q85**: mean|Δp|=0,065, maks 0,28 → rekomendasi operasional: kirim citra kualitas penuh; hindari kompresi berat.
- Angka internal (0,98–0,9999) dilaporkan untuk transparansi tetapi **tidak boleh dianggap** ukuran keselamatan: dataset publik mengandung confounding akuisisi (Bilal 2026).

## 5. Kalibrasi & ketidakpastian

- Temperature scaling di-fit pada val (T=0,749 untuk probe final).
- `u` = std probabilitas 4 anggota lintas-keluarga (RAD-DINO, DINOv2, EB0, ConvNeXt); τ_u=0,25.
- Pada eksternal: defer 25% teratas → TB-rate 32% vs 55% pada sisanya (stratifikasi jujur, bukan ajaib).
- ECE eksternal 0,247 — **kalibrasi lintas-domain masih lemah**; threshold dari val tidak sepenuhnya transfer (over-triage terdokumentasi).

## 6. Keterbatasan & risiko

1. Label radiografis, bukan konfirmasi bakteriologis → nilai AUROC bergantung kualitas bacaan sumber.
2. Domain shift: performa dan threshold turun di rumah sakit asing; τ harus dikalibrasi per-site (roadmap).
3. `reprocessing` agresif dapat lolos dedup perseptual.
4. Tidak ada data Indonesia; bias populasi (MIMIC/China) belum diukur penuh.
5. Skar/fibrosis dapat tampak "TB-like" (mode gagal klinis yang dikenal) — alasan band ragu + pembacaan manusia.
6. Sensitivitas pada Spec90 = 0,713 < target TPP WHO (>0,90) — **belum memenuhi**.

## 7. Pertimbangan etis & operasional

- Data publik hanya; tidak ada PII; tidak ada redistribusi citra MIMIC.
- Output demo tersimpan lokal (browser) bila pengguna menekan "simpan ke kartu".
- Rekomendasi: setiap implementasi lapangan harus melalui validasi lokal, persetujuan etik, dan pengawasan klinis.

## 8. Reproduksi

```bash
bash scripts/fetch_models.sh                      # artefak models-v1
bash ml/data/download_kaggle.sh && bash ml/data/download_nlm.sh
.venv/bin/python ml/data/prepare_data.py --raw data/raw --out ml/data/artifacts
.venv/bin/python ml/ssl_probe.py --emb-dir <embeddings> --out ml/runs/ssl_eval   # perlu kernel SSL
.venv/bin/python ml/evaluate.py --runs ... --split external --temp-scale
```
Empat bug nyata ditemukan lewat pengujian berlapis (metrik spesifisitas terbalik, export ONNX, grid temperature, preprocessing API vs evaluasi) — semuanya terdokumentasi di riwayat commit.