# Keputusan Desain — SIGAP v2 (run-01)

Mode: `adapt` · Profil: `product-ui` + hero marketing · Dampak utama: hackathon internasional.

## Arah visual

**Dari**: "formulir polos di kertas" (datar, tanpa kedalaman, tipografi satu nada).
**Ke**: **"instrumen klinis dengan keberanian editorial"** — laporan hasil yang dramatis di panel film, ajakan yang jelas, tipografi display serif untuk pernyataan + sans untuk data.

Identitas dipertahankan (bukan dibuang): film gelap untuk panel hasil, kertas sejuk untuk alur, warna HANYA untuk makna triase (refer/defer/clear).

## Sistem

| Aspek | Keputusan | Sumber | Alasan | Verifikasi |
|---|---|---|---|---|
| Tipografi | Display serif **Newsreader** (headline, verdict, angka besar) + **Plus Jakarta Sans** (UI/data) | Amigo, Lassie (observed-image) | Serif = bahasa visual AI-health editorial; kontras peran jelas, bukan default | Cek heading di 390/768/1440 |
| Skala hasil | **Bar probabilitas 0–100%** dengan zona triase + tick ambang + penanda skor + whisker ketidakpastian | Higgsfield (skala LOW→HIGH), Uxcel (tick konteks) | Menampilkan kalibrasi + deferral secara instan — pembeda unik kita | Nilai cocok dengan JSON API |
| Kartu temuan | 3 kartu status bertumpuk: Observed / Not shown / Uncertainty | Base44 | Scanability; kejujuran terstruktur | Isi berubah sesuai band |
| Step unggah | Ilustrasi radiograf SVG + kotak panduan "Before you analyze" + CTA full-width + baris kepercayaan | Hims, Walmart, CVS | Mencegah input gagal, menambah rasa aman | Uji unggah file nyata |
| Hero landing | Rail bernomor 01/02/03 (aktif = detail + CTA) + mockup ponsel berisi kartu hasil nyata | Amigo (rail), Superpower (device) | Menjelaskan loop + menunjukkan produk sekaligus | Render 3 viewport |
| Halaman pasien | Kalimat insight di atas + timeline status (Screening→Referral→Treatment→Follow-up) + bar 14 hari | Perplexity Health, Hers | Data loop dipahami sekali lihat | Demo case menampilkan eskalasi |
| Ringkasan klinisi | 4 stat tile + timeline per kasus | Gorgias, AWS | Ikhtisar dulu, detail kemudian | Print tetap rapi |
| Navigasi mobile | **Bottom tab bar** 5 item (bukan hanya header scroll) | Fi, Superpower (observed-image) | Rasa aplikasi untuk kader | Fokus keyboard + aria-current |

## i18n

- Bahasa: **EN (default, juri internasional)** + ID (produk kader). Toggle segmented di header, persist localStorage, `<html lang>` ikut berubah.
- Surat rujukan mengikuti bahasa aktif (ID untuk fasilitas Indonesia; EN untuk juri).
- Istilah lokal dipertahankan dengan gloss singkat: Puskesmas, TOSS-TB, kader, GeneXpert.

## Token (perubahan dari v1)

- Radius: kontrol 10px · tile 12px · panel 16px (hierarki, bukan satu radius seragam).
- Elevasi: border-first + satu soft shadow `0 1px 2px rgba(16,20,26,.06), 0 12px 32px -16px rgba(16,20,26,.25)` hanya untuk elemen terangkat (mockup, hasil).
- Warna: tetap refer `#C0392B` / defer `#B7791F` / clear `#2E7D5B`; tambah `mist #E8ECEE` (permukaan sekunder); teks di film pakai `bone`.
- Gerak: satu momen utama — panel hasil naik + penanda skala tumbuh (`scale-in`); hover lift pada kartu; `prefers-reduced-motion` dipatuhi.

## Batasan yang tidak diukur dari referensi

- Tipografi asli referensi (font file) tidak diketahui — Newsreader dipilih sebagai adaptasi, bukan rekonstruksi.
- Durasi/easing animasi referensi tidak terukur; gerak kita adalah keputusan desain sendiri.
- Data ilustratif (mockup hero, demo pasien) diberi label jelas.

## Acceptance tasks (dari brief) → cara uji

1. Toggle bahasa → seluruh copy berganti + persist (reload).
2. Unggah X-ray → hasil: verdict + skala + heatmap + 3 kartu temuan.
3. Galeri arsip berfungsi tanpa API.
4. Pasien: insight + timeline + bar + eskalasi.
5. Klinisi: stat tile + detail + print.
6. Print surat rujukan rapi.
7. Redeploy Pages + VPS tanpa regresi (e2e lolos di URL live).

## Revisi web-first (v2 — 5 Okt 2026)

**Masukan pengguna:** "kenapa tampilannya terasa untuk mobile? fokus web dan responsive" — juri internasional menilai dari desktop.

**Diagnosis (self-critique):**
1. Semua halaman dikunci `max-w-3xl` (768px) → di 1440px konten hanya memakai separuh layar.
2. Alur unggah diadaptasi dari referensi iOS (Walmart/Hims/CVS) dan tetap satu kolom di desktop.
3. Tidak ada layout kerja: form dan hasil bertumpuk vertikal, bukan berdampingan.

**Perbaikan (terverifikasi screenshot desktop):**
- Container: `max-w-3xl` → `max-w-6xl` (header/footer/landing/skrining/pasien/klinisi); tentang `max-w-4xl` untuk ukuran baca prosa.
- Skrining: workspace dua kolom ala **Exa** (e27219ed) / **fal** (18950c8d): alur input 5/12 kiri ↔ rail hasil 7/12 kanan; saat kosong rail menampilkan galeri arsip + placeholder tenang ala **Zoho CRM** (e957e073); setelah analisis rail menjadi panel hasil + aksi kontekstual (simpan/cetak).
- Pasien: dashboard 12-kolom ala **Base44** (7f34404c) / **Mintlify** (5e6f8fac) / **Semrush** (bcd89a45) / **Cloudflare** (5cfd2aab): kiri 5 = insight + stat 2×2 + bar 14 hari; kanan 7 = timeline + check-in + riwayat (bar horizontal ala **Obvious** 7486593b).
- Klinisi: rail kasus kiri 250px ala **Semrush** / **Optimal Workshop** (0178b96a) ↔ detail kanan + stat tile 4-up.
- Tentang: kartu rigor 3 kolom di desktop.
- Mobile tidak diubah: grid collapse; bottom-nav tetap satu-satunya elemen khusus mobile (`md:hidden`).

**Verifikasi:** `tools/ui_verify.py` ulang — overflow 0px ×5 halaman ×3 viewport, 0 console error, tugas utama + toggle bahasa lolos; bukti `proof/*_desktop.png`.

**Dampak aset:** video demo + screenshot submission dirender ulang dari layout final; frame video 38s diperiksa memperlihatkan workspace dua kolom. Screenshot klinisi terisi ditambah (`tools/klinisi_shot.py`).