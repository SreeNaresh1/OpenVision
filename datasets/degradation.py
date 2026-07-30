"""
Synthetic degradation pipeline for SEM / optical wafer-inspection images.

Deliberately implemented with plain OpenCV + NumPy rather than
Albumentations' built-in noise transforms. Albumentations' noise APIs
(GaussNoise's parameters, in particular) have changed signature across
major versions, and this pipeline needs to behave identically regardless
of which Albumentations version a teammate happens to have installed.
Albumentations is still used, in wafer_dataset.py, for the geometric
augmentation (flip/rotate) where the API is stable.

Pipeline order (matches the problem statement's degradation story):
    clean -> Gaussian noise -> Poisson noise -> blur -> [downsample if SR]

Metadata schema (returned by SyntheticDegrader.degrade)
-------------------------------------------------------
Every call to degrade() returns a (image, meta) tuple where meta is a
dict with a stable, versioned structure:

    {
        "schema_version": "1.0.0",
        "sample_id": "000123.png",          # set by caller; None if not provided
        "task": "denoise",
        "gaussian": {
            "applied": True,
            "sigma": 0.042
        },
        "poisson": {
            "applied": False,
            "peak": null
        },
        "blur": {
            "applied": True,
            "type": "gaussian",
            "kernel": 5
        },
        "downsample": {
            "scale": 4,                     # null when task == denoise
            "interpolation": "area"         # null when task == denoise
        }
    }

Adding a new field? Bump schema_version in the config and add a migration
note in docs/degradation_pipeline.md.
"""
from __future__ import annotations

from typing import Optional, Sequence, Tuple

import cv2
import numpy as np

_INTERP_MAP = {
    "bicubic": cv2.INTER_CUBIC,
    "bilinear": cv2.INTER_LINEAR,
    "area": cv2.INTER_AREA,
    "nearest": cv2.INTER_NEAREST,
}


def add_gaussian_noise(
    img: np.ndarray, sigma_range: Sequence[float], rng: np.random.Generator
) -> Tuple[np.ndarray, float]:
    """img: float32 in [0, 1]. sigma_range: (min, max) std, same [0,1] units.

    Returns (noisy_img, sigma_used).
    """
    sigma = float(rng.uniform(sigma_range[0], sigma_range[1]))
    noise = rng.normal(0.0, sigma, img.shape).astype(np.float32)
    return np.clip(img + noise, 0.0, 1.0), sigma


def add_poisson_noise(
    img: np.ndarray, peak_range: Sequence[float], rng: np.random.Generator
) -> Tuple[np.ndarray, float]:
    """
    Signal-dependent shot noise — dominant in low-light SEM/optical capture.
    `peak` is the effective photon/electron count: lower peak -> noisier.

    Returns (noisy_img, peak_used).
    """
    peak = float(rng.uniform(peak_range[0], peak_range[1]))
    safe_img = np.clip(img, 0.0, 1.0)
    noisy = rng.poisson(safe_img * peak).astype(np.float32) / peak
    return np.clip(noisy, 0.0, 1.0), peak


def _motion_blur_kernel(kernel_size: int, angle: float) -> np.ndarray:
    kernel = np.zeros((kernel_size, kernel_size), dtype=np.float32)
    kernel[kernel_size // 2, :] = 1.0
    center = (kernel_size / 2 - 0.5, kernel_size / 2 - 0.5)
    rot_matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
    kernel = cv2.warpAffine(kernel, rot_matrix, (kernel_size, kernel_size))
    total = kernel.sum()
    return kernel / total if total > 1e-8 else kernel


def _odd_int_in_range(low: int, high: int, rng: np.random.Generator) -> int:
    """Sample an odd kernel size in [low, high] (both inclusive, forced odd)."""
    low = low if low % 2 == 1 else low + 1
    high = high if high % 2 == 1 else high - 1
    if high < low:
        return low
    choices = np.arange(low, high + 1, 2)
    return int(rng.choice(choices))


def apply_blur(
    img: np.ndarray, cfg: dict, rng: np.random.Generator
) -> Tuple[np.ndarray, str, int]:
    """Returns (blurred_img, blur_type, kernel_size)."""
    kind = str(rng.choice(cfg["types"]))
    if kind == "gaussian":
        k = _odd_int_in_range(*cfg["gaussian_blur_limit"], rng)
        return cv2.GaussianBlur(img, (k, k), 0), kind, k
    if kind == "motion":
        k = _odd_int_in_range(*cfg["motion_blur_limit"], rng)
        angle = float(rng.uniform(0, 360))
        kernel = _motion_blur_kernel(k, angle)
        return cv2.filter2D(img, -1, kernel), kind, k
    return img, kind, 0


def downsample(
    img: np.ndarray,
    scale: int,
    interpolation_choices: Sequence[str],
    rng: np.random.Generator,
) -> Tuple[np.ndarray, str]:
    """Returns (downsampled_img, interpolation_name_used)."""
    interp_name = str(rng.choice(list(interpolation_choices)))
    interp = _INTERP_MAP[interp_name]
    h, w = img.shape[:2]
    new_w, new_h = max(1, w // scale), max(1, h // scale)
    return cv2.resize(img, (new_w, new_h), interpolation=interp), interp_name


class SyntheticDegrader:
    """Builds the full clean -> degraded transform from a config dict.

    The degrader is stateless between calls — all randomness goes through
    the supplied `rng`, so results are fully reproducible given the same seed.
    """

    def __init__(self, cfg: dict, rng: np.random.Generator | None = None):
        self.cfg = cfg
        self.rng = rng if rng is not None else np.random.default_rng()

    def degrade(
        self,
        clean: np.ndarray,
        sample_id: Optional[str] = None,
    ) -> Tuple[np.ndarray, dict]:
        """
        clean: float32 array in [0, 1], shape (H, W) or (H, W, C).

        Returns (degraded, meta) where meta follows the stable schema
        documented in this module's docstring.

        Probabilistic gating: each degradation stage is independently
        skipped with probability (1 - p). This means image A might receive
        only Gaussian noise while image B receives only Poisson + blur,
        producing a more diverse training distribution than applying every
        transform to every image.
        """
        img = clean.astype(np.float32, copy=True)
        d = self.cfg["degradation"]
        schema_ver = self.cfg.get("schema_version", "1.0.0")
        task = self.cfg.get("task", "denoise")

        # --- Gaussian noise ---
        g_cfg = d["gaussian_noise"]
        if g_cfg["enabled"] and self.rng.random() < g_cfg["p"]:
            img, sigma_used = add_gaussian_noise(img, g_cfg["sigma_range"], self.rng)
            gaussian_meta = {"applied": True, "sigma": round(sigma_used, 6)}
        else:
            gaussian_meta = {"applied": False, "sigma": None}

        # --- Poisson noise ---
        p_cfg = d["poisson_noise"]
        if p_cfg["enabled"] and self.rng.random() < p_cfg["p"]:
            img, peak_used = add_poisson_noise(img, p_cfg["peak_range"], self.rng)
            poisson_meta = {"applied": True, "peak": round(peak_used, 4)}
        else:
            poisson_meta = {"applied": False, "peak": None}

        # --- Blur ---
        b_cfg = d["blur"]
        if b_cfg["enabled"] and self.rng.random() < b_cfg["p"]:
            img, blur_type, kernel_size = apply_blur(img, b_cfg, self.rng)
            blur_meta = {"applied": True, "type": blur_type, "kernel": kernel_size}
        else:
            blur_meta = {"applied": False, "type": None, "kernel": None}

        meta: dict = {
            "schema_version": schema_ver,
            "sample_id": sample_id,
            "task": task,
            "gaussian": gaussian_meta,
            "poisson": poisson_meta,
            "blur": blur_meta,
            # downsample is populated by the dataset when task == "sr"
            "downsample": {"scale": None, "interpolation": None},
        }

        return np.clip(img, 0.0, 1.0).astype(np.float32), meta
