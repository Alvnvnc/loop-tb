# Charter — Proyek `loop-tb` (UnivaBio 2026)

> **Status: v1 FROZEN — disetujui & dikunci 2 Okt 2026.**
> Perubahan hanya via ADR baru (lihat §5).

## 1. Problem statement

Indonesia adalah negara dengan beban TB terbesar **ke-2 dunia** (10% dari 10,7 juta kasus global 2024 — WHO Global TB Report 2025). Diperkirakan **~1,07–1,09 juta orang jatuh sakit dan ~125 ribu meninggal per tahun (≈14 kematian/jam)**, sementara pada 2024 hanya **~885 ribu kasus ditemukan** (Kemenkes) → **±200 ribu orang menularkan tanpa terdeteksi**.

Program nasional TOSS-TB memperluas skrining CXR + distribusi X-ray portabel, tetapi tiga hambatan bertemu:
1. Volume bacaan CXR melampaui kapasitas pembaca ahli (puskesmas tanpa dokter/radiolog).
2. Alat CAD yang ada bersifat **komersial** (qXR, Cad4TB) atau masih **tahap awal tanpa kalibrasi & penanganan ketidakpastian** (TBScreen.AI UGM, pilot terbatas 2025).
3. Skrining berhenti di **skor** — tidak menyambung ke rujukan, kepatuhan, dan tindak lanjut.

**Frasa inti: loop perawatan TB bergerak lebih lambat daripada penularan TB.**

## 2. Target user

| Prioritas | Siapa | Kebutuhan |
|---|---|---|
| Utama (MVP) | Kader/petugas TB puskesmas di daerah terpencil & fasilitas tanpa dokter | Skrining CXR → keputusan triase + surat rujukan dalam < 3 menit |
| Sekunder | Pasien TB & keluarga | Kepatuhan obat & pemantauan harian, bahasa manusia |
| Tersier | Klinisi/pengelola program | Ringkasan trajektori risiko untuk tindak lanjut |

## 3. Win conditions (dipetakan dari rubrik 25 poin)

| Kriteria | Ambisi kita |
|---|---|
| Idea & Innovation | Bukan skor CAD ke-1000: **loop triase terkalibrasi + honest evaluation + last-mile design** |
| Implementation | Model nyata terlatih (bukan wrapper) + evaluasi eksternal + aplikasi live ter-deploy |
| Health Impact & Rigor | Angka WHO/Kemenkes + guideline resmi + protokol evaluasi ala TPP WHO + limitations jujur |
| Design & Usability | UI ID-first, mobile-first untuk kader; alur skrining < 3 menit |
| Presentation | Demo nyata + video 3 menit + slide jujur "selesai vs roadmap" |

## 4. Constraints & non-goals

- **Kapasitas:** solo, 6–8 jam/hari efektif. Tanpa GPU lokal → training di Colab/Kaggle (ADR-006).
- **Deadline policy:** platform = 13 Okt 23:45 EDT; halaman Rules (basi) menulis 7 Okt. **Target internal: submit ≤ 7 Okt WIB** (buffer). Verifikasi via email ke biocataalysis@gmail.com (draft di `03-eksekusi.md`).
- **Data:** publik saja (daftar di `02-arsitektur.md`). Tanpa validator klinis → mitigasi: guideline resmi + framing "alat triase, bukan diagnosis" + limitations jujur.
- **NON-GOALS (dilarang masuk MVP):** alat diagnosis; menggantikan GeneXpert; CAD untuk <15 tahun (di luar rekomendasi WHO); analisis suara batuk; multi-penyakit; auth multi-user/RBAC; integrasi SITB otomatis; fitur apapun tanpa baris di coverage matrix (`02-arsitektur.md`).

## 5. Log keputusan (ADR)

| ID | Keputusan | Status |
|---|---|---|
| ADR-001 | Domain = **TB paru** (beban #2 dunia; loop lengkap; dataset publik; wedge latensi jelas) | accepted — 2 Okt 2026 |
| ADR-002 | Invarian inti = **state risiko terkalibrasi R(x,t)** sebagai satu-satunya mesin; semua fitur = proyeksinya | accepted — 2 Okt 2026 |
| ADR-003 | **Scope freeze MVP**: Recognition=DEEP, Access=MEDIUM, Interpretation=MEDIUM, Monitoring=LIGHT, Continuity=LIGHT (detail di `02`) | accepted — 2 Okt 2026 |
| ADR-004 | Nama produk | ditunda sampai UI freeze |
| ADR-005 | Deadline policy: target internal 7 Okt, submit awal, buffer 8–13 Okt hanya untuk polish/stretch tercatat | accepted — 2 Okt 2026 |
| ADR-006 | Jalur training: **Colab/Kaggle GPU (T4)** — tidak ada GPU lokal; model kecil + checkpoint tiap epoch wajib | accepted — 2 Okt 2026 |
| ADR-007 | **Studi representasi (dalam scope Recognition-DEEP):** bandingkan supervised fine-tune (EB0/ConvNeXt) vs probe SSL (DINOv2 umum + RAD-DINO khusus X-ray dada) di AUROC eksternal + kalibrasi; pilih pemenang untuk API. Bukan scope baru — ini pemilihan inti mesin. | accepted — 2 Okt 2026 |

**Kebijakan perubahan (anti-berubah-ubah):**
1. Setelah freeze, setiap penambahan scope **wajib menghapus item setara** (zero-sum) dan dicatat sebagai ADR superseding.
2. Tidak ada fitur yang tidak punya baris di coverage matrix.
3. Semua perubahan besar harus selesai dalam < 30 menit diskusi; kalau tidak, ditolak default.