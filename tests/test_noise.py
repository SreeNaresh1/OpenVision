"""
Unit tests for datasets/degradation.py — noise functions.

Run with:
    python -m pytest tests/test_noise.py -v
"""
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from datasets.degradation import add_gaussian_noise, add_poisson_noise


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def flat_img():
    """Uniform mid-grey 64×64 float32 image."""
    return np.full((64, 64), 0.5, dtype=np.float32)


@pytest.fixture
def rng():
    return np.random.default_rng(seed=42)


# ---------------------------------------------------------------------------
# Gaussian noise
# ---------------------------------------------------------------------------

class TestAddGaussianNoise:
    def test_output_shape_unchanged(self, flat_img, rng):
        out, _ = add_gaussian_noise(flat_img, [0.02, 0.06], rng)
        assert out.shape == flat_img.shape

    def test_output_dtype(self, flat_img, rng):
        out, _ = add_gaussian_noise(flat_img, [0.02, 0.06], rng)
        assert out.dtype == np.float32

    def test_output_range(self, flat_img, rng):
        out, _ = add_gaussian_noise(flat_img, [0.02, 0.06], rng)
        assert out.min() >= 0.0
        assert out.max() <= 1.0

    def test_noise_actually_applied(self, flat_img, rng):
        out, _ = add_gaussian_noise(flat_img, [0.02, 0.06], rng)
        assert not np.allclose(out, flat_img), "Noisy image should differ from clean"

    def test_returned_sigma_in_range(self, flat_img, rng):
        sigma_range = [0.02, 0.06]
        _, sigma = add_gaussian_noise(flat_img, sigma_range, rng)
        assert sigma_range[0] <= sigma <= sigma_range[1]

    def test_zero_sigma_is_noop(self, flat_img, rng):
        out, _ = add_gaussian_noise(flat_img, [0.0, 0.0], rng)
        np.testing.assert_array_equal(out, flat_img)


# ---------------------------------------------------------------------------
# Poisson noise
# ---------------------------------------------------------------------------

class TestAddPoissonNoise:
    def test_output_shape_unchanged(self, flat_img, rng):
        out, _ = add_poisson_noise(flat_img, [8, 40], rng)
        assert out.shape == flat_img.shape

    def test_output_dtype(self, flat_img, rng):
        out, _ = add_poisson_noise(flat_img, [8, 40], rng)
        assert out.dtype == np.float32

    def test_output_range(self, flat_img, rng):
        out, _ = add_poisson_noise(flat_img, [8, 40], rng)
        assert out.min() >= 0.0
        assert out.max() <= 1.0

    def test_noise_actually_applied(self, flat_img, rng):
        out, _ = add_poisson_noise(flat_img, [8, 40], rng)
        assert not np.allclose(out, flat_img), "Noisy image should differ from clean"

    def test_lower_peak_means_higher_variance(self, flat_img):
        """Lower effective photon count should produce noisier output."""
        rng_low = np.random.default_rng(7)
        rng_high = np.random.default_rng(7)
        n_trials = 30
        var_low, var_high = 0.0, 0.0
        for _ in range(n_trials):
            out_low, _ = add_poisson_noise(flat_img, [4, 4], rng_low)
            out_high, _ = add_poisson_noise(flat_img, [80, 80], rng_high)
            var_low += float(np.var(out_low - flat_img))
            var_high += float(np.var(out_high - flat_img))
        assert var_low > var_high, "Low-peak noise must have higher variance"

    def test_returned_peak_in_range(self, flat_img, rng):
        peak_range = [8, 40]
        _, peak = add_poisson_noise(flat_img, peak_range, rng)
        assert peak_range[0] <= peak <= peak_range[1]
