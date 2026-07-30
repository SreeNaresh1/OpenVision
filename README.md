# OpenVision — SemiCon-AI

> **AI-Powered Wafer Image Restoration** — Denoising & Super-Resolution for Semiconductor Inspection Imagery

[![CI](https://github.com/SreeNaresh1/OpenVision/actions/workflows/ci.yml/badge.svg)](https://github.com/SreeNaresh1/OpenVision/actions)
[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue)](https://www.python.org/)
[![PyTorch 2.1+](https://img.shields.io/badge/pytorch-2.1%2B-orange)](https://pytorch.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Overview

Semiconductor manufacturing relies on wafer inspection imagery (SEM / optical) to detect nanometer-scale defects.
Inspection systems introduce **noise** (Gaussian, Poisson), **blur** (Gaussian, motion), and **low resolution** that degrade detection accuracy.

**OpenVision** trains deep learning models to reverse these corruptions — producing cleaner, higher-resolution images without a paired real-world dataset by generating synthetic degradation from clean reference images.

**Tasks:**
- Image **Denoising** — light / medium / heavy noise presets
- **Super-Resolution** — x2 and x4 upscaling

---

## Project Structure

`
OpenVision/
├── configs/                    # Versioned YAML experiment configs
│   ├── degradation.yaml        # Base config (all tunable parameters)
│   ├── denoise_light.yaml      # Preset: mild noise, no blur
│   ├── denoise_medium.yaml     # Preset: balanced noise + occasional blur
│   ├── denoise_heavy.yaml      # Preset: aggressive noise + frequent blur
│   ├── sr_x2.yaml              # Preset: super-resolution x2
│   └── sr_x4.yaml              # Preset: super-resolution x4
│
├── datasets/                   # Core data pipeline
│   ├── degradation.py          # Noise / blur / downsample + metadata schema
│   ├── wafer_dataset.py        # SEMPairDataset — crop, augment, degrade
│   └── logger.py               # ExperimentLogger — appends to experiment.csv
│
├── scripts/                    # Utility scripts
│   ├── make_dummy_dataset.py   # Generate placeholder PNGs + manifest.json
│   ├── preview_pairs.py        # Visual QC grid + per-sample *_meta.json
│   └── validate_dataset.py     # Dataset health check (CI-friendly exit codes)
│
├── tests/                      # Unit test suite (37+ tests)
│   ├── test_noise.py           # Gaussian + Poisson noise correctness
│   ├── test_downsample.py      # Downsample size and range
│   ├── test_dataset.py         # Dataset loading, p=0/1, metadata schema
│   └── test_reproducibility.py # Seed consistency and diversity
│
├── docs/                       # Documentation and project planning
│   ├── degradation_pipeline.md         # Full technical reference
│   ├── SemiCon-AI_Project_Plan_Summary.docx
│   ├── SemiCon-AI_Sprint_Planning.docx
│   ├── SemiCon-AI_Hackathon_Execution_Plan.docx
│   └── scripts/                        # DOCX generator scripts (Node.js)
│
├── data/                       # Raw clean images (gitignored, .gitkeep only)
├── outputs/                    # Generated previews and reports (gitignored)
├── checkpoints/                # Model weights (gitignored, .gitkeep only)
│
├── requirements-degradation.txt
└── README.md
`

---

## Quickstart

### 1. Install dependencies

`ash
pip install -r requirements-degradation.txt
`

### 2. Generate dummy data (skip once you have real images)

`ash
python scripts/make_dummy_dataset.py --out data/dummy_clean --n 20
`

### 3. Validate the dataset

`ash
python scripts/validate_dataset.py --data_dir data/dummy_clean
# → writes outputs/validation_report.json
# → exits code 1 if corrupt files or duplicates are found
`

### 4. Visually inspect degradation

`ash
python scripts/preview_pairs.py \
    --data_dir data/dummy_clean \
    --config configs/denoise_medium.yaml \
    --num_samples 6
# → writes outputs/degradation_preview.png
#          outputs/degradation_preview_meta.json
`

### 5. Run unit tests

`ash
python -m pytest tests/ -v
`

---

## Configuration & Presets

All parameters live in versioned YAML files with a schema_version field.
**Never edit the base config directly** — create a new preset file for each experiment.

| Preset | Task | Description |
|--------|------|-------------|
| denoise_light.yaml | Denoising | Mild noise, no blur |
| denoise_medium.yaml | Denoising | Balanced noise + occasional blur |
| denoise_heavy.yaml | Denoising | Aggressive noise + frequent blur |
| sr_x2.yaml | Super-Resolution | 2x upscaling |
| sr_x4.yaml | Super-Resolution | 4x upscaling |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
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

Every training run is logged to outputs/experiment.csv:

`
timestamp | experiment_id | git_commit | config_name | epoch | loss | psnr | ssim
`

The git_commit column ties every result back to the exact code version — no external tools required.

---

## Degradation Metadata Schema

Every degraded sample carries a versioned metadata dict:

`json
{
  "schema_version": "1.0.0",
  "sample_id": "dummy_003.png",
  "task": "denoise",
  "gaussian": { "applied": true,  "sigma": 0.042 },
  "poisson":  { "applied": false, "peak": null },
  "blur":     { "applied": true,  "type": "gaussian", "kernel": 5 },
  "downsample": { "scale": null,  "interpolation": null }
}
`

---

## Reproducibility

`python
from datasets.wafer_dataset import SEMPairDataset, seed_worker
from torch.utils.data import DataLoader

train_ds = SEMPairDataset("data/train_clean", config="configs/denoise_medium.yaml", seed=42)
train_loader = DataLoader(train_ds, batch_size=16, shuffle=True,
                          num_workers=4, worker_init_fn=seed_worker)
`

**Always pass worker_init_fn=seed_worker** when 
um_workers > 0. Without it every worker inherits identical RNG state, silently capping training diversity.

---

## Hackathon Timeline

| Phase | Dates | Deliverable |
|-------|-------|-------------|
| Infrastructure | 30 Jul – 01 Aug | Degradation pipeline, configs, tests |
| Dataset | 02 Aug – 05 Aug | Validation, logger, preview QC |
| Baseline | 06 Aug – 09 Aug | Denoising training, PSNR/SSIM |
| Evaluation | 10 Aug – 12 Aug | SR x2 inference, benchmark table |
| Submission Prep | 13 Aug – 15 Aug | Demo, report, archive, CI polish |
| **Round 1 Deadline** | **16 Aug 2026** | Submission |

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/degradation_pipeline.md](docs/degradation_pipeline.md) | Full technical reference for the degradation pipeline |
| [docs/SemiCon-AI_Project_Plan_Summary.docx](docs/SemiCon-AI_Project_Plan_Summary.docx) | Project overview, tech stack, architecture |
| [docs/SemiCon-AI_Sprint_Planning.docx](docs/SemiCon-AI_Sprint_Planning.docx) | Master 10-week engineering roadmap |
| [docs/SemiCon-AI_Hackathon_Execution_Plan.docx](docs/SemiCon-AI_Hackathon_Execution_Plan.docx) | Compressed hackathon execution schedule |

---

## License

MIT License — see [LICENSE](LICENSE) for details.
