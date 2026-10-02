# SIGAP — Devpost writeup (draft v1, angka final diisi setelah studi SSL)

> Kategori: UnivaBio 2026 · AI for Human Health · main prize

## Inspiration

Indonesia adalah negara dengan beban tuberkulosis terbesar kedua di dunia: **10% dari 10,7 juta kasus global (WHO Global TB Report 2025)**. Diperkirakan **±200 ribu orang per tahun menularkan TB tanpa pernah terdeteksi**, dan ~125 ribu meninggal. Akar masalahnya bukan kekurangan dokter atau alat — melainkan **latensi**: loop perawatan (deteksi → diagnosis → pengobatan → pemantauan) bergerak lebih lambat daripada penularan penyakit.

## What it does

SIGAP memampatkan latensi itu dengan **satu state risiko** yang menggerakkan seluruh loop:

1. **Skrining** — kader mengunggah X-ray dada; model mengeluarkan estimasi risiko TB yang **terkalibrasi**, lengkap dengan **pita ragu**: sistem memilih "saya tidak tahu" ketika bukti tidak cukup.
2. **Rujukan** — hasil dipetakan ke band tindakan (prioritas rujukan / ragu / negatif) + **surat rujukan siap cetak** untuk pemeriksaan GeneXpert.
3. **Pendampingan** — kartu pasien mencatat check-in minum obat; risiko diperbarui dari waktu ke waktu dan memicu **eskalasi** bila memburuk.

## How we built it

- Pipeline CXR: fine-tune EfficientNet-B0 + ConvNeXt-Tiny (timm, AMP, T4) dengan **split yang diaudit**: pHash dedup membuang **338 duplikat internal + 19 citra train yang bocor ke test set eksternal**.
- **Studi keterjujuran (ADR-007):** membandingkan supervised fine-tune vs probe representasi SSL (DINOv2 + RAD-DINO khusus X-ray dada) — laporan lengkap apa adanya, termasuk saat angkanya jatuh.
- **Kalibrasi**: temperature scaling + ambang dari titik kerja sensitivitas-target (TPP WHO: sens >90%, spec >70%).
- Produk: Next.js (ID-first, mobile-first) + FastAPI + ONNX; mode offline-first sebagai roadmap.

## The honest results (yang membedakan submission ini)

| Evaluasi | AUROC |
|---|---|
| Val internal (split acak) | 0,98–0,9999 ← **ilusi** |
| **Eksternal (rumah sakit berbeda, 800 citra)** | **0,64–0,68** (supervised) · *[SSL menyusul]* |

Kami melaporkan dua angka, bukan satu. Model yang tampak sempurna di split internal jatuh saat pindah korpus — persis fenomena *class-conditional acquisition confounding* yang baru terdokumentasi (Bilal 2026). **Inilah alasan produk ini dibangun sebagai triase berkalibrasi dengan keputusan manusia tetap di dalam loop — bukan "AI diagnosis".**

## Challenges

1. Dataset publik saling terkontaminasi (kami mengukur & membuang: 357 citra).
2. Domain shift eksternal menurunkan performa drastis (kami mengukur, bukan menyembunyikan).
3. Ambang triase dari val tidak transfer (79,5% over-triage eksternal) → justifikasi empiris untuk pita ragu.

## What's next

Validasi prospektif di puskesmas; ambang per-site (WHO calibration toolkit); audio batuk; integrasi SITB; ekspor tflite untuk perangkat murah.

## Built with

python, pytorch, timm, scikit-learn, onnx, fastapi, next.js, tailwind, kaggle-gpu, dagster? no — hapus; github-actions? — sesuaikan sebelum submit.