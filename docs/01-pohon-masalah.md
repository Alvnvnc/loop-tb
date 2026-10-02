# Pohon Masalah TB → Pemilihan Wedge

## 1. Akar (root cause)

**Loop perawatan TB (deteksi → diagnosis → pengobatan → pemantauan) bereaksi lebih lambat daripada laju penularan dan progresi penyakit.**

Bukan "kurang dokter", bukan "kurang alat" — itu gejala. Mekanismenya: latensi setiap tahap loop > waktu yang dibutuhkan penyakit untuk menular ke orang lain / memburuk pada pasien.

**Bukti delay (terverifikasi):**
- Median diagnostic delay di primary care Indonesia 4 hari (IQR 1–11), **tetapi 19,3% episode >14 hari dan 7,6% >30 hari** (Annals of Global Health, 2025, aogh.5369).
- Patient pathway analysis: median 20 hari (IQR 7–72), **57,3% mengalami long diagnostic delay** (Clinical Microbiology & Infection, 2021).
- TBM (TB meningitis): median **66 hari** menuju diagnosis (PMC, 2025).
- Kualitas fasilitas DOTS berkorelasi dengan total delay (Jogjakarta, Trop Med Int Health, 2011).

## 2. Cabang masalah (MECE, mengikuti tahap loop)

| # | Cabang | Isi | Bukti |
|---|---|---|---|
| A | **Detection gap** | ±200k kasus/tahun tak pernah masuk sistem; case finding masih pasif; kasus ringan/asimtomatik; stigma; kapasitas skrining | 1,07–1,09 jt estimasi vs ~885k ditemukan (GTR 2025; Kemenkes 2024) |
| B | **Reading/access gap** | X-ray portabel didistribusikan masif, tapi pembaca ahli langka; GeneXpert tidak merata; keputusan rujukan lambat | WHO 2021/2025: CAD direkomendasikan *justru karena* kekurangan pembaca; Kemenkes distribusi X-ray portabel |
| C | **Interpretation gap** | Skor/angka tanpa penjelasan; pasien & kader tidak paham arti; stigma | TBScreen.AI = "probability 0–100%" tanpa mekanisme penjelasan |
| D | **Treatment continuity** | Regimen 6 bulan; LTFU; beban DOTS; TPT & investigasi kontak belum optimal | Wamenkes (2026): penemuan kasus, keberhasilan pengobatan, investigasi kontak & TPT masih jadi tantangan |
| E | **System continuity/learning** | Data antar-kunjungan terfragmentasi; tak ada trajektori risiko; program tak belajar dari kasus yang lolos | SITB/monitoring manual; tidak ada mekanisme loop |

## 3. Analisis bottleneck (Theory of Constraints)

- **Inflow constraint: deteksi.** Tidak bisa mengobati yang tidak ditemukan. Setiap kasus tertunda = tambahan transmisi + risiko kematian.
- Di dalam deteksi, constraint operasional pada push nasional = **throughput pembacaan CXR di ujung rantai** (puskesmas tanpa dokter; volume naik setelah roll-out alat portabel).
- **Wedge = kompresi latensi di titik skrining & triase**, lalu sambungkan loop ke hilir (rujukan → kepatuhan → tindak lanjut).
- Cabang D & E adalah bottleneck sekunder: intervensi di sana hanya menyentuh pasien yang *sudah* tertangkap sistem.

## 4. Mengapa solusi yang ada belum cukup (terverifikasi — ini diferensiasi kita)

| Solusi | Status | Celah |
|---|---|---|
| qXR (Qure.ai), Cad4TB | Komersial, mapan, dipakai program komunitas Indonesia (dilaporkan 190 kabupaten) | Tertutup; berhenti pada prioritisasi/skor; tidak menutup loop; threshold tetap isu implementasi |
| TBScreen.AI (UGM × KONEKSI, Agu 2025) | CAD lokal pertama; ~936 citra; pilot Klaten & Mimika | Akurasi dilaporkan ~64% (swa-lapor); tanpa kalibrasi/ketidakpastian; belum terbuka |
| Model riset dari dataset publik | "AUROC 0,99" | **Audit medRxiv Agu 2026**: class-conditional acquisition confounding di Montgomery/Shenzhen/Rahman/TBX11K — 0,97–1,00 pada split acak → **0,57–0,88** pada transfer LOCO → 0,569 pada kohort asing. 88,4% "normal" Rahman berasal dari satu arsip RS; semua TB dari koleksi khusus. Mode gagal klinis: scar paru → FP percaya diri (0,84) |

**Wedge statement (satu kalimat untuk juri):**
> *Bukan skor lagi — sebuah loop triase terkalibrasi yang tahu kapan dirinya ragu, tahan uji pindah-domain, berjalan di ujung rantai layanan, dan menyambung skrining → rujukan → kepatuhan → tindak lanjut.*

## 5. Cabang → intervensi (preview coverage matrix)

| Cabang | Intervensi (proyeksi dari R(x,t)) | Depth |
|---|---|---|
| A Detection | Model CXR ensemble terkalibrasi + band triase | DEEP |
| B Access | Kebijakan aksi τ (target TPP WHO) + paket rujukan cetak | MEDIUM |
| C Interpretation | Grad-CAM + penjelasan bahasa manusia + sitasi guideline | MEDIUM |
| D Continuity | Kartu pasien: check-in harian → R(t) → alert eskalasi | LIGHT (demo) |
| E Learning | Ringkasan trajektori untuk klinisi/program | LIGHT (demo) |

## 6. Referensi kunci

- WHO Global TB Report 2025, §1.1 TB incidence (Indonesia 10% beban global; #2).
- WHO consolidated guidelines on TB, Module 2: Screening (2021), rekomendasi #10 (CAD menggantikan pembaca manusia, ≥15 tahun, kondisional).
- WHO policy statement: Use of CAD software for TB screening (Mei 2025) — proses TAG 2025; isu pemilihan threshold masih terbuka; WHO calibration toolkit.
- WHO Target Product Profile: sensitivitas >0,90; spesifisitas >0,70.
- Bilal A. "Auditing Class-Conditional Acquisition Confounding Across Five Open TB CXR Corpora", medRxiv 2026 — repo audit: github.com/AhmadBilal227/tb-cxr-triage-pakistan.
- Kemenkes: TOSS-TB; ~885k kasus ditemukan 2024; proyeksi ~1,08–1,09 jt kasus 2024–2026; TB ditetapkan sebagai emergency.