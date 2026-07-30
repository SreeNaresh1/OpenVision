"""
Unit tests for SEMPairDataset in datasets/wafer_dataset.py.

Run with:
    python -m pytest tests/test_dataset.py -v
"""
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from datasets.wafer_dataset import SEMPairDataset


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _write_dummy_images(directory: Path, n: int = 5, size: int = 256) -> None:
    """Write n uniform grey PNG images into directory."""
    rng = np.random.default_rng(0)
    for i in range(n):
        img = rng.integers(50, 200, (size, size), dtype=np.uint8)
        cv2.imwrite(str(directory / f"img_{i:03d}.png"), img)


def _denoise_cfg(p_gaussian=0.8, p_poisson=0.5, p_blur=0.7) -> dict:
    return {
        "schema_version": "1.0.0",
        "task": "denoise",
        "patch_size": 64,
        "geometric_augmentation": {
            "horizontal_flip_p": 0.5,
            "vertical_flip_p": 0.5,
            "rotate90_p": 0.5,
        },
        "degradation": {
            "gaussian_noise": {"enabled": True, "p": p_gaussian,
                               "sigma_range": [0.02, 0.06]},
            "poisson_noise": {"enabled": True, "p": p_poisson,
                              "peak_range": [8, 40]},
            "blur": {"enabled": True, "p": p_blur,
                     "types": ["gaussian", "motion"],
                     "gaussian_blur_limit": [3, 5],
                     "motion_blur_limit": [3, 5]},
            "downsample_interpolation": ["bicubic"],
        },
        "normalization": {"mean": 0.5, "std": 0.5},
    }


def _sr_cfg(scale=4) -> dict:
    cfg = _denoise_cfg()
    cfg["task"] = "sr"
    cfg["scale"] = scale
    return cfg


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestSEMPairDatasetDenoise:
    def test_loads_without_error(self, tmp_path):
        _write_dummy_images(tmp_path)
        ds = SEMPairDataset(tmp_path, config=_denoise_cfg(), seed=0)
        assert len(ds) == 5

    def test_sample_keys(self, tmp_path):
        _write_dummy_images(tmp_path)
        ds = SEMPairDataset(tmp_path, config=_denoise_cfg(), seed=0)
        sample = ds[0]
        assert "degraded" in sample
        assert "clean" in sample
        assert "path" in sample
        assert "degradation_meta" in sample

    def test_clean_and_degraded_shapes_match(self, tmp_path):
        _write_dummy_images(tmp_path)
        ds = SEMPairDataset(tmp_path, config=_denoise_cfg(), seed=0)
        sample = ds[0]
        assert sample["clean"].shape == sample["degraded"].shape

    def test_tensor_shape_is_1_H_W(self, tmp_path):
        _write_dummy_images(tmp_path)
        ds = SEMPairDataset(tmp_path, config=_denoise_cfg(), seed=0)
        sample = ds[0]
        assert sample["clean"].ndim == 3
        assert sample["clean"].shape[0] == 1   # single channel

    def test_output_dtype_is_float32(self, tmp_path):
        _write_dummy_images(tmp_path)
        ds = SEMPairDataset(tmp_path, config=_denoise_cfg(), seed=0)
        sample = ds[0]
        assert sample["clean"].dtype.is_floating_point
        assert sample["degraded"].dtype.is_floating_point

    def test_p0_means_no_degradation(self, tmp_path):
        """With all p=0 the pipeline is a no-op: degraded == clean."""
        _write_dummy_images(tmp_path)
        cfg = _denoise_cfg(p_gaussian=0.0, p_poisson=0.0, p_blur=0.0)
        ds = SEMPairDataset(tmp_path, config=cfg, seed=0)
        for i in range(len(ds)):
            sample = ds[i]
            np.testing.assert_array_equal(
                sample["degraded"].numpy(),
                sample["clean"].numpy(),
                err_msg=f"Sample {i}: expected no degradation when all p=0",
            )

    def test_p1_means_degradation_always_applied(self, tmp_path):
        """With all p=1 and non-trivial images, degraded must differ from clean."""
        _write_dummy_images(tmp_path)
        cfg = _denoise_cfg(p_gaussian=1.0, p_poisson=1.0, p_blur=1.0)
        ds = SEMPairDataset(tmp_path, config=cfg, seed=0)
        any_different = False
        for i in range(len(ds)):
            sample = ds[i]
            if not np.allclose(sample["degraded"].numpy(), sample["clean"].numpy()):
                any_different = True
                break
        assert any_different, "With p=1, at least one sample must be degraded"

    def test_meta_schema_keys(self, tmp_path):
        """Returned metadata must have the stable schema keys."""
        _write_dummy_images(tmp_path)
        ds = SEMPairDataset(tmp_path, config=_denoise_cfg(), seed=0)
        meta = ds[0]["degradation_meta"]
        for key in ("schema_version", "sample_id", "task",
                    "gaussian", "poisson", "blur", "downsample"):
            assert key in meta, f"Missing meta key: {key}"


class TestSEMPairDatasetSR:
    def test_degraded_is_smaller(self, tmp_path):
        _write_dummy_images(tmp_path)
        ds = SEMPairDataset(tmp_path, config=_sr_cfg(scale=4), seed=0)
        sample = ds[0]
        _, h_clean, w_clean = sample["clean"].shape
        _, h_deg, w_deg = sample["degraded"].shape
        assert h_deg == h_clean // 4
        assert w_deg == w_clean // 4

    def test_sr_meta_has_downsample_info(self, tmp_path):
        _write_dummy_images(tmp_path)
        ds = SEMPairDataset(tmp_path, config=_sr_cfg(scale=4), seed=0)
        meta = ds[0]["degradation_meta"]
        assert meta["downsample"]["scale"] == 4
        assert meta["downsample"]["interpolation"] is not None
