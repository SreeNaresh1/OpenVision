"""
PyTorch Dataset producing (degraded, clean) training pairs for the
SEM / wafer inspection image restoration task
(Track 1 - KLA, SEMICON India Hackathon 2026).

Usage:
    from datasets.wafer_dataset import SEMPairDataset, seed_worker
    from torch.utils.data import DataLoader

    ds = SEMPairDataset("data/train_clean", config="configs/degradation.yaml", seed=42)
    loader = DataLoader(ds, batch_size=16, shuffle=True, num_workers=4,
                         worker_init_fn=seed_worker)
    batch = next(iter(loader))
    batch["degraded"], batch["clean"]   # both (B, 1, H, W) float32 in [0, 1]
    batch["degradation_meta"]           # list of per-sample metadata dicts

Config's `task` field controls the pairing:
    "denoise" -> degraded and clean are the same resolution.
    "sr"      -> degraded is downsampled by `scale`; clean stays full-res.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional, Union

import albumentations as A
import cv2
import numpy as np
import torch
import yaml
from torch.utils.data import Dataset

from .degradation import SyntheticDegrader, downsample

IMG_EXTENSIONS = (".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff")


def load_config(config: Union[str, Path, dict]) -> dict:
    if isinstance(config, dict):
        return config
    with open(config, "r") as f:
        return yaml.safe_load(f)


def list_images(root: Union[str, Path]) -> list[str]:
    root = Path(root)
    paths = [p for p in root.rglob("*") if p.suffix.lower() in IMG_EXTENSIONS]
    if not paths:
        raise FileNotFoundError(
            f"No images with extensions {IMG_EXTENSIONS} found under {root}. "
            "Point image_dir at a folder of clean SEM/inspection images."
        )
    return sorted(str(p) for p in paths)


def seed_worker(worker_id: int) -> None:
    """
    Pass as `worker_init_fn` to DataLoader when num_workers > 0.

    Without this, every worker process is a fork of the parent and each
    inherits the SAME numpy Generator state, so different workers produce
    IDENTICAL "random" degradations for different images — a subtle bug
    that silently reduces effective training diversity and can make
    validation metrics look more stable (or less) than they really are.
    """
    worker_info = torch.utils.data.get_worker_info()
    if worker_info is None:
        return
    dataset = worker_info.dataset
    base_seed = worker_info.seed % (2**32)
    dataset.rng = np.random.default_rng(base_seed)
    dataset.degrader.rng = dataset.rng


class SEMPairDataset(Dataset):
    def __init__(
        self,
        image_dir: Union[str, Path],
        config: Union[str, Path, dict] = "configs/degradation.yaml",
        split: str = "train",
        seed: Optional[int] = None,
    ):
        self.cfg = load_config(config)
        self.task = self.cfg["task"]
        if self.task not in ("denoise", "sr"):
            raise ValueError(f"cfg['task'] must be 'denoise' or 'sr', got {self.task!r}")
        self.scale = int(self.cfg.get("scale", 1)) if self.task == "sr" else 1
        self.patch_size = int(self.cfg["patch_size"])
        self.split = split

        self.paths = list_images(image_dir)

        self.rng = np.random.default_rng(seed)
        self.degrader = SyntheticDegrader(self.cfg, rng=self.rng)

        aug_cfg = self.cfg.get("geometric_augmentation", {})
        geo_transforms = []
        if split == "train":
            if aug_cfg.get("horizontal_flip_p", 0) > 0:
                geo_transforms.append(A.HorizontalFlip(p=aug_cfg["horizontal_flip_p"]))
            if aug_cfg.get("vertical_flip_p", 0) > 0:
                geo_transforms.append(A.VerticalFlip(p=aug_cfg["vertical_flip_p"]))
            if aug_cfg.get("rotate90_p", 0) > 0:
                geo_transforms.append(A.RandomRotate90(p=aug_cfg["rotate90_p"]))
        self.geo_aug = A.Compose(geo_transforms, seed=seed) if geo_transforms else None

    def __len__(self) -> int:
        return len(self.paths)

    @staticmethod
    def _load_clean(path: str) -> np.ndarray:
        img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            raise IOError(f"Failed to read image: {path}")
        return img.astype(np.float32) / 255.0

    def _random_crop(self, img: np.ndarray, size: int) -> np.ndarray:
        h, w = img.shape[:2]
        if h < size or w < size:
            # Source image smaller than the requested patch — pad rather than
            # skip, so every image in the dataset stays usable.
            pad_h, pad_w = max(0, size - h), max(0, size - w)
            img = cv2.copyMakeBorder(img, 0, pad_h, 0, pad_w, cv2.BORDER_REFLECT_101)
            h, w = img.shape[:2]
        top = int(self.rng.integers(0, h - size + 1))
        left = int(self.rng.integers(0, w - size + 1))
        return img[top : top + size, left : left + size]

    def __getitem__(self, idx: int) -> dict:
        path = self.paths[idx]
        clean_full = self._load_clean(path)

        clean_patch = self._random_crop(clean_full, self.patch_size)

        if self.geo_aug is not None:
            clean_patch = self.geo_aug(image=clean_patch)["image"]

        sample_id = Path(path).name
        degraded, meta = self.degrader.degrade(clean_patch, sample_id=sample_id)

        if self.task == "sr":
            degraded, interp_used = downsample(
                degraded,
                self.scale,
                self.cfg["degradation"]["downsample_interpolation"],
                self.rng,
            )
            # Fill in the downsample fields that degradation.py left as None
            meta["downsample"] = {
                "scale": self.scale,
                "interpolation": interp_used,
            }

        clean_t = torch.from_numpy(np.ascontiguousarray(clean_patch)).unsqueeze(0).float()
        degraded_t = torch.from_numpy(np.ascontiguousarray(degraded)).unsqueeze(0).float()

        return {
            "degraded": degraded_t,
            "clean": clean_t,
            "path": path,
            "degradation_meta": meta,
        }
