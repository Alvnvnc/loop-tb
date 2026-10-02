# Evidensi Data — Manifest v1 (2 Okt 2026)

## 1. Pipeline

`ml/data/prepare_data.py`: discovery berlabel → pHash 64-bit → klaster Hamming ≤3 (union-find transitif) → proteksi integritas external → split val per-klaster (seed 42). Output: `manifest.json`, `dedup_report.json`, `train.csv`, `val.csv`, `external.csv` (path relatif — portable lokal ⇄ Colab).

## 2. Hasil dedup (angka konkret untuk submission)

| Metrik | Nilai |
|---|---|
| Citra berlabel diproses | 13.260 |
| Tak-terklasifikasi | 3.442 (3.302 `unknown_*` tanpa label + 139 latent + 1 tak tercatat) |
| **Duplikat internal dibuang** | **338** |
| **Kebocoran cross-corpus dibuang** | **19** citra train terbukti near-dup citra external NLM → dihapus dari training |
| Korpus external | utuh 800 (Shenzhen 662 + Montgomery 138) |

> 19 itu penting: contoh konkret bahwa dataset publik memang saling terkontaminasi — persis mekanisme yang didokumentasikan audit Bilal (medRxiv 2026). Kita tidak sekadar mengklaim, kita mengukur dan Membuktikan lalu membuangnya.

## 3. Split v1 (FROZEN — jangan berubah)

| Split | n | TB | NEG | Komposisi |
|---|---|---|---|---|
| train | 10.288 | 1.123 | 9.165 | Rahman 3.552 (584 TB) + TBX11K 6.736 (539 TB) |
| val | 1.815 | 211 | 1.604 | Rahman 637 + TBX11K 1.178 |
| external | 800 | 394 | 406 | Montgomery 138 + Shenzhen 662 |

- Imbalance train ≈ **1:8,2** → training wajib `--balanced`; metrik utama AUROC & sens@spec.
- `sick_but_no_tb` (3.800 di TBX11K) dipertahankan sebagai negatif → task sengaja lebih sulit & lebih realistis untuk triase ("bukan TB" termasuk penyakit paru lain).

## 4. Keterbatasan (jujur — akan masuk PDF/video)

1. pHash menangkap near-duplikat langsung; **reprocessing agresif multi-langkah bisa lolos** (provenance recovery sulit bahkan di paper audit).
2. Label dari dataset publik bersifat radiografis, bukan konfirmasi bakteriologis.
3. Tidak ada data Indonesia di training/evaluasi → domain shift wajib dilaporkan apa adanya.

## 5. Cara verifikasi ulang

```bash
.venv/bin/python ml/data/prepare_data.py --raw data/raw --out ml/data/artifacts   # deterministik (seed 42)
python -c "import json; m=json.load(open('ml/data/artifacts/manifest.json')); print(m['meta']['counts'])"
```

## 6. Hasil training v1 & "momen kejujuran" (2 Okt)

| Model | Val AUROC (within-corpus) | Ext AUROC [95% CI] | Ext sens@spec90 | Ext ECE |
|---|---|---|---|---|
| EfficientNet-B0 | 0,9999 | 0,638 | — | — |
| ConvNeXt-Tiny | 0,9861 | 0,675 | — | — |
| **Ensemble (EB0+ConvNeXt, temp-scaled)** | — | **0,675 [0,636–0,712]** | 0,266 | 0,212 |
| Linear probe (fitur beku) | 0,9802 | **0,637 [0,597–0,671]** | 0,254 | 0,322 |

**Interpretasi (jadi tulang punggung narasi submission):**

1. **Ilusi within-corpus terbukti pada data kita** — bahkan probe linear dengan fitur beku ImageNet mencapai 0,98 di val, tapi jatuh ke ~0,64 saat pindah korpus. Persis pola yang didokumentasikan audit Bilal (2026): evaluasi split-acak membesarkan angka, deployment membongkarnya.
2. **Over-triage eksternal:** 79,5% citra masuk band "rujuk prioritas" (ambang warisan val tidak transfer); band "negatif skrining" masih memuat 24,7% TB → sistem **tidak boleh** dipakai rule-out tanpa konfirmasi manusia. Ini justifikasi empiris untuk pita "ragu" + human-in-the-loop — dan mengukur secara konkret *gap threshold* yang diakui WHO masih terbuka.
3. **Kalibrasi tetap tantangan lintas-domain:** ECE eksternal 0,212–0,322 setelah temperature scaling (T≈1,2–2,4). Model overkonfiden ekstrem (logit val ~786).
4. **Subgrup adil:** AUROC eksternal F 0,669 / M 0,682; usia 0–30: 0,631 · 30–50: 0,707 · 50+: 0,737 (tidak ada disparitas besar; celah di kelompok muda).
5. **Aksi perbaikan (ADR-007):** studi representasi SSL (DINOv2 + RAD-DINO khusus X-ray dada) — audit melaporkan probe SSL mencapai ~0,88 pada transfer terkontrol; hasil menyusul di bagian 7.
6. **Deferral berbasis ketidakpastian (ensemble disagreement):** pada data eksternal, kelompok 20% dengan disagreement tertinggi punya TB-rate 31% vs 54% pada sisanya → τ_u=0,40 dipakai di API `model_config.json` sebagai pemicu band "ragu".

## 7. Studi representasi SSL (ADR-007) — hasil sementara

| Representasi (probe linear, fitur beku) | Val AUROC | **Eksternal AUROC [95% CI]** | sens@spec90 | ECE |
|---|---|---|---|---|
| **DINOv2** (SSL umum) | 0,9987 | **0,7357 [0,698–0,768]** | 0,383 | 0,329 |
| Supervised ensemble (EB0+ConvNeXt) | — | 0,6751 [0,636–0,712] | 0,266 | 0,212 |
| Stack supervised + DINOv2 | — | 0,7107 | — | — |
| Linear probe (fitur ImageNet beku) | 0,9802 | 0,6366 [0,597–0,671] | 0,254 | 0,322 |
| RAD-DINO (X-ray dada, SSL) | — | *berjalan* | — | — |

**Temuan:**
- Representasi SSL **transfer lebih baik** (+0,06 AUROC eksternal; sens@spec90 0,383 vs 0,266) — sejalan dengan audit Bilal (2026).
- **Stacking dengan supervised justru menurunkan** performa (0,736 → 0,711): anggota yang lempar di domain asing menyeret ensemble. Pemenang sementara: probe DINOv2 tunggal.
- Val tetap ~0,999 → ilusi within-corpus tidak hilang dengan SSL; hanya evaluasi eksternal yang menentukan.
- Keterbatasan: ECE eksternal masih 0,33 (domain shift berat); τ triase tetap diambil dari val dan dilaporkan apa adanya.