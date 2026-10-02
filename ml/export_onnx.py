#!/usr/bin/env python3
"""Export checkpoint ke ONNX (opsi 17) + verifikasi onnxruntime.

Contoh:
  python ml/export_onnx.py --ckpt ml/runs/efficientnet_b0/best.pt --out artifacts/tb_efficientnet_b0.onnx
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import torch

try:
    import timm
except ImportError:  # pragma: no cover
    raise SystemExit("Butuh timm")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--ckpt", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--opset", type=int, default=17)
    args = ap.parse_args()

    ckpt = torch.load(args.ckpt, map_location="cpu", weights_only=False)
    model = timm.create_model(ckpt["arch"], pretrained=False, num_classes=1)
    model.load_state_dict(ckpt["state_dict"])
    model.eval()

    img_size = ckpt["config"].get("img_size", 224)
    dummy = torch.randn(1, 3, img_size, img_size)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        model, dummy, args.out,
        input_names=["input"], output_names=["logit"],
        dynamic_axes={"input": {0: "batch"}, "logit": {0: "batch"}},
        opset_version=args.opset,
    )

    import onnxruntime as ort
    sess = ort.InferenceSession(str(args.out), providers=["CPUExecutionProvider"])
    ref = model(dummy).detach().numpy()
    got = sess.run(None, {"input": dummy.numpy()})[0]
    diff = float(np.abs(ref - got).max())
    size_mb = args.out.stat().st_size / 1e6
    print(f"ONNX ok: {args.out}  ({size_mb:.1f} MB)  max|diff|={diff:.2e}  opset={args.opset}")
    assert diff < 1e-3, "Verifikasi ONNX gagal"


if __name__ == "__main__":
    main()