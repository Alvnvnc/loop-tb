# loop-tb — UnivaBio 2026

**Loop triase TB terkalibrasi untuk ujung rantai layanan Indonesia.**

> Status: perencanaan FROZEN (v1) menunggu approval → lihat `docs/`.

## Dokumen

| File | Isi |
|---|---|
| `docs/00-charter.md` | Problem statement, user, win conditions, constraints, ADR log |
| `docs/01-pohon-masalah.md` | Pohon masalah TB → pemilihan wedge + bukti + lanskap solusi |
| `docs/02-arsitektur.md` | Invarian R(x,t), coverage matrix, data plan, protokol evaluasi, stack |
| `docs/03-eksekusi.md` | Timeline D0–D5, deliverables, risk register, change control |

## Struktur (rencana)

```
ml/          # training, evaluasi, export ONNX
api/         # FastAPI + onnxruntime
web/         # Next.js frontend (ID-first, mobile-first)
docs/        # rencana & keputusan
submission/  # 1-pager PDF, code PDF, aset video, writeup
```