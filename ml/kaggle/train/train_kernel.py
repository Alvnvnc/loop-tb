"""Kernel training loop-tb: clone repo → symlink dataset → train 2 arsitektur + baseline → export ONNX.

Output di /kaggle/working/loop-tb/{runs,artifacts}; diunduh via `kaggle kernels output`.
Manifest yang dipakai = split v1 frozen dari repo (deterministik; NLM external tidak dibutuhkan di sini).
"""
import json
import os
import subprocess
import sys

WORK = "/kaggle/working"
REPO = f"{WORK}/loop-tb"


def sh(cmd: list[str], **kw) -> None:
    print("+", " ".join(map(str, cmd)), flush=True)
    subprocess.run(cmd, check=True, **kw)


# 1) repo + deps
if not os.path.exists(REPO):
    sh(["git", "clone", "--depth", "1", "https://github.com/Alvnvnc/loop-tb.git", REPO])
os.chdir(REPO)
sh([sys.executable, "-m", "pip", "install", "-q", "timm", "onnxruntime"])

# 2) symlink dataset ke struktur yang diharapkan manifest (tahan variasi struktur mount)
os.makedirs("data/raw", exist_ok=True)


def pick(dst: str, cands: list[str], markers: tuple[str, ...]) -> None:
    """Symlink kandidat mount pertama yang punya 'marker' (images/Normal/Tuberculosis)."""
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
    print("WARNING: tidak ada kandidat mount untuk", dst, flush=True)


TBX_CANDS = [
    "/kaggle/input/datasets/vbookshelf/tbx11k-simplified/tbx11k-simplified",
    "/kaggle/input/datasets/vbookshelf/tbx11k-simplified",
    "/kaggle/input/tbx11k-simplified/tbx11k-simplified",
    "/kaggle/input/tbx11k-simplified",
]
RAH_CANDS = [
    "/kaggle/input/datasets/tawsifurrahman/tuberculosis-tb-chest-xray-dataset/TB_Chest_Radiography_Database",
    "/kaggle/input/tuberculosis-tb-chest-xray-dataset/TB_Chest_Radiography_Database",
]
pick("data/raw/tbx11k-simplified", TBX_CANDS, ("images",))
pick("data/raw/TB_Chest_Radiography_Database", RAH_CANDS, ("Normal", "Tuberculosis"))

for root, dirs, files in os.walk("/kaggle/input"):
    print("mount:", root, "dirs:", dirs[:6], "files:", len(files), flush=True)
    if root.count("/") > 4:
        dirs[:] = []

# 3) sanity: semua path train/val harus ada
manifest = json.load(open("ml/data/artifacts/manifest.json"))
missing = [it["path"] for s in ("train", "val") for it in manifest[s] if not os.path.exists(it["path"])]
print(f"train={len(manifest['train'])} val={len(manifest['val'])} missing={len(missing)}", flush=True)
print("missing contoh:", missing[:3], flush=True)
assert not missing, "data train/val tidak lengkap — cek mount dataset"

# 4) training (dua arsitektur + baseline fitur beku)
JOBS = [
    ("efficientnet_b0", "runs/eb0", ["--epochs", "14", "--batch", "64"]),
    ("convnext_tiny", "runs/convnext", ["--epochs", "12", "--batch", "48"]),
]
for arch, out, extra in JOBS:
    sh(
        [sys.executable, "ml/train.py", "--manifest", "ml/data/artifacts/manifest.json",
         "--arch", arch, "--balanced", "--out", out, *extra]
    )

sh(
    [sys.executable, "ml/train.py", "--manifest", "ml/data/artifacts/manifest.json",
     "--arch", "efficientnet_b0", "--freeze", "--lr", "1e-3", "--epochs", "8", "--batch", "64",
     "--out", "runs/linear_probe"]
)

# 5) export ONNX (satu file mandiri per model)
os.makedirs("artifacts", exist_ok=True)
for run, name in (("runs/eb0", "eb0"), ("runs/convnext", "convnext")):
    sh([sys.executable, "ml/export_onnx.py", "--ckpt", f"{run}/best.pt", "--out", f"artifacts/{name}.onnx"])

print("ALL DONE", flush=True)