#!/usr/bin/env python3
"""Evaluasi rigor: kalibrasi, CI bootstrap, transfer, band triase, subgrup.

Contoh (ensemble + temperature scaling):
  python ml/evaluate.py --runs ml/runs/efficientnet_b0 ml/runs/convnext_tiny \
      --manifest ml/data/artifacts/manifest.json --split external --temp-scale --out ml/runs/eval_external
"""
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import brier_score_loss, roc_auc_score, roc_curve
from torch.utils.data import DataLoader
from tqdm import tqdm

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from train import CXRManifest  # noqa: E402

try:
    import timm
except ImportError:  # pragma: no cover
    raise SystemExit("Butuh timm: pip install timm")


def sigmoid(x: np.ndarray) -> np.ndarray:
    return 1 / (1 + np.exp(-x))


def sens_at_spec(y: np.ndarray, p: np.ndarray, spec: float) -> float:
    """Sensitivitas pada spesifisitas >= spec (mis. spec=0.90 → fpr <= 0.10)."""
    fpr, tpr, _ = roc_curve(y, p)
    ok = fpr <= 1 - spec + 1e-9
    return float(tpr[ok].max()) if ok.any() else float("nan")


def threshold_at_spec(y: np.ndarray, p: np.ndarray, spec: float) -> float:
    fpr, tpr, thr = roc_curve(y, p)
    ok = fpr <= 1 - spec + 1e-9
    return float(thr[ok][np.argmax(tpr[ok])]) if ok.any() else 0.5


def ece(y: np.ndarray, p: np.ndarray, bins: int = 15) -> float:
    edges = np.linspace(0, 1, bins + 1)
    total = 0.0
    for i in range(bins):
        m = (p >= edges[i]) & ((p < edges[i + 1]) if i < bins - 1 else (p <= edges[i + 1]))
        if m.sum():
            total += m.mean() * abs(p[m].mean() - y[m].mean())
    return float(total)


def bootstrap_auroc(y: np.ndarray, p: np.ndarray, n: int = 1000, seed: int = 42) -> tuple[float, float]:
    rng = np.random.default_rng(seed)
    vals = []
    for _ in range(n):
        idx = rng.integers(0, len(y), len(y))
        if len(np.unique(y[idx])) > 1:
            vals.append(roc_auc_score(y[idx], p[idx]))
    return float(np.percentile(vals, 2.5)), float(np.percentile(vals, 97.5))


@torch.no_grad()
def infer(ckpt_path: Path, items: list[dict], img_size: int, device: torch.device, workers: int) -> np.ndarray:
    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    arch = ckpt["arch"]
    model = timm.create_model(arch, pretrained=False, num_classes=1)
    model.load_state_dict(ckpt["state_dict"])
    model.to(device).eval()
    dl = DataLoader(CXRManifest(items, train=False, img_size=img_size), batch_size=64,
                    shuffle=False, num_workers=workers)
    out = []
    for x, _, _ in tqdm(dl, desc=f"infer {ckpt_path.parent.name}", leave=False):
        x = x.to(device)
        with torch.autocast(device.type, enabled=(device.type == "cuda")):
            out.append(model(x).squeeze(1).float().cpu().numpy())
    return np.concatenate(out)


def fit_temperature(val_logits: list[np.ndarray], val_y: np.ndarray) -> float:
    """Cari T>0 yang meminimalkan NLL pada val (grid log-space lebar untuk logit besar)."""
    logits = torch.tensor(np.mean(val_logits, axis=0), dtype=torch.float32)
    y = torch.tensor(val_y, dtype=torch.float32)
    best_t, best_nll = 1.0, float("inf")
    for t in np.logspace(-1, 3.5, 500):
        nll = nn.functional.binary_cross_entropy_with_logits(logits / t, y).item()
        if nll < best_nll:
            best_t, best_nll = float(t), nll
    return best_t


def reliability_plot(y: np.ndarray, p: np.ndarray, path: Path, title: str) -> None:
    edges = np.linspace(0, 1, 11)
    mids, accs = [], []
    for i in range(10):
        m = (p >= edges[i]) & (p < edges[i + 1] if i < 9 else p <= edges[i + 1])
        if m.sum():
            mids.append(p[m].mean())
            accs.append(y[m].mean())
    plt.figure(figsize=(4.2, 4.2))
    plt.plot([0, 1], [0, 1], "--", color="#999", lw=1)
    plt.plot(mids, accs, "o-", color="#d62728", lw=2)
    plt.xlabel("Confidence"), plt.ylabel("Empirical TB rate"), plt.title(title)
    plt.tight_layout(), plt.savefig(path, dpi=160), plt.close()


def roc_plot(curves: dict[str, tuple[np.ndarray, np.ndarray]], path: Path) -> None:
    plt.figure(figsize=(5, 5))
    for name, (y, p) in curves.items():
        fpr, tpr, _ = roc_curve(y, p)
        plt.plot(fpr, tpr, lw=2, label=f"{name} (AUROC {roc_auc_score(y, p):.3f})")
    plt.plot([0, 1], [0, 1], "--", color="#999", lw=1)
    plt.xlabel("FPR"), plt.ylabel("TPR (sensitivitas)"), plt.legend(fontsize=8)
    plt.tight_layout(), plt.savefig(path, dpi=160), plt.close()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--runs", type=Path, nargs="+", required=True)
    ap.add_argument("--manifest", type=Path, required=True)
    ap.add_argument("--split", default="external", choices=["val", "external"])
    ap.add_argument("--temp-scale", action="store_true")
    ap.add_argument("--meta", type=Path, default=None, help="CSV filename,sex,age untuk subgrup (opsional)")
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--workers", type=int, default=8)
    args = ap.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(args.manifest.read_text())
    items = manifest[args.split]
    y = np.array([it["label"] for it in items])

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    per_run_target, per_run_val, tscales = {}, {}, {}
    for run in args.runs:
        ckpt = torch.load(run / "best.pt", map_location="cpu", weights_only=False)
        img_size = ckpt["config"]["img_size"]
        per_run_target[run.name] = infer(run / "best.pt", items, img_size, device, args.workers)
        val_items = manifest["val"]
        per_run_val[run.name] = infer(run / "best.pt", val_items, img_size, device, args.workers)
        if args.temp_scale:
            tscales[run.name] = fit_temperature([per_run_val[run.name]], np.array([it["label"] for it in val_items]))

    per_run_target = {k: sigmoid(v) for k, v in per_run_target.items()}
    per_run_val = {k: sigmoid(v) for k, v in per_run_val.items()}
    val_y = np.array([it["label"] for it in manifest["val"]])

    # kalibrasi per-run pada val, lalu terapkan T ke target (bukan val-fit pada target!)
    if args.temp_scale:
        for k in per_run_target:
            per_run_val[k] = sigmoid(np.log(np.clip(per_run_val[k], 1e-6, 1 - 1e-6) / (1 - np.clip(per_run_val[k], 1e-6, 1 - 1e-6))) / tscales[k])
            lg = np.log(np.clip(per_run_target[k], 1e-6, 1 - 1e-6) / (1 - np.clip(per_run_target[k], 1e-6, 1 - 1e-6)))
            per_run_target[k] = sigmoid(lg / tscales[k])

    # ensemble = rata-rata; ketidakpastian = std antar anggota
    stack_t = np.stack(list(per_run_target.values()))
    p_ens = stack_t.mean(axis=0)
    u_ens = stack_t.std(axis=0)
    stack_v = np.stack(list(per_run_val.values()))
    p_ens_v = stack_v.mean(axis=0)

    tau_high = threshold_at_spec(val_y, p_ens_v, 0.70)   # spec>=0.70 (TPP WHO)
    tau_low = threshold_at_spec(val_y, p_ens_v, 0.95)
    if tau_low > tau_high:
        tau_low, tau_high = tau_high, tau_low

    band = np.where(p_ens >= tau_high, "rujuk_prioritas", np.where(p_ens < tau_low, "negatif_skrining", "ragu"))
    band_report = {}
    for b in ("rujuk_prioritas", "ragu", "negatif_skrining"):
        m = band == b
        band_report[b] = {"n": int(m.sum()), "frac": float(m.mean()),
                          "tb_rate": float(y[m].mean()) if m.sum() else None}

    lo, hi = bootstrap_auroc(y, p_ens)
    metrics = {
        "split": args.split, "n": int(len(y)), "pos": int(y.sum()),
        "auroc": float(roc_auc_score(y, p_ens)), "auroc_ci95": [lo, hi],
        "sens_at_spec_90": sens_at_spec(y, p_ens, 0.90),
        "sens_at_spec_70": sens_at_spec(y, p_ens, 0.70),
        "ece": ece(y, p_ens), "brier": float(brier_score_loss(y, p_ens)),
        "temp_scales": tscales, "tau_low": tau_low, "tau_high": tau_high,
        "bands": band_report,
        "deferral": {"rate": float((band == "ragu").mean()),
                     "tb_rate_on_deferred": float(y[band == "ragu"].mean()) if (band == "ragu").any() else None},
        "per_run_auroc": {k: float(roc_auc_score(y, v)) for k, v in per_run_target.items()},
    }

    if args.meta and args.meta.exists():
        meta = {r["filename"]: r for r in csv.DictReader(args.meta.open())}
        for key in ("sex", "age"):
            groups: dict[str, list[int]] = {}
            for i, it in enumerate(items):
                row = meta.get(Path(it["path"]).name, {})
                g = row.get(key, "NA") or "NA"
                if key == "age":
                    try:
                        a = float(g)
                        g = "0-30" if a < 30 else "30-50" if a < 50 else "50+"
                    except ValueError:
                        g = "NA"
                groups.setdefault(g, []).append(i)
            metrics[f"auroc_by_{key}"] = {
                g: (float(roc_auc_score(y[idx], p_ens[idx])) if len(np.unique(y[idx])) > 1 else None)
                for g, idx in groups.items() if g != "NA" and len(idx) >= 20
            }

    (args.out / "metrics.json").write_text(json.dumps(metrics, indent=1))
    # dump prediksi per-citra (untuk analisis lanjutan & stacking)
    import csv as _csv
    with (args.out / "preds.csv").open("w", newline="") as f:
        w = _csv.writer(f)
        w.writerow(["path", "label", "p_ens", "u_ens"])
        for it, p, u in zip(items, p_ens, u_ens):
            w.writerow([it["path"], it["label"], float(p), float(u)])
    reliability_plot(y, p_ens, args.out / "reliability.png", f"Kalibrasi — {args.split}")
    curves = {f"ens ({args.split})": (y, p_ens)}
    if len(per_run_target) > 1:
        curves.update({k: (y, v) for k, v in per_run_target.items()})
    roc_plot(curves, args.out / "roc.png")

    print("\n=== METRICS ===")
    for k, v in metrics.items():
        if isinstance(v, (int, float, str)):
            print(f"{k:18s} {v}")
    print(f"bands            {band_report}")


if __name__ == "__main__":
    main()