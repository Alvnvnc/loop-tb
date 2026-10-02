"""Kernel uji: verifikasi GPU, internet, versi lib, dan struktur dataset ter-mount."""
import os
import sys

lines: list[str] = []


def log(*a) -> None:
    print(*a, flush=True)
    lines.append(" ".join(str(x) for x in a))


log("python:", sys.version.split()[0])

try:
    import torch

    log("torch:", torch.__version__, "| cuda:", torch.cuda.is_available())
    if torch.cuda.is_available():
        log("gpu:", torch.cuda.get_device_name(0))
except Exception as e:  # noqa: BLE001
    log("torch error:", e)

for mod in ("timm", "sklearn", "onnx", "onnxruntime"):
    try:
        m = __import__(mod)
        log(f"{mod}: {getattr(m, '__version__', '?')}")
    except Exception as e:  # noqa: BLE001
        log(f"{mod}: MISSING ({e})")

log("--- input mounts ---")
for root, dirs, _ in os.walk("/kaggle/input"):
    log(root, "dirs:", dirs[:6])
    if root.count("/") > 3:
        dirs[:] = []

log("HELLO DONE")
with open("/kaggle/working/hello_result.txt", "w") as f:
    f.write("\n".join(lines) + "\n")