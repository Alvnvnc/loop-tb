"""Loop-TB API — inference ensemble + Grad-CAM + band triase.

Jalankan lokal:
    uvicorn api.main:app --host 0.0.0.0 --port 8000

Konfigurasi (default `api/model_config.json`, override via env LOOPTB_CONFIG):
{
  "members": [
    {"path": "ml/runs/eb0/best.pt",      "T": 1.23},
    {"path": "ml/runs/convnext/best.pt", "T": 1.34}
  ],
  "bands": {"tau_low": 0.121, "tau_high": 0.421}
}

Probs = rata-rata sigmoid(z_i / T_i); ketidakpastian = std antar anggota.
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

CONFIG_PATH = Path(os.environ.get("LOOPTB_CONFIG", "api/model_config.json"))
MEAN, STD = (0.485, 0.456, 0.406), (0.229, 0.224, 0.225)

app = FastAPI(title="loop-tb (SIGAP)", version="0.2.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=False,
    allow_methods=["*"], allow_headers=["*"],
)

_state: dict = {}


def _load_member(path: str) -> tuple[nn.Module, int]:
    ckpt = torch.load(path, map_location="cpu", weights_only=False)
    model = timm.create_model(ckpt["arch"], pretrained=False, num_classes=1)
    model.load_state_dict(ckpt["state_dict"])
    model.eval()
    return model, int(ckpt["config"].get("img_size", 224))


def _load() -> None:
    cfg = json.loads(CONFIG_PATH.read_text())
    members = []
    for m in cfg["members"]:
        model, size = _load_member(m["path"])
        members.append({"model": model, "T": float(m.get("T", 1.0)), "size": size, "path": m["path"]})
    bands = {"tau_high": 0.5, "tau_low": 0.5, **cfg.get("bands", {})}
    _state.update(members=members, bands=bands)
    print(f"[SIGAP] {len(members)} anggota ensemble dimuat; bands={bands}")


def preprocess(img: Image.Image, size: int) -> torch.Tensor:
    tx = T.Compose([T.Resize(int(size * 1.14)), T.CenterCrop(size), T.ToTensor(), T.Normalize(MEAN, STD)])
    return tx(img.convert("RGB")).unsqueeze(0)


def band_of(p: float, u: float, bands: dict) -> str:
    if u > float(bands.get("tau_uncertainty", 1.0)):
        return "ragu"
    if p >= bands["tau_high"]:
        return "rujuk_prioritas"
    if p < bands["tau_low"]:
        return "negatif_skrining"
    return "ragu"


def gradcam(model: nn.Module, x: torch.Tensor) -> np.ndarray:
    """Grad-CAM generik via forward_features (timm)."""
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
    heat = cm.jet(cam)[..., :3].astype(np.float32)
    alpha = cam[..., None] * 0.45
    blend = img_np * (1 - alpha) + heat * alpha
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
        "status": "ok" if _state.get("members") else "no-model",
        "members": [f"{Path(m['path']).parent.name}/{Path(m['path']).name}" for m in _state.get("members", [])],
        "bands": _state.get("bands"),
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> dict:
    if not _state.get("members"):
        raise HTTPException(503, "model belum siap")
    raw = await file.read()
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except Exception as e:
        raise HTTPException(400, f"bukan citra valid: {e}")

    probs, logit_main = [], None
    for m in _state["members"]:
        x = preprocess(img, m["size"])
        with torch.no_grad():
            logit = m["model"](x).squeeze(1)
        if logit_main is None:
            logit_main = logit
        probs.append(float(torch.sigmoid(logit / m["T"]).item()))

    p = float(np.mean(probs))
    u = float(np.std(probs))
    band = band_of(p, u, _state["bands"])

    cam = gradcam(_state["members"][0]["model"], preprocess(img, _state["members"][0]["size"]))
    heatmap_b64 = overlay_png(img, cam)

    return {
        "p_tb": round(p, 4),
        "uncertainty": round(u, 4),
        "band": band,
        "bands": _state["bands"],
        "members": [f"{Path(m['path']).parent.name}/{Path(m['path']).name}" for m in _state["members"]],
        "disclaimer": "Alat triase skrining — bukan diagnosis. Wajib konfirmasi (GeneXpert) oleh tenaga kesehatan.",
        "heatmap_png_b64": heatmap_b64,
    }