"""Ekstraksi embedding SSL untuk studi representasi (ADR-007).

Encoder:
  - dinov2  : timm vit_base_patch14_dinov2.lvd142m      (SSL umum, 518 px)
  - rad_dino: hf-hub:microsoft/rad-dino                 (DINOv2 pada X-ray dada, 518 px)

Output di /kaggle/working/loop-tb/ssl_embeddings/:
  meta_{train,val,external}.json  +  emb_{encoder}_{split}.npy
Dipakai oleh ml/ssl_probe.py secara lokal (sklearn, tanpa GPU).
"""
from __future__ import annotations

import json
import os
import subprocess
import sys

import numpy as np

WORK = "/kaggle/working"
REPO = f"{WORK}/loop-tb"


def sh(cmd: list[str]) -> None:
    print("+", " ".join(map(str, cmd)), flush=True)
    subprocess.run(cmd, check=True)


if not os.path.exists(REPO):
    sh(["git", "clone", "--depth", "1", "https://github.com/Alvnvnc/loop-tb.git", REPO])
os.chdir(REPO)
sh([sys.executable, "-m", "pip", "install", "-q", "timm", "huggingface_hub", "transformers"])

# --- mount datasets (self-healing) ---
os.makedirs("data/raw", exist_ok=True)


def pick(dst: str, cands: list[str], markers: tuple[str, ...]) -> None:
    if os.path.exists(dst):
        return
    for c in cands:
        if any(os.path.isdir(os.path.join(c, m)) for m in markers):
            os.symlink(c, dst)
            print("symlink", dst, "->", c, flush=True)
            return
    for c in cands:
        if os.path.exists(c):
            os.symlink(c, dst)
            print("symlink (fallback)", dst, "->", c, flush=True)
            return
    print("WARNING: tidak ada mount untuk", dst, flush=True)


pick("data/raw/tbx11k-simplified",
     ["/kaggle/input/datasets/vbookshelf/tbx11k-simplified/tbx11k-simplified",
      "/kaggle/input/datasets/vbookshelf/tbx11k-simplified", "/kaggle/input/tbx11k-simplified"],
     ("images",))
pick("data/raw/TB_Chest_Radiography_Database",
     ["/kaggle/input/datasets/tawsifurrahman/tuberculosis-tb-chest-xray-dataset/TB_Chest_Radiography_Database",
      "/kaggle/input/tuberculosis-tb-chest-xray-dataset/TB_Chest_Radiography_Database"],
     ("Normal", "Tuberculosis"))
pick("data/raw/nlm",
     ["/kaggle/input/datasets/alvinreba/nlm-tb-cxr-resized/nlm",
      "/kaggle/input/datasets/alvinreba/nlm-tb-cxr-resized",
      "/kaggle/input/nlm-tb-cxr-resized/nlm",
      "/kaggle/input/nlm-tb-cxr-resized"],
     ("shenzhen", "montgomery"))

# --- siapkan daftar item (external: .png -> .jpg hasil resize) ---
manifest = json.load(open("ml/data/artifacts/manifest.json"))
train_items = manifest["train"]
val_items = manifest["val"]
ext_items = []
for it in manifest["external"]:
    p = it["path"]
    jp = p[:-4] + ".jpg" if p.lower().endswith(".png") else p
    ext_items.append({**it, "path": jp})

for name, items in (("train", train_items), ("val", val_items), ("external", ext_items)):
    missing = [it["path"] for it in items if not os.path.exists(it["path"])]
    print(f"{name}: n={len(items)} missing={len(missing)}", missing[:2], flush=True)
    assert not missing, f"data {name} tidak lengkap"

out_dir = "ssl_embeddings"
os.makedirs(out_dir, exist_ok=True)
for split, items in (("train", train_items), ("val", val_items), ("external", ext_items)):
    with open(f"{out_dir}/meta_{split}.json", "w") as f:
        json.dump([{"path": it["path"], "label": it["label"], "source": it["source"]} for it in items], f)

# --- ekstraksi ---
import torch  # noqa: E402
from PIL import Image  # noqa: E402
from torch.utils.data import DataLoader, Dataset  # noqa: E402
from torchvision import transforms as T  # noqa: E402

MEAN, STD = (0.485, 0.456, 0.406), (0.229, 0.224, 0.225)


class Items(Dataset):
    def __init__(self, items: list[dict], size: int, mean: tuple = MEAN, std: tuple = STD):
        self.items = items
        self.tx = T.Compose([T.Resize(size), T.CenterCrop(size), T.ToTensor(), T.Normalize(mean, std)])

    def __len__(self) -> int:
        return len(self.items)

    def __getitem__(self, i: int):
        with Image.open(self.items[i]["path"]) as im:
            x = self.tx(im.convert("RGB"))
        return x, i


@torch.no_grad()
def extract(model, items: list[dict], size: int, device: torch.device, tag: str,
            mean: tuple = MEAN, std: tuple = STD) -> np.ndarray:
    dl = DataLoader(Items(items, size, mean, std), batch_size=32, shuffle=False, num_workers=4, pin_memory=True)
    out = np.zeros((len(items), 0), dtype=np.float32)
    embs = []
    for bi, (x, _) in enumerate(dl):
        x = x.to(device, non_blocking=True)
        with torch.autocast(device.type, enabled=(device.type == "cuda")):
            feats = model(x)
        feats = feats.float().cpu().numpy()
        embs.append(feats)
        if bi % 20 == 0:
            print(f"  {tag} batch {bi}/{len(dl)}", flush=True)
    out = np.concatenate(embs, axis=0)
    return out


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("device:", device, flush=True)

ENCODERS = [
    ("dinov2", "vit_base_patch14_dinov2.lvd142m", 518),
    ("rad_dino", "hf-hub:microsoft/rad-dino", 518),
]

import timm  # noqa: E402

for enc_name, model_id, size in ENCODERS:
    if all(os.path.exists(f"{out_dir}/emb_{enc_name}_{s}.npy") for s in ("train", "val", "external")):
        print(f"skip {enc_name} (sudah ada)", flush=True)
        continue
    try:
        print(f"=== encoder {enc_name} ({model_id}) ===", flush=True)
        mean, std = MEAN, STD
        if enc_name == "rad_dino":
            from transformers import AutoImageProcessor, AutoModel

            class HFWrap(torch.nn.Module):
                def __init__(self, m):
                    super().__init__()
                    self.m = m

                def forward(self, x):
                    out = self.m(pixel_values=x)
                    return out.last_hidden_state[:, 0] if hasattr(out, "last_hidden_state") else out.pooler_output

            proc = AutoImageProcessor.from_pretrained(model_id)
            print("rad_dino processor:", proc.image_mean, proc.image_std, proc.size, flush=True)
            if proc.image_mean:
                mean, std = tuple(proc.image_mean), tuple(proc.image_std)
            model = HFWrap(AutoModel.from_pretrained(model_id))
        else:
            model = timm.create_model(model_id, pretrained=True, num_classes=0, dynamic_img_size=True)
        model.to(device).eval()
        for split, items in (("train", train_items), ("val", val_items), ("external", ext_items)):
            emb = extract(model, items, size, device, f"{enc_name}/{split}", mean, std)
            np.save(f"{out_dir}/emb_{enc_name}_{split}.npy", emb)
            print(f"{enc_name} {split}: {emb.shape}", flush=True)
        del model
        torch.cuda.empty_cache()
    except Exception as e:  # noqa: BLE001
        print(f"ERROR encoder {enc_name}: {e}", flush=True)

print("SSL EXTRACT DONE", flush=True)