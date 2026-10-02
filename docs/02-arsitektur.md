# Arsitektur & Scope Freeze (ADR-003)

## 1. Invarian inti: state risiko `R(x, t)`

Satu objek komputasi per pasien yang berevolusi waktu:

```
R(x, t) = {
  p_tb  : probabilitas TB terkalibrasi (temperature-scaled ensemble),
  u     : ketidakpastian (ensemble disagreement),
  z     : peta bukti spasial (Grad-CAM),
  band  : aksi { rujuk-prioritas | ragu-periksa-manusia | negatif-skining },
  t     : riwayat pembaruan (trajektori)
}
```

**Metode penyatu:** satu mesin risiko + satu kebijakan aksi. Setiap cabang pohon masalah = **proyeksi** dari `R` yang sama — bukan fitur yang hidup sendiri-sendiri.

```
                 ┌──────────────────────────────┐
   CXR ─────────►│   MESIN R(x,t)               │
   check-in ────►│  model ensemble + kalibrasi  │
                 └──────┬───────┬───────┬───────┘
                        │       │       │
              proyeksi A│  B/C  │   D/E │
                        ▼       ▼       ▼
                    triase   penjelasan  loop kepatuhan
                    rujukan  Grad-CAM    & ringkasan
```

## 2. Coverage matrix — SCOPE MVP (FROZEN setelah approval)

| Cabang | Proyeksi dari R | Fitur MVP | Depth | Bukti sukses |
|---|---|---|---|---|
| A Detection | p_tb + u | Upload CXR → skor + CI + band | **DEEP** | Sens@Spec, AUROC+CI, ECE, tabel transfer |
| B Access | band → aksi | Triage band + surat rujukan (print/PDF) | MEDIUM | Kesepakatan band vs guideline; 1 alur <3 menit |
| C Interpretation | z → penjelasan | Overlay Grad-CAM + teks ID + "apa yang TIDAK ditunjukkan" | MEDIUM | Paham oleh 3+ orang non-medis (user test kecil) |
| D Monitoring | R(t) update | Kartu pasien: check-in minum obat/gejala → alert naik | LIGHT (demo) | Skenario demo memburuk → eskalasi tampil |
| E Continuity | R(t) → ringkasan | Export ringkasan klinisi (print) | LIGHT (demo) | Artefak printable muncul |

**Di luar scope (bukan roadmap yang dijanjikan, hanya ide yang sengaja TIDAK dikerjakan):** audio batuk, pediatric, multi-penyakit, integrasi SITB, auth multi-user, mobile native.

## 3. Data plan

| Dataset | Isi | Peran | Catatan |
|---|---|---|---|
| TBX11K (vbookshelf/tbx11k-simplified) | 8.399 berlabel 512²: **660 active TB**; 7.600 negatif (3.800 healthy + 3.800 sick-but-no-TB); 139 latent dikeluarkan; +3.302 `unknown_*` tanpa label (tidak dipakai) | **Train/val utama** | Label dari `data.csv` (otoritatif); task sulit by design: sick-but-no-TB = negatif |
| Rahman (tawsifurrahman) — folder `TB_Chest_Radiography_Database/` | **700 TB / 3.500 normal** | **Train** | WAJIB dedup — 88,4% "normal" dari satu arsip RS; semua TB dari koleksi khusus (Bilal 2026) |
| NLM Shenzhen | **336 TB / 326 normal** (662 citra) | **External test** | Sumber resmi NLM; tidak boleh tersentuh training |
| NLM Montgomery | **58 TB / 80 normal** (138 citra) + ClinicalReadings (usia/sex) | **External test** + subgrup | idem |
| Mendeley Pakistani TB CXR V2 | kohort RS Pakistan | External tambahan (stretch) | doi:10.17632/8j2g3csprk.2 |

Imbalance train ≈ 1.360 TB : 11.100 negatif (~1:8) → pakai `--balanced` + metrik yang tidak sensitif kelas (AUROC, sens@spec) sebagai metrik utama.

**Aturan integritas (tidak bisa dinegosiasi):**
1. Dedup perseptual (pHash/embedding) + provenance audit mengikuti metode Bilal 2026 (tools + source-matched hashes tersedia publik).
2. Laporkan jumlah duplikat yang dibuang, di README dan evaluasi.
3. Split manifest dikunci sebelum training (file JSON versioned di repo).
4. Tidak ada citra dari korpus eksternal yang masuk training — dicek ulang via hash sebelum final submission.

## 4. Protokol evaluasi (senjata rigor)

| Aspek | Metrik/metode |
|---|---|
| Akurasi utama | **Sensitivitas @ spesifisitas 0,90 & 0,70** (target TPP WHO: sens >0,90, spec >0,70) + 95% CI bootstrap |
| Diskriminasi | AUROC + CI |
| Kalibrasi | ECE, reliability curve, Brier score (sebelum vs sesudah temperature scaling) |
| Ketidakpastian | Proporsi "ragu" (deferral rate) + akurasi pada subset ragu |
| Transfer/honesty | Tabel: within-corpus vs provenance-dedup LOCO vs unseen-corpus (meniru desain audit) |
| Baseline pembanding | (1) linear probe fitur beku, (2) 1 arsitektur fine-tune, (3) ensemble + kalibrasi |
| Subgrup | Usia/jenis kelamin (tersedia di NLM); pembahasan kualitatif scar-FP |
| Limitations (wajib di PDF & video) | Retrospektif; confounding akuisisi dataset publik; tanpa data Indonesia; bukan alat diagnosis |

## 5. Stack teknis

| Layer | Pilihan | Alasan |
|---|---|---|
| ML | PyTorch + timm (EfficientNet-B0, ConvNeXt-T), scikit-learn | Cepat dilatih, terbukti, export ONNX mulus |
| Training | Colab/Kaggle GPU (T4) atau lokal bila tersedia | B0 pada ~10k citra: ~1–2 jam/arsitektur |
| Serving | FastAPI + onnxruntime (CPU), Docker → deploy HF Spaces | Gratis, publik, stabil untuk demo |
| FE | Next.js + Tailwind, mobile-first, ID-first | Kecepatan build + kualitas UI (kekuatan kita) |
| Offline (stretch) | onnxruntime-web (WASM) + PWA | Momen demo "airplane mode tetap jalan" |
| Repo | mono-repo: `ml/` `api/` `web/` `docs/` `submission/` | Bersih untuk code PDF & juri |

## 6. Narasi demo video (3 menit)

1. **Masalah** (20 dtk): angka BPS/WHO + satu kalimat wedge.
2. **Skrining** (60 dtk): kader upload CXR → band + heatmap + penjelasan + surat rujukan.
3. **Loop** (40 dtk): kartu pasien → check-in → R(t) naik → alert eskalasi → ringkasan klinisi.
4. **Rigor** (40 dtk): tabel evaluasi — termasuk **jatuhnya performa di unseen corpus** (kejujuran ini yang membedakan).
5. **Roadmap jujur** (20 dtk): selesai vs direncanakan vs tidak dikerjakan.