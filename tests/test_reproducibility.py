"""
Unit tests for RNG reproducibility in SyntheticDegrader.

Two properties are verified:
  1. Reproducibility  — same seed => identical degraded output.
  2. Diversity        — different seeds => different degraded output.

These tests directly validate that seeding behaves exactly as intended,
which is the most important correctness property for a stochastic pipeline
that must be reproducible across experiments.

Run with:
    python -m pytest tests/test_reproducibility.py -v
"""
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from datasets.degradation import SyntheticDegrader


# ---------------------------------------------------------------------------
# Shared config: all transforms enabled with p=1 for deterministic behaviour
# ---------------------------------------------------------------------------

_CFG_ALL_ON = {
    "schema_version": "1.0.0",
    "task": "denoise",
    "degradation": {
        "gaussian_noise": {"enabled": True, "p": 1.0, "sigma_range": [0.04, 0.04]},
        "poisson_noise": {"enabled": True, "p": 1.0, "peak_range": [20, 20]},
        "blur": {
            "enabled": True, "p": 1.0,
            "types": ["gaussian"],
            "gaussian_blur_limit": [5, 5],
            "motion_blur_limit": [5, 5],
        },
        "downsample_interpolation": ["bicubic"],
    },
}

_CFG_PROBABILISTIC = {
    "schema_version": "1.0.0",
    "task": "denoise",
    "degradation": {
        "gaussian_noise": {"enabled": True, "p": 0.8, "sigma_range": [0.02, 0.06]},
        "poisson_noise": {"enabled": True, "p": 0.5, "peak_range": [8, 40]},
        "blur": {
            "enabled": True, "p": 0.7,
            "types": ["gaussian", "motion"],
            "gaussian_blur_limit": [3, 7],
            "motion_blur_limit": [3, 9],
        },
        "downsample_interpolation": ["bicubic", "bilinear", "area"],
    },
}


@pytest.fixture
def reference_image():
    rng = np.random.default_rng(0)
    return rng.random((64, 64), dtype=np.float32)


# ---------------------------------------------------------------------------
# 1. Reproducibility: same seed -> identical output
# ---------------------------------------------------------------------------

class TestReproducibility:
    def test_same_seed_same_output(self, reference_image):
        """Two degraders with seed=42 must produce bit-identical results."""
        degrader_a = SyntheticDegrader(_CFG_ALL_ON, rng=np.random.default_rng(42))
        degrader_b = SyntheticDegrader(_CFG_ALL_ON, rng=np.random.default_rng(42))
        out_a, _ = degrader_a.degrade(reference_image.copy())
        out_b, _ = degrader_b.degrade(reference_image.copy())
        np.testing.assert_array_equal(
            out_a, out_b,
            err_msg="Same seed must produce identical degraded images",
        )

    def test_same_seed_same_metadata(self, reference_image):
        """Two degraders with seed=42 must produce identical metadata."""
        degrader_a = SyntheticDegrader(_CFG_ALL_ON, rng=np.random.default_rng(42))
        degrader_b = SyntheticDegrader(_CFG_ALL_ON, rng=np.random.default_rng(42))
        _, meta_a = degrader_a.degrade(reference_image.copy())
        _, meta_b = degrader_b.degrade(reference_image.copy())
        assert meta_a["gaussian"]["sigma"] == meta_b["gaussian"]["sigma"]
        assert meta_a["poisson"]["peak"] == meta_b["poisson"]["peak"]
        assert meta_a["blur"]["kernel"] == meta_b["blur"]["kernel"]

    def test_sequential_calls_are_deterministic(self, reference_image):
        """Consecutive calls with the same seeded degrader must be identical
        to replaying the same calls on a freshly seeded degrader."""
        img = reference_image.copy()

        degrader_x = SyntheticDegrader(_CFG_ALL_ON, rng=np.random.default_rng(99))
        results_x = [degrader_x.degrade(img.copy())[0] for _ in range(5)]

        degrader_y = SyntheticDegrader(_CFG_ALL_ON, rng=np.random.default_rng(99))
        results_y = [degrader_y.degrade(img.copy())[0] for _ in range(5)]

        for i, (a, b) in enumerate(zip(results_x, results_y)):
            np.testing.assert_array_equal(a, b, err_msg=f"Call {i} differed")


# ---------------------------------------------------------------------------
# 2. Diversity: different seeds -> different output
# ---------------------------------------------------------------------------

class TestDiversity:
    def test_different_seeds_different_output(self, reference_image):
        """seed=1 and seed=2 must produce different degraded images."""
        degrader_1 = SyntheticDegrader(_CFG_ALL_ON, rng=np.random.default_rng(1))
        degrader_2 = SyntheticDegrader(_CFG_ALL_ON, rng=np.random.default_rng(2))
        out_1, _ = degrader_1.degrade(reference_image.copy())
        out_2, _ = degrader_2.degrade(reference_image.copy())
        assert not np.array_equal(out_1, out_2), \
            "Different seeds must produce different degraded images"

    def test_many_seeds_produce_variety(self, reference_image):
        """10 different seeds should produce at least 2 unique outputs
        (probabilistic — extremely unlikely to fail unless RNG is broken)."""
        outputs = set()
        for seed in range(10):
            degrader = SyntheticDegrader(
                _CFG_PROBABILISTIC, rng=np.random.default_rng(seed)
            )
            out, _ = degrader.degrade(reference_image.copy())
            outputs.add(out.tobytes())
        assert len(outputs) >= 2, \
            "10 different seeds must produce at least 2 distinct degraded images"

    def test_probabilistic_gating_produces_variety(self, reference_image):
        """With p < 1, different samples from the same seed stream should not
        all be identical — the pipeline must be non-deterministic per-sample."""
        degrader = SyntheticDegrader(
            _CFG_PROBABILISTIC, rng=np.random.default_rng(0)
        )
        outputs = [degrader.degrade(reference_image.copy())[0].tobytes()
                   for _ in range(20)]
        unique = set(outputs)
        assert len(unique) >= 2, \
            "Probabilistic pipeline must produce varied outputs across 20 samples"
