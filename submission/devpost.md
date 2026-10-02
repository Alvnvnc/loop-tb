# SIGAP — calibrated triage for TB screening

**UnivaBio 2026 · AI for Human Health** · Repo: [github.com/Alvnvnc/loop-tb](https://github.com/Alvnvnc/loop-tb)

## Inspiration

Indonesia carries **10% of the world's tuberculosis burden** (WHO Global TB Report 2025). Around **200,000 people each year transmit TB before ever being detected**, and ~125,000 die. The bottleneck is not a lack of doctors or machines — it is **latency**: the care loop (detect → diagnose → treat → monitor) moves slower than the disease transmits. SIGAP attacks that latency directly.

## What it does

One calibrated risk state drives the whole loop, through three interfaces:

1. **Screen** — a health worker uploads a chest X-ray. SIGAP returns a calibrated risk with a **deferral band**: when model families disagree, it answers *“uncertain — human re-read”* instead of forcing a verdict.
2. **Refer** — the score maps to an action band (refer today / re-read / educate) plus a **printable referral letter** for GeneXpert confirmation, aligned with Indonesia's TOSS-TB flow.
3. **Support** — the same risk state follows the patient home: adherence check-ins update the score and trigger **escalation** when it worsens.

The UI is Indonesian-first and mobile-first for community health workers (kaders): under three minutes per patient, audit-friendly outputs, printable artifacts.

## How we built it

- **Data audit first.** Perceptual-hash de-duplication across five public corpora removed **338 internal duplicates** and — critically — **19 training images that had leaked into the external test set**. The frozen split manifest is published in the repo.
- **Supervised baseline.** EfficientNet-B0 and ConvNeXt-Tiny fine-tuned on Kaggle T4 (via the Kaggle API), with balanced sampling, checkpointing, and ONNX export.
- **Representation study (our main experiment).** We compared frozen-feature linear probes across three families: general self-supervised (DINOv2), **chest-X-ray self-supervised (RAD-DINO)**, and supervised fine-tunes — plus combinations and stacking.
- **Calibration & deferral.** Temperature scaling fitted on validation; triage thresholds from target operating points (WHO TPP reference: sensitivity > 90%, specificity > 70%); uncertainty = disagreement across four cross-family members (τ_u = 0.25).
- **Engineering.** FastAPI serving (probe + Grad-CAM over ViT tokens), Next.js front end (screening, patient card, clinician summary, about), automated end-to-end browser tests, and this video produced programmatically (Playwright screencasts + TTS + ffmpeg).

## The honest results

| Evaluation | AUROC | sens@spec90 |
|---|---|---|
| Internal random split *(the illusion)* | 0.98 – 0.9999 | — |
| External hospitals — supervised fine-tune | 0.675 [0.636–0.712] | 0.27 |
| **External — RAD-DINO self-supervised probe (final)** | **0.887 [0.862–0.909]** | **0.71** |

We report **two numbers, not one**. On an internal split our models look perfect — even a frozen linear probe reaches 0.98 — because public TB corpora are contaminated by acquisition artifacts (a confounding mechanism recently documented by Bilal, 2026). On X-rays from hospitals never seen in training, supervised fine-tuning collapses to 0.675 AUROC. Our final model — a **self-supervised chest X-ray representation (RAD-DINO) with a linear probe** — holds **0.887 AUROC and 0.71 sensitivity at 90% specificity**. Ensembling and stacking across families *hurt* here; we tested and report that too.

## Challenges

1. **Dataset contamination** — we measured it, removed what we found, and published the manifest instead of quietly reporting perfect scores.
2. **Threshold transfer** — val-derived triage thresholds over-triage on unseen sites (79.5% flagged for referral in an earlier supervised config). This is exactly why the product ships a deferral band and keeps humans in the loop.
3. **Calibration under domain shift** — external ECE remains 0.25; we report it rather than hide it.

## What's next

Prospective validation with puskesmas partners; per-site threshold calibration (WHO calibration toolkit); cough-audio screening; SITB integration; on-device inference for low-end phones.

## Built with

`python` · `pytorch` · `timm` · `transformers` (RAD-DINO) · `scikit-learn` · `fastapi` · `next.js` · `tailwindcss` · `kaggle-gpu` · `playwright` · `ffmpeg`

**Disclaimer:** This is a research triage prototype, **not a diagnostic device**. Every result must be confirmed by a health professional (GeneXpert). The WHO sensitivity target is not yet met; this is reported as-is.