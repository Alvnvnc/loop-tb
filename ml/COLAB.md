# Runbook Training (Colab / Kaggle GPU)

Tidak ada GPU lokal (ADR-006) → training di Colab/Kaggle T4. Repo ini diasumsikan sudah di-push ke GitHub.

## 0) Sekali saja — push repo ke GitHub

```bash
gh repo create loop-tb --public --source . --push   # dari root repo
```

## 1) Buka Colab (T4) / Kaggle Notebook (GPU)

Runtime → Change runtime type → T4 GPU.

## 2) Setup environment + kredensial Kaggle

```python
!pip -q install timm imagehash scikit-learn pandas kaggle tqdm onnx onnxruntime
# upload kaggle.json (atau pakai Colab Secrets):
from google.colab import files
files.upload()  # pilih kaggle.json
!mkdir -p ~/.kaggle && mv kaggle.json ~/.kaggle/ && chmod 600 ~/.kaggle/kaggle.json
```

## 3) Clone repo + download data

```python
!git clone https://github.com/Alvnvnc/loop-tb.git
%cd loop-tb
!mkdir -p data/raw
!kaggle datasets download -d vbookshelf/tbx11k-simplified -p data/raw --unzip
!kaggle datasets download -d tawsifurrahman/tuberculosis-tb-chest-xray-dataset -p data/raw --unzip
# NLM Shenzhen + Montgomery (external test) — unduh dari sumber resmi:
# https://data.lhncbc.nlm.nih.gov/public/Tuberculosis-Chest-X-ray-Datasets/
# atau mirror Kaggle (raddar/tuberculosis-chest-xrays-shenzhen). Ekstrak ke data/raw/nlm/
```

## 4) Build manifest (dedup provenance WAJIB)

```python
!python ml/data/prepare_data.py --raw data/raw --out ml/data/artifacts
```

Cek output: jumlah train/val/external + laporan duplikat yang dibuang.

## 5) Training (jalankan berurutan; simpan checkpoint ke Drive)

```python
from google.colab import drive; drive.mount('/content/drive')
!python ml/train.py --manifest ml/data/artifacts/manifest.json \
    --arch efficientnet_b0 --epochs 20 --balanced --out /content/drive/MyDrive/loop-tb/runs/efficientnet_b0
!python ml/train.py --manifest ml/data/artifacts/manifest.json \
    --arch convnext_tiny --epochs 20 --balanced --out /content/drive/MyDrive/loop-tb/runs/convnext_tiny
# baseline (fitur beku):
!python ml/train.py --manifest ml/data/artifacts/manifest.json \
    --arch efficientnet_b0 --freeze --lr 1e-3 --epochs 10 --out /content/drive/MyDrive/loop-tb/runs/linear_probe
```

## 6) Evaluasi rigor (kalibrasi + external transfer + band triase)

```python
!python ml/evaluate.py --runs /content/drive/MyDrive/loop-tb/runs/efficientnet_b0 \
    /content/drive/MyDrive/loop-tb/runs/convnext_tiny \
    --manifest ml/data/artifacts/manifest.json --split external --temp-scale \
    --out /content/drive/MyDrive/loop-tb/runs/eval_external
```

## 7) Export ONNX (untuk API)

```python
!python ml/export_onnx.py --ckpt /content/drive/MyDrive/loop-tb/runs/convnext_tiny/best.pt \
    --out /content/drive/MyDrive/loop-tb/artifacts/convnext_tiny.onnx
```

## Catatan

- Jangan pernah memasukkan citra NLM (external) ke training — manifest sudah melindungi, tapi tetap periksa `dedup_report.json`.
- Jika sesi Colab mati: ulangi dari langkah 3 (data download cepat); checkpoint aman di Drive.