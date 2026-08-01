<div align="center">

# OpenVision — SemiCon-AI

**AI-Powered Wafer Image Restoration for Semiconductor Inspection**

Denoising · Super-Resolution · Reproducible ML Pipeline

[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue?logo=python&logoColor=white)](https://www.python.org/)
[![PyTorch 2.1+](https://img.shields.io/badge/pytorch-2.1%2B-EE4C2C?logo=pytorch&logoColor=white)](https://pytorch.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](LICENSE)

</div>

---

## Overview

Semiconductor wafer inspection systems introduce **noise** (Gaussian, Poisson), **blur** (Gaussian, motion), and **low resolution** that degrade defect-detection accuracy at nanometer scale.

**OpenVision** trains deep learning models to reverse these corruptions — producing cleaner, higher-resolution images without a paired real-world dataset by synthetically generating degradation from clean reference images.

### Tasks

| Task | Presets | Description |
|------|---------|-------------|
| **Denoising** | light / medium / heavy | Remove Gaussian and Poisson noise, motion and Gaussian blur |
| **Super-Resolution** | x2 / x4 | Upscale low-resolution wafer imagery |

---

## Project Structure

```
OpenVision/
├── configs/                        # Versioned YAML experiment configs
│   ├── degradation.yaml            # Base config (all tunable parameters)
│   ├── denoise_light.yaml          # Preset: mild noise, no blur
│   ├── denoise_medium.yaml         # Preset: balanced noise + occasional blur
│   ├── denoise_heavy.yaml          # Preset: aggressive noise + frequent blur
│   ├── sr_x2.yaml                  # Preset: super-resolution ×2
│   └── sr_x4.yaml                  # Preset: super-resolution ×4
│
├── datasets/                       # Core data pipeline
│   ├── __init__.py
│   ├── degradation.py              # Noise / blur / downsample + metadata schema
│   ├── wafer_dataset.py            # SEMPairDataset — crop, augment, degrade
│   └── logger.py                   # ExperimentLogger — appends to experiment.csv
│
├── scripts/                        # Utility scripts
│   ├── make_dummy_dataset.py       # Generate placeholder PNGs + manifest.json
│   ├── preview_pairs.py            # Visual QC grid + per-sample *_meta.json
│   └── validate_dataset.py        # Dataset health check (CI-friendly exit codes)
│
├── tests/                          # Unit test suite (37+ tests)
│   ├── __init__.py
│   ├── test_noise.py               # Gaussian + Poisson noise correctness
│   ├── test_downsample.py          # Downsample shape and range
│   ├── test_dataset.py             # Dataset loading, p=0/1, metadata schema
│   └── test_reproducibility.py    # Seed consistency and worker diversity
│
├── docs/                           # Documentation and planning
│   ├── degradation_pipeline.md     # Full technical reference
│   ├── SemiCon-AI_Hackathon_Execution_Plan.docx
│   ├── SemiCon-AI_Project_Plan_Summary.docx
│   ├── SemiCon-AI_Sprint_Planning.docx
│   └── team_weekly_plan.docx
│
├── data/                           # Clean reference images (gitignored)
├── outputs/                        # Generated previews and reports (gitignored)
├── checkpoints/                    # Model weights (gitignored)
│
├── .gitignore
├── requirements-degradation.txt
├── package.json
└── README.md
```

---

## Quickstart

### 1. Clone and install dependencies

```bash
git clone https://github.com/SreeNaresh1/OpenVision.git
cd OpenVision
pip install -r requirements-degradation.txt
```

### 2. Generate dummy data

> Skip this step once you have real wafer images — point `--out` at your clean image directory instead.

```bash
python scripts/make_dummy_dataset.py --out data/dummy_clean --n 20
```

### 3. Validate the dataset

```bash
python scripts/validate_dataset.py --data_dir data/dummy_clean
# Writes  →  outputs/validation_report.json
# Exits 1 →  if corrupt files or duplicates are detected (CI-safe)
```

### 4. Visually inspect degradation

```bash
python scripts/preview_pairs.py \
    --data_dir data/dummy_clean \
    --config   configs/denoise_medium.yaml \
    --num_samples 6
# Writes  →  outputs/degradation_preview.png
#         →  outputs/degradation_preview_meta.json
```

### 5. Run the full test suite

```bash
python -m pytest tests/ -v
# Expected: 37 tests, 0 failures
```

---

## Configuration & Presets

All parameters live in **versioned YAML files** with a `schema_version` field.
Never edit the base config directly — create a new preset file for each experiment.

| Preset | Task | Description |
|--------|------|-------------|
| `denoise_light.yaml` | Denoising | Mild noise, no blur |
| `denoise_medium.yaml` | Denoising | Balanced noise + occasional blur |
| `denoise_heavy.yaml` | Denoising | Aggressive noise + frequent blur |
| `sr_x2.yaml` | Super-Resolution | ×2 upscaling |
| `sr_x4.yaml` | Super-Resolution | ×4 upscaling |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Language | Python 3.10+ | Core implementation |
| Deep Learning | PyTorch 2.1+ | Models, training, GPU, AMP |
| Image Processing | OpenCV 4.8+ | I/O, blur, pixel degradation |
| Numerical | NumPy 1.24+ | Noise generation, array math |
| Augmentation | Albumentations 2.0+ | Geometric pair transforms |
| Metrics | scikit-image 0.22+ | SSIM computation |
| Visualisation | Matplotlib 3.7+ | Preview grids |
| Configuration | PyYAML 6.0+ | Versioned experiment configs |
| Experiment Log | CSV (stdlib) | Zero-dependency run history |
| Testing | pytest | 37+ unit tests |
| CI / CD | GitHub Actions | Lint + test gates on every PR |

---

## Experiment Tracking

Every training run is logged to `outputs/experiment.csv` automatically via `ExperimentLogger`:

```
timestamp | experiment_id | git_commit | config_name | epoch | loss | psnr | ssim
```

The `git_commit` column ties every result back to the exact code version — no external tracking tools required.

---

## Degradation Metadata Schema

Every degraded sample carries a **versioned metadata dict** alongside the image tensor:

```json
{
  "schema_version": "1.0.0",
  "sample_id": "dummy_003.png",
  "task": "denoise",
  "gaussian":   { "applied": true,  "sigma": 0.042 },
  "poisson":    { "applied": false, "peak": null },
  "blur":       { "applied": true,  "type": "gaussian", "kernel": 5 },
  "downsample": { "scale": null,    "interpolation": null }
}
```

---

## Reproducibility

```python
from datasets.wafer_dataset import SEMPairDataset, seed_worker
from torch.utils.data import DataLoader

train_ds = SEMPairDataset(
    root="data/train_clean",
    config="configs/denoise_medium.yaml",
    seed=42
)
train_loader = DataLoader(
    train_ds,
    batch_size=16,
    shuffle=True,
    num_workers=4,
    worker_init_fn=seed_worker   # ← required for deterministic training
)
```

> **Always pass `worker_init_fn=seed_worker`** when `num_workers > 0`.
> Without it, every DataLoader worker inherits an identical RNG state, silently capping training diversity.

---

## Hackathon Timeline

| Phase | Dates | Deliverable |
|-------|-------|-------------|
| Phase 1 — Infrastructure | 30 Jul – 01 Aug | Degradation pipeline, configs, 37 unit tests |
| Phase 2 — Dataset | 02 Aug – 05 Aug | Validation pipeline, experiment logger, preview QC |
| Phase 3 — Baseline Training | 06 Aug – 09 Aug | Denoising baseline, PSNR/SSIM benchmarks |
| Phase 4 — Evaluation | 10 Aug – 12 Aug | SR ×2 inference, consolidated benchmark table |
| Phase 5 — Submission Prep | 13 Aug – 15 Aug | Demo video, technical report, CI polish |
| **Round 1 Deadline** | **16 Aug 2026** | **Final submission** |

---

## Documentation

| Document | Description |
|----------|-------------|
| [degradation_pipeline.md](docs/degradation_pipeline.md) | Full technical reference for the degradation pipeline |
| [SemiCon-AI_Project_Plan_Summary.docx](docs/SemiCon-AI_Project_Plan_Summary.docx) | Project overview, architecture, and tech stack |
| [SemiCon-AI_Sprint_Planning.docx](docs/SemiCon-AI_Sprint_Planning.docx) | Master 10-week engineering roadmap |
| [SemiCon-AI_Hackathon_Execution_Plan.docx](docs/SemiCon-AI_Hackathon_Execution_Plan.docx) | Compressed hackathon execution schedule |
| [team_weekly_plan.docx](docs/team_weekly_plan.docx) | 4-member weekly task and role-rotation plan |

---

## License

MIT License — see [LICENSE](LICENSE) for details.
