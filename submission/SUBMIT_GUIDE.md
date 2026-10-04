# Panduan Submit Devpost — SIGAP (field-by-field)

> Estimasi 20 menit. Semua bahan sudah jadi; tugasmu: salin-tempel + upload.

## Pre-flight (cek 2 menit)

- [ ] Repo publik hidup: https://github.com/Alvnvnc/loop-tb
- [ ] Release model: https://github.com/Alvnvnc/loop-tb/releases/tag/models-v1
- [ ] Video sudah di-upload ke YouTube (unlisted) → simpan linknya
- [ ] Space live (hasil deploy) → simpan linknya
- [ ] Gambar siap di `submission/screenshots/`: `skrining_hasil_tb_mobile.png`, `skrining_hasil_normal_mobile.png`, `landing_desktop.png`, `referral_letter_print.png`

## Isian form Devpost

**Project name**
```
SIGAP — calibrated TB screening triage
```

**Elevator pitch** (satu kalimat)
```
One calibrated risk state that compresses the TB care loop: screen, refer, and support — and says "uncertain" when it should.
```

**About the project** → salin seluruh isi `submission/devpost.md` (versi EN final) ke editor Devpost. Pastikan tabel tampil rapi.

**"Built with" (tags)** — ketik satu per satu lalu Enter:
```
python, pytorch, timm, huggingface-transformers, scikit-learn, fastapi, next.js, tailwindcss, kaggle, playwright, ffmpeg
```

**Try it out links**
| Label | URL |
|---|---|
| **Live demo penuh (UI + API RAD-DINO)** | `https://ip-172-26-13-244.tail40f715.ts.net` |
| UI statis (GitHub Pages, API live yang sama) | `https://alvnvnc.github.io/loop-tb/` |
| Source code | `https://github.com/Alvnvnc/loop-tb` |
| Model artifacts | `https://github.com/Alvnvnc/loop-tb/releases/tag/models-v1` |

**Video demo** → tempel link YouTube unlisted.

**Gallery images** → upload 4 gambar di daftar pre-flight (urutan: skrining TB → normal ragu → landing → surat rujukan).

**Additional info / apa yang ingin ditambahkan**
```
Honest-metrics note: internal random-split AUROC is 0.98–0.9999 (an illusion);
external hospital evaluation is 0.887 [0.862–0.909] with sens@spec90 0.713.
19 training images were found leaking into the external test set and removed (perceptual-hash audit).
Model card: docs/05-model-card.md. Research prototype — not a diagnostic device.
```

**Teammates** → isi sesuai akun Devpost kamu (solo: cukup kamu).

## Setelah submit

- [ ] Screenshot halaman konfirmasi submission → simpan di `submission/`
- [ ] Cek email konfirmasi Devpost
- [ ] (Opsional) tweet/post LinkedIn dengan link — bagus untuk jejak portofolio

## Kalau ada masalah di form

- Tabel di About rusak → tempel sebagai plain text + attach PDF `submission/onepager.pdf` sebagai file tambahan.
- Link Space belum aktif → submit tetap bisa (link repo + video sudah cukup); update link setelah Space live (Devpost biasanya mengizinkan edit sampai deadline).