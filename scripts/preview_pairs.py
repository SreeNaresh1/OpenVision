"""
Sprint 1.5 sanity check: pulls a handful of (degraded, clean) pairs from
SEMPairDataset, saves a comparison grid, prints PSNR/SSIM between
degraded and clean, and writes a per-sample metadata JSON alongside the
preview image.

Produces two output files:
  outputs/degradation_preview.png    — side-by-side visual grid
  outputs/degradation_preview_meta.json — per-sample degradation metadata

Usage:
    python scripts/preview_pairs.py \\
        --data_dir data/dummy_clean \\
        --config configs/degradation.yaml \\
        --num_samples 6 \\
        --out outputs/degradation_preview.png
"""
import argparse
import json
import sys
from pathlib import Path

import cv2
import matplotlib.pyplot as plt
import numpy as np
from skimage.metrics import peak_signal_noise_ratio as psnr
from skimage.metrics import structural_similarity as ssim

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from datasets.wafer_dataset import SEMPairDataset  # noqa: E402


def upsample_for_display(img: np.ndarray, target_hw: tuple[int, int]) -> np.ndarray:
    return cv2.resize(img, (target_hw[1], target_hw[0]), interpolation=cv2.INTER_NEAREST)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data_dir", required=True)
    ap.add_argument("--config", default="configs/degradation.yaml")
    ap.add_argument("--num_samples", type=int, default=6)
    ap.add_argument("--out", default="outputs/degradation_preview.png")
    ap.add_argument("--seed", type=int, default=0)
    args = ap.parse_args()

    ds = SEMPairDataset(args.data_dir, config=args.config, split="train", seed=args.seed)
    n = min(args.num_samples, len(ds))
    idxs = np.random.default_rng(args.seed).choice(len(ds), size=n, replace=False)

    fig, axes = plt.subplots(n, 3, figsize=(9, 3 * n))
    if n == 1:
        axes = axes[None, :]

    psnr_vals, ssim_vals = [], []
    all_meta = []

    for row, idx in enumerate(idxs):
        sample = ds[int(idx)]
        clean = sample["clean"].squeeze(0).numpy()
        degraded = sample["degraded"].squeeze(0).numpy()
        meta = sample["degradation_meta"]

        degraded_display = degraded
        if degraded.shape != clean.shape:
            # SR task: upsample just for side-by-side viewing (NOT what the
            # model sees — the model gets the small `degraded` tensor as-is).
            degraded_display = upsample_for_display(degraded, clean.shape)

        p = psnr(clean, degraded_display, data_range=1.0)
        s = ssim(clean, degraded_display, data_range=1.0)
        psnr_vals.append(p)
        ssim_vals.append(s)

        # Attach per-sample metrics to metadata
        meta_with_metrics = dict(meta)
        meta_with_metrics["metrics"] = {
            "psnr_db": round(float(p), 3),
            "ssim": round(float(s), 4),
        }
        all_meta.append(meta_with_metrics)

        axes[row, 0].imshow(clean, cmap="gray", vmin=0, vmax=1)
        axes[row, 0].set_title("Clean" if row == 0 else "")
        axes[row, 1].imshow(degraded, cmap="gray", vmin=0, vmax=1)
        title = "Degraded" if degraded.shape == clean.shape else f"Degraded (LR {degraded.shape[::-1]})"
        axes[row, 1].set_title(title if row == 0 else "")
        axes[row, 2].imshow(degraded_display, cmap="gray", vmin=0, vmax=1)
        axes[row, 2].set_title("Degraded (upsampled for display)" if row == 0 else "")

        for col in range(3):
            axes[row, col].axis("off")
        axes[row, 0].text(
            -0.15, 0.5, f"PSNR {p:.1f} dB\nSSIM {s:.2f}",
            transform=axes[row, 0].transAxes, va="center", ha="right", fontsize=8,
        )

    fig.tight_layout()
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_path, dpi=150)
    plt.close(fig)

    # --- Save metadata JSON beside the preview PNG ---
    meta_path = out_path.with_name(out_path.stem + "_meta.json")
    with open(meta_path, "w") as f:
        json.dump(
            {
                "config": args.config,
                "seed": args.seed,
                "num_samples": n,
                "mean_psnr_db": round(float(np.mean(psnr_vals)), 3),
                "mean_ssim": round(float(np.mean(ssim_vals)), 4),
                "samples": all_meta,
            },
            f,
            indent=2,
        )

    print(f"Saved preview grid  -> {out_path}")
    print(f"Saved metadata JSON -> {meta_path}")
    print(f"Mean PSNR(degraded vs clean): {np.mean(psnr_vals):.2f} dB")
    print(f"Mean SSIM(degraded vs clean): {np.mean(ssim_vals):.3f}")
    print(
        "Sanity range: PSNR roughly 15-30 dB and SSIM roughly 0.3-0.8 usually means "
        "'visibly degraded but not destroyed'. If PSNR is >40 dB the degradation is "
        "too weak to matter; if SSIM is near 0 it's likely too strong."
    )


if __name__ == "__main__":
    main()
