"""SIGAP API — inference ensemble (supervised ckpt &/atau probe SSL) + Grad-CAM + band triase.

Jalankan lokal:
    uvicorn api.main:app --host 0.0.0.0 --port 8000

Konfigurasi (default `api/model_config.json`, override env LOOPTB_CONFIG):
{
  "score_members":   [ {"path": "ml/runs/ssl_eval/probe_dinov2.npz"} ],
  "uncertainty_members": [ {"path": "ml/runs/eb0/best.pt", "T": 1.2336},
                           {"path": "ml/runs/convnext/best.pt", "T": 1.3405} ],
  "bands": {"tau_low": ..., "tau_high": ..., "tau_uncertainty": 0.2}
}

Skor p = rata-rata prob anggota `score_members` (model terbaik untuk AUROC eksternal).
Ketidakpastian u = std antar SEMUA anggota unik (disagreement lintas-keluarga SSL↔supervised).
Jika hanya ada satu anggota total, u = 0.
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

app = FastAPI(title="loop-tb (SIGAP)", version="0.4.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=False,
    allow_methods=["*"], allow_headers=["*"],
)

_state: dict = {}


def sigmoid(z: float) -> float:
    return float(1.0 / (1.0 + np.exp(-np.clip(z, -60, 60))))


class HFViT(nn.Module):
    """Pembungkus model HF (mis. RAD-DINO) → CLS token sebagai fitur."""

    def __init__(self, model_id: str):
        super().__init__()
        from transformers import AutoModel

        self.m = AutoModel.from_pretrained(model_id)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out = self.m(pixel_values=x)
        return out.last_hidden_state[:, 0] if hasattr(out, "last_hidden_state") else out.pooler_output


def _load_member(spec: dict) -> dict:
    path = spec["path"]
    if path.endswith(".npz"):
        d = np.load(path, allow_pickle=False)
        enc_type, enc_id = str(d["encoder_type"][0]), str(d["encoder_id"][0])
        model: nn.Module = HFViT(enc_id) if enc_type == "hf" else timm.create_model(
            enc_id, pretrained=True, num_classes=0, dynamic_img_size=True
        )
        return {
            "kind": "probe",
            "model": model.eval(),
            "T": float(d["T"][0]),
            "size": int(d["size"][0]),
            "pixel_mean": tuple(float(v) for v in d["pixel_mean"]),
            "pixel_std": tuple(float(v) for v in d["pixel_std"]),
            "scaler_mean": d["scaler_mean"].astype(np.float32),
            "scaler_scale": d["scaler_scale"].astype(np.float32),
            "coef": d["coef"].astype(np.float32),
            "intercept": float(d["intercept"][0]),
            "path": path,
        }
    ckpt = torch.load(path, map_location="cpu", weights_only=False)
    model = timm.create_model(ckpt["arch"], pretrained=False, num_classes=1)
    model.load_state_dict(ckpt["state_dict"])
    return {
        "kind": "torch",
        "model": model.eval(),
        "T": float(spec.get("T", 1.0)),
        "size": int(ckpt["config"].get("img_size", 224)),
        "path": path,
    }


def _load() -> None:
    cfg = json.loads(CONFIG_PATH.read_text())
    score_specs = cfg.get("score_members") or cfg.get("members") or []
    unc_specs = cfg.get("uncertainty_members") or score_specs
    cache: dict[str, dict] = {}

    def get(spec: dict) -> dict:
        p = spec["path"]
        if p not in cache:
            cache[p] = _load_member(spec)
        return cache[p]

    _state.update(
        score_members=[get(s) for s in score_specs],
        unc_members=[get(s) for s in unc_specs],
        bands={"tau_high": 0.5, "tau_low": 0.5, **cfg.get("bands", {})},
    )
    print(f"[SIGAP] score={len(_state['score_members'])} unc={len(_state['unc_members'])} bands={_state['bands']}")


def _names(members: list[dict]) -> list[str]:
    return [f"{Path(m['path']).parent.name}/{Path(m['path']).name}" for m in members]


def preprocess(img: Image.Image, size: int, mean=MEAN, std=STD) -> torch.Tensor:
    tx = T.Compose([T.Resize(int(size * 1.14)), T.CenterCrop(size), T.ToTensor(), T.Normalize(mean, std)])
    return tx(img.convert("RGB")).unsqueeze(0)


def band_of(p: float, u: float, bands: dict) -> str:
    if u > float(bands.get("tau_uncertainty", 1.0)):
        return "ragu"
    if p >= bands["tau_high"]:
        return "rujuk_prioritas"
    if p < bands["tau_low"]:
        return "negatif_skrining"
    return "ragu"


def infer_prob(member: dict, img: Image.Image) -> float:
    if member["kind"] == "probe":
        x = preprocess(img, member["size"], member.get("pixel_mean", MEAN), member.get("pixel_std", STD))
        with torch.no_grad():
            feats = member["model"](x).float().numpy()[0]
        z = float(((feats - member["scaler_mean"]) / member["scaler_scale"]) @ member["coef"] + member["intercept"])
    else:
        x = preprocess(img, member["size"])
        with torch.no_grad():
            z = float(member["model"](x).squeeze(1).item())
    return sigmoid(z / member["T"])


def _cam_from_tokens(grads: torch.Tensor, acts: torch.Tensor, out_hw: tuple[int, int]) -> torch.Tensor | None:
    g, a = grads[1:], acts[1:]
    n = g.shape[0]
    side = int(round(n ** 0.5))
    if side * side != n:
        return None
    g = g.reshape(side, side, -1)
    a = a.reshape(side, side, -1)
    cam = (g * a).sum(-1).clamp(min=0)[None, None]
    return nn.functional.interpolate(cam, size=out_hw, mode="bilinear", align_corners=False)[0, 0]


def gradcam(member: dict, img: Image.Image) -> np.ndarray | None:
    model = member["model"]
    if member["kind"] == "torch":
        x = preprocess(img, member["size"])
        model.zero_grad(set_to_none=True)
        feats = model.forward_features(x)
        feats.retain_grad()
        model.forward_head(feats).squeeze(1).backward()
        grads, acts = feats.grad, feats
        if grads.dim() == 4:
            w = grads.mean(dim=(2, 3), keepdim=True)
            cam = (w * acts).sum(1, keepdim=True).clamp(min=0)
            cam = nn.functional.interpolate(cam, size=x.shape[-2:], mode="bilinear", align_corners=False)[0, 0]
        else:
            cam = _cam_from_tokens(grads[0], acts[0], tuple(x.shape[-2:]))
    else:
        mean, std = member.get("pixel_mean", MEAN), member.get("pixel_std", STD)
        x = preprocess(img, member["size"], mean, std)
        model.zero_grad(set_to_none=True)
        if hasattr(model, "forward_features"):
            feats = model.forward_features(x)
            pooled = model.forward_head(feats)
        else:
            feats = model.m(pixel_values=x).last_hidden_state
            pooled = feats[:, 0]
        feats = feats if feats.dim() == 3 else feats.flatten(2).transpose(1, 2)
        feats.retain_grad()
        mt = torch.tensor(member["scaler_mean"])
        st = torch.tensor(member["scaler_scale"])
        cf = torch.tensor(member["coef"])
        z = ((pooled[0].float() - mt) / st) @ cf + member["intercept"]
        z.backward()
        cam = _cam_from_tokens(feats.grad[0], feats[0], tuple(x.shape[-2:]))
    if cam is None:
        return None
    cam = cam.detach()
    return (cam / (cam.amax() + 1e-8)).numpy()


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
        "status": "ok" if _state.get("score_members") else "no-model",
        "score_members": _names(_state.get("score_members", [])),
        "uncertainty_members": _names(_state.get("unc_members", [])),
        "bands": _state.get("bands"),
    }


@app.post("/predict")
async def predict(file: UploadFile = File(...)) -> dict:
    if not _state.get("score_members"):
        raise HTTPException(503, "model belum siap")
    raw = await file.read()
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except Exception as e:
        raise HTTPException(400, f"bukan citra valid: {e}")

    score_probs = [infer_prob(m, img) for m in _state["score_members"]]
    extra = [m for m in _state["unc_members"] if m not in _state["score_members"]]
    all_probs = score_probs + [infer_prob(m, img) for m in extra]

    p = float(np.mean(score_probs))
    u = float(np.std(all_probs)) if len(all_probs) > 1 else 0.0
    band = band_of(p, u, _state["bands"])

    cam = gradcam(_state["score_members"][0], img)
    heatmap_b64 = overlay_png(img, cam) if cam is not None else None

    return {
        "p_tb": round(p, 4),
        "uncertainty": round(u, 4),
        "band": band,
        "bands": _state["bands"],
        "members": _names(_state["score_members"]),
        "uncertainty_members": _names(_state["unc_members"]),
        "disclaimer": "Alat triase skrining — bukan diagnosis. Wajib konfirmasi (GeneXpert) oleh tenaga kesehatan.",
        "heatmap_png_b64": heatmap_b64,
    }


# --- UI statis (mode deployment unified: satu Space melayani UI + API) ---
_STATIC = Path(os.environ.get("LOOPTB_STATIC", "static"))
if _STATIC.is_dir():
    from fastapi.staticfiles import StaticFiles

    app.mount("/", StaticFiles(directory=str(_STATIC), html=True), name="ui")
    print(f"[SIGAP] UI statis dilayani dari {_STATIC}")