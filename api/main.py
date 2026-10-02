"""Loop-TB API — inference + Grad-CAM + band triase.

Jalankan lokal:
    uvicorn api.main:app --host 0.0.0.0 --port 8000

Env:
    LOOPTB_CKPT  path ke checkpoint best.pt (default ml/runs/convnext_tiny/best.pt)
    LOOPTB_BANDS path ke bands.json hasil evaluate.py (opsional; default τ=0.5/0.5)
"""
from __future__ import annotations

import base64
import io
import json
import os
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.cm as cm
import numpy as np
import timm
import torch
import torch.nn as nn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from torchvision import transforms as T

CKPT_PATH = Path(os.environ.get("LOOPTB_CKPT", "ml/runs/convnext_tiny/best.pt"))
BANDS_PATH = Path(os.environ.get("LOOPTB_BANDS", "")) if os.environ.get("LOOPTB_BANDS") else None
MEAN, STD = (0.485, 0.456, 0.406), (0.229, 0.224, 0.225)

app = FastAPI(title="loop-tb", version="0.1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=False,
    allow_methods=["*"], allow_headers=["*"],
)

_state: dict = {}


def _load() -> None:
    if not CKPT_PATH.exists():
        raise RuntimeError(f"Checkpoint tidak ditemukan: {CKPT_PATH}")
    ckpt = torch.load(CKPT_PATH, map_location="cpu", weights_only=False)
    model = timm.create_model(ckpt["arch"], pretrained=False, num_classes=1)
    model.load_state_dict(ckpt["state_dict"])
    model.eval()
    bands = {"tau_high": 0.5, "tau_low": 0.5}
    if BANDS_PATH and BANDS_PATH.exists():
        b = json.loads(BANDS_PATH.read_text())
        bands = {"tau_high": float(b.get("tau_high", 0.5)), "tau_low": float(b.get("tau_low", 0.5))}
    size = int(ckpt["config"].get("img_size", 224))
    _state.update(model=model, arch=ckpt["arch"], img_size=size, bands=bands)
    print(f"[loop-tb] loaded {ckpt['arch']} @ {size}px  bands={bands}")


_tx = None


def preprocess(img: Image.Image) -> torch.Tensor:
    global _tx
    if _tx is None:
        s = _state["img_size"]
        _tx = T.Compose([T.Resize(int(s * 1.14)), T.CenterCrop(s), T.ToTensor(), T.Normalize(MEAN, STD)])
    return _tx(img.convert("RGB")).unsqueeze(0)


def band_of(p: float, bands: dict) -> str:
    if p >= bands["tau_high"]:
        return "rujuk_prioritas"
    if p < bands["tau_low"]:
        return "negatif_skrining"
    return "ragu"


def gradcam(model: nn.Module, x: torch.Tensor) -> np.ndarray:
    """Grad-CAM generik via forward_features (timm), tanpa asumsi arsitektur."""
    model.zero_grad(set_to_none=True)
    feats = model.forward_features(x)
    feats.retain_grad()
    logit = model.forward_head(feats).squeeze(1)
    logit.backward()
    w = feats.grad.mean(dim=(2, 3), keepdim=True)
    cam = (w * feats).sum(dim=1, keepdim=True).clamp(min=0)
    cam = nn.functional.interpolate(cam, size=x.shape[-2:], mode="bilinear", align_corners=False)
    cam = cam / (cam.amax(dim=(2, 3), keepdim=True) + 1e-8)
    return cam[0, 0].detach().numpy()


def overlay_png(img: Image.Image, cam: np.ndarray) -> str:
    img_np = np.asarray(img.convert("RGB").resize((cam.shape[1], cam.shape[0])), dtype=np.float32) / 255.0
    heat = cm.jet(cam)[..., :3]
    alpha = (cam[..., None] * 0.45)
    blend = img_np * (1 - alpha) + heat.astype(np.float32) * alpha
    out = Image.fromarray((np.clip(blend, 0, 1) * 255).astype(np.uint8))
    buf = io.BytesIO()
    out.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


@app.on_event("startup")
def startup() -> None:
    _load()


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "arch": _state.get("arch"),
        "img_size": _state.get("img_size"),
        "bands": _state.get("bands"),
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> dict:
    if "model" not in _state:
        raise HTTPException(503, "model belum siap")
    raw = await file.read()
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except Exception as e:
        raise HTTPException(400, f"bukan citra valid: {e}")

    x = preprocess(img)
    with torch.no_grad():
        logit = _state["model"](x).squeeze(1)
    p = float(torch.sigmoid(logit).item())
    band = band_of(p, _state["bands"])

    cam = gradcam(_state["model"], x)
    heatmap_b64 = overlay_png(img, cam)

    return {
        "p_tb": round(p, 4),
        "band": band,
        "bands": _state["bands"],
        "arch": _state.get("arch"),
        "disclaimer": "Alat triase skrining — bukan diagnosis. Wajib konfirmasi (GeneXpert) oleh tenaga kesehatan.",
        "heatmap_png_b64": heatmap_b64,
    }