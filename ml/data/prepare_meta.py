#!/usr/bin/env python3
"""Ekstrak metadata klinis NLM (Montgomery + Shenzhen) → CSV untuk analisis subgrup.

Output: ml/data/artifacts/meta_nlm.csv
Kolom: filename,sex,age,reading,scar_flag
- Montgomery: "Patient's Sex: F / Patient's Age: 027Y / <reading>"
- Shenzhen:  "male 45yrs / <reading>" (kadang terkontaminasi antar-file)
- scar_flag: menyebut scar/inactive/fibrosis → untuk pembahasan mode gagal
  "healed scar false positive" (selaras audit Bilal 2026).
"""
from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path

SEX_M = re.compile(r"sex[:\s]+(m|male)\b", re.I)
SEX_F = re.compile(r"sex[:\s]+(f|female)\b", re.I)
SEX_FMT2 = re.compile(r"\b(male|female)\b", re.I)
AGE_MONT = re.compile(r"age[:\s]+(\d{1,3})\s*Y?\b", re.I)
AGE_FMT2 = re.compile(r"\b(\d{1,3})\s*yrs\b", re.I)
SCAR = re.compile(r"scar|inactive|fibro", re.I)


def parse_montgomery(text: str) -> dict | None:
    age = AGE_MONT.search(text)
    sex = "F" if SEX_F.search(text) else ("M" if SEX_M.search(text) else "")
    if not age:
        return None
    # reading = baris setelah Age
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    reading = lines[2] if len(lines) > 2 else ""
    return {"sex": sex, "age": int(age.group(1)), "reading": reading, "scar_flag": int(bool(SCAR.search(reading)))}


def parse_shenzhen(text: str) -> dict | None:
    age = AGE_FMT2.search(text)
    sex_m = SEX_FMT2.findall(text)
    sex = sex_m[0][0].upper() if sex_m else ""
    if not age:
        return None
    # reading = token huruf setelah "yrs"
    tail = text[age.end():]
    reading = ""
    m = re.search(r"[A-Za-z]{2,}", tail)
    if m:
        reading = m.group(0)
    return {"sex": sex, "age": int(age.group(1)), "reading": reading, "scar_flag": 0}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--nlm", type=Path, default=Path("data/raw/nlm"))
    ap.add_argument("--out", type=Path, default=Path("ml/data/artifacts/meta_nlm.csv"))
    args = ap.parse_args()
    args.out.parent.mkdir(parents=True, exist_ok=True)

    rows, n_fail = [], 0
    for corpus, parser in (("montgomery", parse_montgomery), ("shenzhen", parse_shenzhen)):
        d = args.nlm / corpus / "ClinicalReadings"
        for p in sorted(d.glob("*.txt")):
            r = parser(p.read_text(errors="ignore"))
            if r is None:
                n_fail += 1
                continue
            r["filename"] = p.stem + ".png"
            r["corpus"] = corpus
            rows.append(r)

    with args.out.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["filename", "corpus", "sex", "age", "reading", "scar_flag"])
        w.writeheader()
        w.writerows(rows)

    from collections import Counter
    print(f"meta -> {args.out}  n={len(rows)}  gagal-parse={n_fail}")
    print("per korpus:", Counter(r["corpus"] for r in rows))
    print("sex:", Counter(r["sex"] for r in rows))
    print("scar_flag:", Counter(r["scar_flag"] for r in rows))


if __name__ == "__main__":
    main()