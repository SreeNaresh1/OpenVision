"""
Dataset validation script — Sprint 1.5 exit criterion.

Scans an image directory and writes validation_report.json with objective
evidence that the dataset passed inspection. Run this before spending any
GPU time training on a new dataset.

Usage:
    python scripts/validate_dataset.py \\
        --data_dir data/dummy_clean \\
        --config configs/degradation.yaml \\
        --out outputs/validation_report.json

Output example:
    {
      "schema_version": "1.0.0",
      "config": "configs/degradation.yaml",
      "data_dir": "data/dummy_clean",
      "generated_at": "2026-07-30T05:00:00+00:00",
      "images": 20,
      "height": {"min": 256, "max": 256, "mean": 256.0},
      "width":  {"min": 256, "max": 256, "mean": 256.0},
      "channels": {"min": 1, "max": 1},
      "aspect_ratios": {"1.00": 20},
      "file_extensions": {".png": 20},
      "duplicates": 0,
      "corrupt_files": 0,
      "pixel_mean": 0.41,
      "pixel_std":  0.18
    }
"""
import argparse
import hashlib
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
import yaml

IMG_EXTENSIONS = (".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff")


def _file_md5(path: str) -> str:
    """MD5 hash of raw file bytes — used for duplicate detection."""
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def validate(data_dir: str, config: str) -> dict:
    root = Path(data_dir)
    all_paths = sorted(
        str(p) for p in root.rglob("*") if p.suffix.lower() in IMG_EXTENSIONS
    )
    n_total = len(all_paths)

    cfg = {}
    schema_version = "unknown"
    if config:
        try:
            with open(config) as f:
                cfg = yaml.safe_load(f) or {}
            schema_version = cfg.get("schema_version", "unknown")
        except FileNotFoundError:
            pass

    heights, widths, channels = [], [], []
    pixel_sums, pixel_sq_sums, pixel_counts = [], [], []
    ext_counter: Counter = Counter()
    md5_to_paths: dict = defaultdict(list)
    corrupt_files = []

    for path in all_paths:
        ext_counter[Path(path).suffix.lower()] += 1

        # --- Corrupt check ---
        img = cv2.imread(path, cv2.IMREAD_UNCHANGED)
        if img is None:
            corrupt_files.append(path)
            continue

        h, w = img.shape[:2]
        c = 1 if img.ndim == 2 else img.shape[2]
        heights.append(h)
        widths.append(w)
        channels.append(c)

        # Running pixel stats (float32 normalised to [0,1])
        img_f = img.astype(np.float32) / 255.0
        pixel_sums.append(float(img_f.mean()))
        pixel_sq_sums.append(float((img_f ** 2).mean()))
        pixel_counts.append(img_f.size)

        # Duplicate detection via MD5
        md5_to_paths[_file_md5(path)].append(path)

    # Duplicates: any MD5 bucket with more than one path
    duplicate_groups = [paths for paths in md5_to_paths.values() if len(paths) > 1]
    n_duplicates = sum(len(g) - 1 for g in duplicate_groups)

    valid = n_total - len(corrupt_files)

    # Aggregate pixel stats across images (equal weight per image)
    px_mean = float(np.mean(pixel_sums)) if pixel_sums else 0.0
    # E[X^2] - E[X]^2 gives population variance
    px_sq_mean = float(np.mean(pixel_sq_sums)) if pixel_sq_sums else 0.0
    px_std = float(np.sqrt(max(0.0, px_sq_mean - px_mean ** 2)))

    # Aspect ratio distribution (rounded to 2 dp for grouping)
    aspect_ratios: Counter = Counter()
    for h, w in zip(heights, widths):
        ratio = round(w / h, 2)
        aspect_ratios[f"{ratio:.2f}"] += 1

    def _stats(vals: list) -> dict:
        if not vals:
            return {"min": None, "max": None, "mean": None}
        return {
            "min": int(min(vals)),
            "max": int(max(vals)),
            "mean": round(float(np.mean(vals)), 2),
        }

    report = {
        "schema_version": schema_version,
        "config": config,
        "data_dir": str(data_dir),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "images": n_total,
        "valid_images": valid,
        "corrupt_files": len(corrupt_files),
        "corrupt_paths": corrupt_files,
        "duplicates": n_duplicates,
        "duplicate_groups": duplicate_groups,
        "height": _stats(heights),
        "width": _stats(widths),
        "channels": {"min": int(min(channels)) if channels else None,
                     "max": int(max(channels)) if channels else None},
        "aspect_ratios": dict(sorted(aspect_ratios.items(),
                                     key=lambda x: -x[1])),
        "file_extensions": dict(sorted(ext_counter.items(),
                                       key=lambda x: -x[1])),
        "pixel_mean": round(px_mean, 4),
        "pixel_std": round(px_std, 4),
    }
    return report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data_dir", required=True, help="Path to image directory.")
    ap.add_argument("--config", default="configs/degradation.yaml",
                    help="Degradation config (used to read schema_version).")
    ap.add_argument("--out", default="outputs/validation_report.json",
                    help="Path to write validation_report.json.")
    args = ap.parse_args()

    print(f"Scanning {args.data_dir} ...")
    report = validate(args.data_dir, args.config)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(report, f, indent=2)

    # Human-readable summary
    print(f"\n{'='*50}")
    print(f"  Images found   : {report['images']}")
    print(f"  Corrupt files  : {report['corrupt_files']}")
    print(f"  Duplicates     : {report['duplicates']}")
    print(f"  Height         : {report['height']}")
    print(f"  Width          : {report['width']}")
    print(f"  Aspect ratios  : {report['aspect_ratios']}")
    print(f"  Extensions     : {report['file_extensions']}")
    print(f"  Pixel mean/std : {report['pixel_mean']} / {report['pixel_std']}")
    print(f"{'='*50}")

    ok = report["corrupt_files"] == 0 and report["duplicates"] == 0
    status = "PASSED" if ok else "FAILED"
    print(f"\nValidation {status}")
    if not ok:
        sys.exit(1)

    print(f"\nFull report -> {out_path}")


if __name__ == "__main__":
    main()
