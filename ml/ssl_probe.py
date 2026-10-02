#!/usr/bin/env python3
"""Latih probe linear di atas embedding SSL + evaluasi eksternal rigor (ADR-007).

Contoh:
  .venv/bin/python ml/ssl_probe.py --emb-dir ml/kaggle/out_ssl/ssl_embeddings \
      --out ml/runs/ssl_eval --supervised-preds ml/runs/eval_external_ens/preds.csv
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parent))
from evaluate import (  # noqa: E402
    bootstrap_auroc,
    ece,
    fit_temperature,
    reliability_plot,
    roc_plot,
    sens_at_spec,
    threshold_at_spec,
)


def sigmoid(z: np.ndarray) -> np.ndarray:
    return 1 / (1 + np.exp(-z))


def load_split(emb_dir: Path, enc: str, split: str) -> tuple[np.ndarray, np.ndarray, list[dict]]:
    X = np.load(emb_dir / f"emb_{enc}_{split}.npy")
    meta = json.loads((emb_dir / f"meta_{split}.json").read_text())
    y = np.array([m["label"] for m in meta])
    return X, y, meta


def band_metrics(y: np.ndarray, p: np.ndarray, tau_low: float, tau_high: float) -> dict:
    band = np.where(p >= tau_high, "rujuk_prioritas", np.where(p < tau_low, "negatif_skrining", "ragu"))
    rep = {}
    for b in ("rujuk_prioritas", "ragu", "negatif_skrining"):
        m = band == b
        rep[b] = {
            "n": int(m.sum()),
            "frac": float(m.mean()),
            "tb_rate": float(y[m].mean()) if m.sum() else None,
        }
    return rep


def full_metrics(y: np.ndarray, p: np.ndarray) -> dict:
    lo, hi = bootstrap_auroc(y, p)
    return {
        "n": int(len(y)),
        "pos": int(y.sum()),
        "auroc": float(roc_auc_score(y, p)),
        "auroc_ci95": [lo, hi],
        "sens_at_spec_90": sens_at_spec(y, p, 0.90),
        "sens_at_spec_70": sens_at_spec(y, p, 0.70),
        "ece": ece(y, p),
        "brier": float(brier_score_loss(y, p)),
    }


def run_encoder(enc: str, emb_dir: Path, out_dir: Path, supervised_preds: Path | None) -> dict:
    Xtr, ytr, _ = load_split(emb_dir, enc, "train")
    Xva, yva, meta_va = load_split(emb_dir, enc, "val")
    Xex, yex, meta_ex = load_split(emb_dir, enc, "external")

    scaler = StandardScaler().fit(Xtr)
    Xtr_s, Xva_s, Xex_s = scaler.transform(Xtr), scaler.transform(Xva), scaler.transform(Xex)

    best = {"auroc": -1.0, "C": None}
    for C in (0.001, 0.01, 0.1, 1.0, 10.0):
        clf = LogisticRegression(C=C, class_weight="balanced", max_iter=3000, solver="lbfgs")
        clf.fit(Xtr_s, ytr)
        z_va = clf.decision_function(Xva_s)
        try:
            auroc = roc_auc_score(yva, sigmoid(z_va))
        except ValueError:
            auroc = float("nan")
        if auroc > best["auroc"]:
            best = {"auroc": float(auroc), "C": C, "clf": clf}
        print(f"  [{enc}] C={C:<6} val AUROC={auroc:.4f}")

    clf: LogisticRegression = best["clf"]
    z_va, z_ex = clf.decision_function(Xva_s), clf.decision_function(Xex_s)
    T = fit_temperature([z_va], yva)
    p_va, p_ex = sigmoid(z_va / T), sigmoid(z_ex / T)

    tau_high = threshold_at_spec(yva, p_va, 0.70)
    tau_low = threshold_at_spec(yva, p_va, 0.95)
    if tau_low > tau_high:
        tau_low, tau_high = tau_high, tau_low

    res = {
        "encoder": enc,
        "chosen_C": best["C"],
        "val": full_metrics(yva, p_va),
        "external": full_metrics(yex, p_ex),
        "temp": T,
        "tau_low": tau_low,
        "tau_high": tau_high,
        "bands_external": band_metrics(yex, p_ex, tau_low, tau_high),
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / f"metrics_{enc}.json").write_text(json.dumps(res, indent=1))
    reliability_plot(yex, p_ex, out_dir / f"reliability_{enc}.png", f"SSL probe {enc} — external")
    roc_plot({f"{enc} (external)": (yex, p_ex)}, out_dir / f"roc_{enc}.png")
    with (out_dir / f"preds_{enc}.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["path", "label", "p", "z"])
        for m, p, z in zip(meta_ex, p_ex, z_ex):
            w.writerow([m["path"], m["label"], float(p), float(z)])

    # stacking dengan ensemble supervised (jika tersedia)
    if supervised_preds and supervised_preds.exists():
        sup = {}
        for row in csv.DictReader(supervised_preds.open()):
            sup[Path(row["path"]).stem] = float(row["p_ens"])
        pairs = [(Path(m["path"]).stem, m["label"], p) for m, p in zip(meta_ex, p_ex)]
        aligned = [(k, lab, p, sup[k]) for k, lab, p in pairs if k in sup]
        if len(aligned) >= 50:
            ya = np.array([a[1] for a in aligned])
            ps = (np.array([a[2] for a in aligned]) + np.array([a[3] for a in aligned])) / 2
            res["stack_with_supervised"] = {**full_metrics(ya, ps), "n_matched": len(aligned)}
            print(f"  [{enc}] stack n={len(aligned)} external AUROC={res['stack_with_supervised']['auroc']:.4f}")

    (out_dir / f"metrics_{enc}.json").write_text(json.dumps(res, indent=1))
    return res


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--emb-dir", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--encoder", nargs="*", default=None, help="default: semua yang ada")
    ap.add_argument("--supervised-preds", type=Path, default=None)
    args = ap.parse_args()

    encs = args.encoder or sorted(
        p.name[len("emb_") : -len("_train.npy")] for p in args.emb_dir.glob("emb_*_train.npy")
    )
    results = []
    for enc in encs:
        print(f"=== {enc} ===")
        results.append(run_encoder(enc, args.emb_dir, args.out, args.supervised_preds))

    print("\n=== RINGKASAN (eksternal) ===")
    for r in results:
        e = r["external"]
        print(f"{r['encoder']:10s} AUROC {e['auroc']:.4f} [{e['auroc_ci95'][0]:.3f},{e['auroc_ci95'][1]:.3f}] "
              f"| sens@spec90 {e['sens_at_spec_90']:.3f} | ECE {e['ece']:.3f}"
              + (f" | stack {r['stack_with_supervised']['auroc']:.4f}" if "stack_with_supervised" in r else ""))


if __name__ == "__main__":
    main()