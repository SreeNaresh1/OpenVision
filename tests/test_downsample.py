"""
Unit tests for the downsample() function in datasets/degradation.py.

Run with:
    python -m pytest tests/test_downsample.py -v
"""
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from datasets.degradation import downsample


@pytest.fixture
def img_256():
    """Random 256×256 float32 image."""
    rng = np.random.default_rng(0)
    return rng.random((256, 256), dtype=np.float32)


@pytest.fixture
def rng():
    return np.random.default_rng(seed=0)


class TestDownsample:
    @pytest.mark.parametrize("interp", ["bicubic", "bilinear", "area"])
    def test_output_size_x2(self, img_256, interp):
        out, _ = downsample(img_256, scale=2, interpolation_choices=[interp],
                            rng=np.random.default_rng(0))
        assert out.shape == (128, 128), f"Expected 128×128 for ×2, got {out.shape}"

    @pytest.mark.parametrize("interp", ["bicubic", "bilinear", "area"])
    def test_output_size_x4(self, img_256, interp):
        out, _ = downsample(img_256, scale=4, interpolation_choices=[interp],
                            rng=np.random.default_rng(0))
        assert out.shape == (64, 64), f"Expected 64×64 for ×4, got {out.shape}"

    def test_output_range(self, img_256, rng):
        out, _ = downsample(img_256, scale=4,
                            interpolation_choices=["bicubic", "bilinear", "area"],
                            rng=rng)
        # bicubic can overshoot slightly; we only require the clamp stays close
        assert out.min() >= -0.01
        assert out.max() <= 1.01

    def test_returned_interp_name_is_valid(self, img_256, rng):
        valid = {"bicubic", "bilinear", "area", "nearest"}
        _, interp_name = downsample(img_256, scale=2, interpolation_choices=["area"],
                                    rng=rng)
        assert interp_name in valid

    def test_single_pixel_image_does_not_crash(self, rng):
        tiny = np.array([[0.5]], dtype=np.float32)
        out, _ = downsample(tiny, scale=2, interpolation_choices=["nearest"], rng=rng)
        assert out.shape[0] >= 1 and out.shape[1] >= 1
