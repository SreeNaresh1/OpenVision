"""
Lightweight CSV experiment logger — no MLflow, no W&B, no extra dependencies.

Appends one row per call to `experiment.csv`.  Fields include a Git commit
hash so any result can be traced back to the exact code version that
produced it, even months later.

Usage:
    from datasets.logger import ExperimentLogger

    log = ExperimentLogger("outputs/experiment.csv")
    log.log(
        config_name="denoise_medium",
        epoch=10,
        loss=0.0423,
        psnr=28.4,
        ssim=0.81,
    )

CSV columns:
    timestamp       ISO-8601 UTC
    experiment_id   random 8-char hex, same for all rows from one Logger instance
    git_commit      short HEAD hash (or 'unknown')
    config_name     basename of the config file, without extension
    epoch           training epoch number
    loss            training / validation loss
    psnr            PSNR in dB (degraded vs clean, or model output vs clean)
    ssim            SSIM score
"""
from __future__ import annotations

import csv
import os
import secrets
import subprocess
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


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


_COLUMNS = [
    "timestamp",
    "experiment_id",
    "git_commit",
    "config_name",
    "epoch",
    "loss",
    "psnr",
    "ssim",
]


class ExperimentLogger:
    """Thread-safe CSV experiment logger.

    One Logger instance = one experiment run, identified by a unique
    `experiment_id` that is consistent across all rows from that run.

    Parameters
    ----------
    csv_path : path to the output CSV (created + header written if new).
    experiment_id : optional override; auto-generated if None.
    """

    def __init__(
        self,
        csv_path: str | Path = "outputs/experiment.csv",
        experiment_id: Optional[str] = None,
    ):
        self.csv_path = Path(csv_path)
        self.csv_path.parent.mkdir(parents=True, exist_ok=True)
        self.experiment_id = experiment_id or secrets.token_hex(4)
        self.git_commit = _git_commit()
        self._lock = threading.Lock()

        # Write header only when the file does not yet exist (or is empty).
        write_header = not self.csv_path.exists() or self.csv_path.stat().st_size == 0
        if write_header:
            with open(self.csv_path, "w", newline="") as f:
                csv.writer(f).writerow(_COLUMNS)

    def log(
        self,
        config_name: str,
        epoch: int,
        loss: float,
        psnr: float,
        ssim: float,
    ) -> None:
        """Append one row to the CSV and print a summary line to stdout."""
        row = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "experiment_id": self.experiment_id,
            "git_commit": self.git_commit,
            "config_name": Path(config_name).stem,   # strip directory + extension
            "epoch": epoch,
            "loss": f"{loss:.6f}",
            "psnr": f"{psnr:.4f}",
            "ssim": f"{ssim:.4f}",
        }
        with self._lock:
            with open(self.csv_path, "a", newline="") as f:
                writer = csv.DictWriter(f, fieldnames=_COLUMNS)
                writer.writerow(row)

        print(
            f"[{row['timestamp']}] exp={self.experiment_id} "
            f"git={self.git_commit} cfg={row['config_name']} "
            f"epoch={epoch:04d} loss={loss:.4f} "
            f"PSNR={psnr:.2f}dB SSIM={ssim:.4f}"
        )
