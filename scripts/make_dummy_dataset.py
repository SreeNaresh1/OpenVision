"""
Generates placeholder grayscale "circuit-like" images so the degradation
pipeline and dataset loader can be smoke-tested immediately — before the
real SEM/inspection dataset is downloaded or the official dataset is
released. These are NOT a substitute for real data; swap the --data_dir
in preview_pairs.py / training over to the real dataset as soon as it's
available (Sprint 1).

Usage:
    python scripts/make_dummy_dataset.py --out data/dummy_clean --n 20 --size 256

Produces:
    data/dummy_clean/dummy_000.png ... dummy_019.png
    data/dummy_clean/manifest.json   <- self-describing dataset record
"""
import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np


def _git_commit() -> str:
    """Return the short HEAD commit hash, or 'unknown' if git is unavailable."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, timeout=3,
        )
        return result.stdout.strip() if result.returncode == 0 else "unknown"
    except Exception:
        return "unknown"


def make_one(size: int, rng: np.random.Generator) -> np.ndarray:
    img = np.full((size, size), 40, dtype=np.uint8)  # dark substrate background

    # Rectangular "traces" / structures, varying brightness like reflective metal lines.
    n_rects = rng.integers(15, 40)
    for _ in range(n_rects):
        w, h = rng.integers(4, size // 4, size=2)
        x, y = rng.integers(0, size - w), rng.integers(0, size - h)
        brightness = int(rng.integers(120, 230))
        cv2.rectangle(img, (x, y), (x + w, y + h), brightness, thickness=-1)

    # A handful of fine lines, mimicking circuit traces.
    n_lines = rng.integers(5, 15)
    for _ in range(n_lines):
        pt1 = tuple(rng.integers(0, size, size=2).tolist())
        pt2 = tuple(rng.integers(0, size, size=2).tolist())
        brightness = int(rng.integers(150, 255))
        cv2.line(img, pt1, pt2, brightness, thickness=rng.integers(1, 3))

    # Sparse bright dots ("particles" / vias).
    n_dots = rng.integers(10, 30)
    for _ in range(n_dots):
        x, y = rng.integers(0, size, size=2)
        r = int(rng.integers(1, 3))
        cv2.circle(img, (int(x), int(y)), r, int(rng.integers(180, 255)), thickness=-1)

    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="data/dummy_clean")
    ap.add_argument("--n", type=int, default=20)
    ap.add_argument("--size", type=int, default=256)
    ap.add_argument("--seed", type=int, default=0)
    ap.add_argument(
        "--config",
        default="configs/degradation.yaml",
        help="Config file this dataset is intended to be used with (recorded in manifest).",
    )
    args = ap.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(args.seed)
    filenames = []
    for i in range(args.n):
        fname = f"dummy_{i:03d}.png"
        cv2.imwrite(str(out_dir / fname), make_one(args.size, rng))
        filenames.append(fname)

    # --- Write self-describing manifest ---
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generator": "make_dummy_dataset.py",
        "config": args.config,
        "samples": args.n,
        "image_size": args.size,
        "seed": args.seed,
        "git_commit": _git_commit(),
        "python_version": sys.version.split()[0],
        "files": filenames,
    }
    manifest_path = out_dir / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"Wrote {args.n} placeholder images to {out_dir}/")
    print(f"Wrote manifest -> {manifest_path}")


if __name__ == "__main__":
    main()
