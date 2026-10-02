#!/usr/bin/env python3
"""Build a provenance-aware manifest for TB chest X-ray training.

Sumber & aturan label (lihat docs/02-arsitektur.md):
- TBX11K (Kaggle: vbookshelf/tbx11k-simplified): folder per kelas.
    positif = {tb}; negatif = {healthy, sick}; latent_tb DIKELUARKAN (ambigu).
- Rahman composite (Kaggle: tawsifurrahman/tuberculosis-tb-chest-xray-dataset):
    folder Normal/ -> 0, Tuberculosis/ -> 1.
- NLM Shenzhen/Montgomery: konvensi nama file resmi `*_0` = normal, `*_1` = TB.

Dedup (WAJIB — mitigasi class-conditional acquisition confounding):
1. pHash 64-bit; Hamming <= --dup-threshold dianggap duplikat (union-find transitif).
2. Integritas external: citra train yang sekelompok dengan citra external DIBUANG dari train.
3. Duplikat internal train dibuang (keep-first, urutan deterministik).
4. Split val dilakukan per-klaster (tidak ada kebocoran near-dup train->val).

Output (ml/data/artifacts/):
- manifest.json, dedup_report.json, train.csv, val.csv, external.csv
"""
from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter
from pathlib import Path

import numpy as np
from PIL import Image
from tqdm import tqdm

try:
    import imagehash
except ImportError:  # pragma: no cover
    raise SystemExit("Butuh imagehash: pip install imagehash")

IMG_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff"}
POS_TOKENS = {"tb", "tuberculosis", "tuberculose"}
NEG_TOKENS = {"healthy", "normal", "sick"}
EXCLUDE_TOKENS = {"latent", "latent_tb", "latenttb"}


def _rel(p: Path, root: Path) -> str:
    """Path relatif terhadap root repo (portable lokal <-> Colab); fallback absolut."""
    try:
        return str(p.relative_to(root))
    except ValueError:
        return str(p)


def _tokens(path: Path) -> set[str]:
    parts = [p.lower() for p in path.parts]
    parts += [path.stem.lower()]
    return set(parts)


def load_tbx11k_map(raw: Path) -> dict[str, int | None]:
    """Label otoritatif dari data.csv TBX11K: 1=active_tb, 0=no_tb, None=latent (dikeluarkan)."""
    m: dict[str, int | None] = {}
    for p in raw.rglob("data.csv"):
        if "tbx11k" not in str(p).lower():
            continue
        for r in csv.DictReader(p.open()):
            f = (r.get("fname") or "").strip()
            if not f:
                continue
            t = (r.get("tb_type") or "").lower()
            tgt = (r.get("target") or "").lower()
            if "latent" in t:
                m.setdefault(f, None)
            elif tgt == "tb":
                m[f] = 1
            else:
                m.setdefault(f, 0)
    return m


def classify(path: Path, raw: Path, tbx_map: dict[str, int | None]) -> tuple[int, str] | None:
    """Return (label, source) atau None kalau tidak bisa diklasifikasi."""
    rel = path.relative_to(raw)
    low = str(rel).lower()

    # --- NLM Shenzhen / Montgomery: konvensi suffix nama file ---
    m = re.search(r"(chncxr|mcucxr)_\d+_([01])", path.stem.lower())
    if m:
        label = int(m.group(2))
        source = "shenzhen" if m.group(1) == "chncxr" else "montgomery"
        return label, source

    toks = _tokens(rel)
    if toks & EXCLUDE_TOKENS or any(t.startswith("latent") for t in toks):
        return None

    if "tbx11k" in low:
        if tbx_map:
            lab = tbx_map.get(path.name, None)
            return None if lab is None else (lab, "tbx11k")
        # fallback bila data.csv tidak ada: prefix nama file
        stem = path.stem.lower()
        if stem.startswith("t"):
            return 1, "tbx11k"
        if stem.startswith(("h", "s")):
            return 0, "tbx11k"
        return None

    if toks & POS_TOKENS:
        return 1, "rahman"
    if toks & NEG_TOKENS:
        return 0, "rahman"
    return None


class DSU:
    def __init__(self, n: int):
        self.parent = list(range(n))

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, a: int, b: int) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra != rb:
            self.parent[rb] = ra


_POP = np.array([bin(i).count("1") for i in range(256)], dtype=np.uint8)


def hamming_pairs(hashes: np.ndarray, threshold: int, chunk: int = 512) -> list[tuple[int, int]]:
    """Semua pasangan (i<j) dengan Hamming distance <= threshold (chunked, hemat memori)."""
    n = len(hashes)
    h8 = hashes.view(np.uint8).reshape(n, 8)
    pairs: list[tuple[int, int]] = []
    for start in range(0, n, chunk):
        stop = min(start + chunk, n)
        xor = np.bitwise_xor(h8[start:stop, None, :], h8[None, :, :])
        dist = _POP[xor].sum(axis=-1)  # (chunk, n)
        rows, cols = np.where(dist <= threshold)
        for r, c in zip(rows, cols):
            i, j = start + int(r), int(c)
            if i < j:
                pairs.append((i, j))
    return pairs


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--raw", type=Path, default=Path("data/raw"))
    ap.add_argument("--out", type=Path, default=Path("ml/data/artifacts"))
    ap.add_argument("--dup-threshold", type=int, default=3, help="Hamming pHash <= ini dianggap duplikat")
    ap.add_argument("--val-frac", type=float, default=0.15)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    raw = args.raw.resolve()
    root = raw.parent.parent  # asumsi struktur <root>/data/raw

    # ---------- 1) discovery ----------
    labeled: list[dict] = []
    unlabeled = Counter()
    tbx_map = load_tbx11k_map(raw)
    print(f"[discovery] label TBX11K dari data.csv: {len(tbx_map)} entri")
    for p in sorted(raw.rglob("*")):
        if p.suffix.lower() not in IMG_EXTS:
            continue
        cls = classify(p, raw, tbx_map)
        if cls is None:
            unlabeled[str(p.relative_to(raw).parent)] += 1
            continue
        label, source = cls
        labeled.append({"path": _rel(p, root), "label": label, "source": source})

    print(f"[discovery] berlabel={len(labeled)}  tak-terklasifikasi={sum(unlabeled.values())}")
    for k, v in unlabeled.most_common(10):
        print(f"  skip {v:6d}  {k}")
    if not labeled:
        raise SystemExit("Tidak ada citra berlabel — cek struktur data/raw")

    # ---------- 2) pHash + klaster duplikat ----------
    print("[dedup] menghitung pHash…")
    ok: list[dict] = []
    for item in tqdm(labeled, unit="img"):
        try:
            with Image.open(item["path"]) as im:
                h = imagehash.phash(im.convert("L"), hash_size=8)
            item["phash"] = int(str(h), 16)
            ok.append(item)
        except Exception as e:  # gambar korup
            print(f"  warn: gagal baca {item['path']}: {e}")
    labeled = ok

    hashes = np.array([it["phash"] for it in labeled], dtype=np.uint64)
    pairs = hamming_pairs(hashes, args.dup_threshold)
    dsu = DSU(len(labeled))
    for i, j in pairs:
        dsu.union(i, j)
    for idx, it in enumerate(labeled):
        it["cluster"] = dsu.find(idx)

    by_cluster: dict[int, list[dict]] = {}
    for it in labeled:
        by_cluster.setdefault(it["cluster"], []).append(it)

    # ---------- 3) lock external, buang kebocoran dari train ----------
    ext = [it for it in labeled if it["source"] in ("shenzhen", "montgomery")]
    ext_clusters = {it["cluster"] for it in ext}
    train_pool, dropped_cross = [], []
    for it in labeled:
        if it["source"] in ("shenzhen", "montgomery"):
            continue
        (dropped_cross if it["cluster"] in ext_clusters else train_pool).append(it)

    # duplikat internal train: keep-first per klaster (deterministik via path)
    keep, dropped_internal = [], []
    seen_clusters: set[int] = set()
    for it in sorted(train_pool, key=lambda x: x["path"]):
        if it["cluster"] in seen_clusters:
            dropped_internal.append(it)
        else:
            seen_clusters.add(it["cluster"])
            keep.append(it)
    train_pool = keep

    # ---------- 4) split val per-klaster ----------
    rng = np.random.default_rng(args.seed)
    sizes = Counter(it["cluster"] for it in train_pool)
    pool_clusters = sorted(sizes)
    rng.shuffle(pool_clusters)
    target_val = int(len(train_pool) * args.val_frac)
    val_clusters: set[int] = set()
    acc = 0
    for c in pool_clusters:
        if acc >= target_val:
            break
        val_clusters.add(c)
        acc += sizes[c]
    train = [it for it in train_pool if it["cluster"] not in val_clusters]
    val = [it for it in train_pool if it["cluster"] in val_clusters]

    def dump(items: list[dict]) -> list[dict]:
        return [
            {k: it[k] for k in ("path", "label", "source", "cluster", "phash")}
            for it in sorted(items, key=lambda x: x["path"])
        ]

    manifest = {
        "meta": {
            "root": str(root),
            "raw": _rel(raw, root),
            "dup_threshold": args.dup_threshold,
            "val_frac": args.val_frac,
            "seed": args.seed,
            "counts": {
                "train": len(train), "val": len(val), "external": len(ext),
                "dropped_cross_corpus": len(dropped_cross),
                "dropped_internal_dup": len(dropped_internal),
                "unlabeled": sum(unlabeled.values()),
            },
        },
        "train": dump(train),
        "val": dump(val),
        "external": dump(ext),
    }
    (args.out / "manifest.json").write_text(json.dumps(manifest, indent=1))
    (args.out / "dedup_report.json").write_text(json.dumps({
        "pairs_within_threshold": len(pairs),
        "clusters": len(by_cluster),
        "dropped_cross_corpus": dump(dropped_cross),
        "dropped_internal_dup": dump(dropped_internal),
        "unlabeled_by_dir": dict(unlabeled),
    }, indent=1))

    for split in ("train", "val", "external"):
        with (args.out / f"{split}.csv").open("w") as f:
            f.write("path,label,source,cluster\n")
            for it in manifest[split]:
                f.write(f"{it['path']},{it['label']},{it['source']},{it['cluster']}\n")

    def comp(items):
        c = Counter((it["source"], it["label"]) for it in items)
        return "  ".join(f"{s}/{'TB' if l else 'NEG'}={n}" for (s, l), n in sorted(c.items()))

    print("\n=== RINGKASAN ===")
    print(f"train    n={len(train):6d}  {comp(train)}")
    print(f"val      n={len(val):6d}  {comp(val)}")
    print(f"external n={len(ext):6d}  {comp(ext)}")
    print(f"dibuang  cross-corpus={len(dropped_cross)}  internal-dup={len(dropped_internal)}")
    print(f"manifest -> {args.out/'manifest.json'}")


if __name__ == "__main__":
    main()