#!/usr/bin/env python3
"""Train TB CXR classifier dari manifest provenance-aware.

Contoh:
  python ml/train.py --manifest ml/data/artifacts/manifest.json --arch efficientnet_b0 \
      --epochs 20 --out ml/runs/efficientnet_b0

Baseline linear probe (fitur beku):
  python ml/train.py ... --freeze --lr 1e-3 --out ml/runs/linear_probe
"""
from __future__ import annotations

import argparse
import csv
import json
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from sklearn.metrics import roc_auc_score, roc_curve
from torch.utils.data import DataLoader, Dataset, WeightedRandomSampler
from torchvision import transforms as T
from tqdm import tqdm

try:
    import timm
except ImportError:  # pragma: no cover
    raise SystemExit("Butuh timm: pip install timm")

MEAN, STD = (0.485, 0.456, 0.406), (0.229, 0.224, 0.225)


class CXRManifest(Dataset):
    def __init__(self, items: list[dict], train: bool, img_size: int):
        self.items = items
        if train:
            self.tx = T.Compose([
                T.RandomResizedCrop(img_size, scale=(0.75, 1.0), ratio=(0.9, 1.1)),
                T.RandomRotation(7, fill=0),
                T.ColorJitter(brightness=0.15, contrast=0.15),
                T.ToTensor(),
                T.Normalize(MEAN, STD),
            ])
        else:
            self.tx = T.Compose([
                T.Resize(int(img_size * 1.14)),
                T.CenterCrop(img_size),
                T.ToTensor(),
                T.Normalize(MEAN, STD),
            ])

    def __len__(self) -> int:
        return len(self.items)

    def __getitem__(self, i: int):
        from PIL import Image
        it = self.items[i]
        with Image.open(it["path"]) as im:
            x = self.tx(im.convert("RGB"))
        return x, torch.tensor(float(it["label"])), i


def sens_at_spec(y: np.ndarray, p: np.ndarray, spec: float) -> float:
    fpr, tpr, _ = roc_curve(y, p)
    ok = 1 - fpr <= spec + 1e-9
    return float(tpr[ok].max()) if ok.any() else float("nan")


@torch.no_grad()
def predict(model: nn.Module, loader: DataLoader, device: torch.device) -> tuple[np.ndarray, np.ndarray]:
    model.eval()
    logits_all, labels_all = [], []
    for x, y, _ in loader:
        x = x.to(device, non_blocking=True)
        with torch.autocast(device.type, enabled=(device.type == "cuda")):
            logits = model(x).squeeze(1).float()
        logits_all.append(logits.cpu().numpy())
        labels_all.append(y.numpy())
    return np.concatenate(logits_all), np.concatenate(labels_all)


def evaluate(logits: np.ndarray, y: np.ndarray) -> dict:
    p = 1 / (1 + np.exp(-logits))
    out = {"n": int(len(y)), "pos": int(y.sum())}
    if len(np.unique(y)) > 1:
        out["auroc"] = float(roc_auc_score(y, p))
        out["sens_at_spec_90"] = sens_at_spec(y, p, 0.90)
        out["sens_at_spec_70"] = sens_at_spec(y, p, 0.70)
    return out


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--manifest", type=Path, required=True)
    ap.add_argument("--arch", default="efficientnet_b0")
    ap.add_argument("--epochs", type=int, default=20)
    ap.add_argument("--batch", type=int, default=32)
    ap.add_argument("--lr", type=float, default=3e-4)
    ap.add_argument("--wd", type=float, default=1e-4)
    ap.add_argument("--img-size", type=int, default=224)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--workers", type=int, default=8)
    ap.add_argument("--freeze", action="store_true", help="linear probe: backbone beku")
    ap.add_argument("--balanced", action="store_true", help="WeightedRandomSampler")
    ap.add_argument("--limit", type=int, default=0, help="smoke test: batasi n sampel (0=semua)")
    args = ap.parse_args()

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    args.out.mkdir(parents=True, exist_ok=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu")
    manifest = json.loads(args.manifest.read_text())

    def take(items: list[dict], n: int) -> list[dict]:
        """Subset berstratifikasi untuk smoke test."""
        if not n:
            return items
        pos = [it for it in items if it["label"] == 1]
        neg = [it for it in items if it["label"] == 0]
        n = min(n, len(items))
        kp = min(len(pos), max(1, n // 4))
        return pos[:kp] + neg[: max(n - kp, 0)]

    train_items = take(manifest["train"], args.limit)
    val_items = take(manifest["val"], args.limit)

    ds_tr = CXRManifest(train_items, train=True, img_size=args.img_size)
    ds_va = CXRManifest(val_items, train=False, img_size=args.img_size)
    sampler = None
    if args.balanced:
        labels = np.array([it["label"] for it in train_items])
        w = np.where(labels == 1, 1.0 / labels.sum(), 1.0 / (len(labels) - labels.sum()))
        sampler = WeightedRandomSampler(torch.from_numpy(w), num_samples=len(labels), replacement=True)
    dl_tr = DataLoader(ds_tr, batch_size=args.batch, shuffle=sampler is None, sampler=sampler,
                       num_workers=args.workers, pin_memory=(device.type == "cuda"), drop_last=True)
    dl_va = DataLoader(ds_va, batch_size=args.batch, shuffle=False, num_workers=args.workers, pin_memory=(device.type == "cuda"))

    model = timm.create_model(args.arch, pretrained=True, num_classes=1).to(device)
    if args.freeze:
        for n, p in model.named_parameters():
            p.requires_grad = "head" in n or "classifier" in n or "fc" in n
    params = [p for p in model.parameters() if p.requires_grad]
    opt = torch.optim.AdamW(params, lr=args.lr, weight_decay=args.wd)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=max(args.epochs, 1))
    loss_fn = nn.BCEWithLogitsLoss()
    scaler = torch.amp.GradScaler(enabled=(device.type == "cuda"))

    print(f"device={device}  arch={args.arch}  freeze={args.freeze}  "
          f"train={len(ds_tr)} val={len(ds_va)}  params={sum(p.numel() for p in params)/1e6:.2f}M")

    hist = []
    best = {"auroc": -1.0, "epoch": -1}
    for epoch in range(1, args.epochs + 1):
        model.train()
        t0, losses = time.time(), []
        for x, y, _ in tqdm(dl_tr, desc=f"epoch {epoch:02d}", leave=False):
            x, y = x.to(device, non_blocking=True), y.to(device, non_blocking=True)
            opt.zero_grad(set_to_none=True)
            with torch.autocast(device.type, enabled=(device.type == "cuda")):
                logits = model(x).squeeze(1)
                loss = loss_fn(logits.float(), y)
            scaler.scale(loss).backward()
            scaler.step(opt)
            scaler.update()
            losses.append(loss.item())
        sched.step()

        logits, y_va = predict(model, dl_va, device)
        m = evaluate(logits, y_va)
        row = {"epoch": epoch, "loss": float(np.mean(losses)), "lr": opt.param_groups[0]["lr"],
               "sec": round(time.time() - t0, 1), **m}
        hist.append(row)
        print(f"epoch {epoch:02d} | loss {row['loss']:.4f} | AUROC {m.get('auroc', float('nan')):.4f} "
              f"| sens@spec90 {m.get('sens_at_spec_90', float('nan')):.3f} | {row['sec']}s")

        torch.save({"arch": args.arch, "state_dict": model.state_dict(), "config": vars(args),
                    "epoch": epoch, "val": m}, args.out / "last.pt")
        if m.get("auroc", -1) > best["auroc"]:
            best = {"auroc": m["auroc"], "epoch": epoch}
            torch.save({"arch": args.arch, "state_dict": model.state_dict(), "config": vars(args),
                        "epoch": epoch, "val": m}, args.out / "best.pt")
            with (args.out / "val_preds.csv").open("w", newline="") as f:
                w = csv.writer(f)
                w.writerow(["path", "label", "logit"])
                for it, lg in zip(val_items, logits):
                    w.writerow([it["path"], it["label"], float(lg)])

    (args.out / "history.csv").write_text(
        "epoch,loss,lr,sec,n,pos,auroc,sens_at_spec_90,sens_at_spec_70\n" + "\n".join(
            ",".join(str(r.get(k, "")) for k in ("epoch", "loss", "lr", "sec", "n", "pos", "auroc", "sens_at_spec_90", "sens_at_spec_70"))
            for r in hist) + "\n")
    (args.out / "metrics.json").write_text(json.dumps({"best": best, "history": hist, "config": vars(args)}, indent=1, default=str))
    print(f"\nBEST epoch {best['epoch']} AUROC {best['auroc']:.4f} -> {args.out/'best.pt'}")


if __name__ == "__main__":
    main()