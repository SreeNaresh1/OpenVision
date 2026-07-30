const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  ShadingType,
  convertInchesToTwip,
  PageBreak,
} = require("docx");
const fs = require("fs");

function pt(s) { return s * 2; }

const C = {
  navy:       "0D2137",
  navyMid:    "1A3A5C",
  cyan:       "00C2E0",
  cyanSoft:   "B3EEF8",
  amber:      "F4A124",
  amberSoft:  "FEF0D0",
  green:      "1A7A4A",
  greenSoft:  "D0F0E0",
  red:        "C0392B",
  white:      "FFFFFF",
  dark:       "1C1C1C",
  gray:       "4A4A4A",
  lightBg:    "F2F8FF",
  border:     "BDD7EE",
  phase1:     "1A5276",   // Infrastructure
  phase2:     "1E8449",   // Dataset
  phase3:     "7D3C98",   // Baseline
  phase4:     "C0392B",   // Evaluation
  phase5:     "D35400",   // Submission
  round1:     "0D2137",   // Round 1
  round2:     "6C3483",   // Round 2
};

// -- primitives ---------------------------------------------------------------
function bgPara(fill, text, opts) {
  opts = opts || {};
  return new Paragraph({
    alignment: opts.align || AlignmentType.CENTER,
    spacing:   { before: opts.spaceBefore || 0, after: opts.spaceAfter || 0 },
    indent:    opts.indent ? { left: convertInchesToTwip(opts.indent) } : undefined,
    border:    opts.border || undefined,
    shading:   { type: ShadingType.CLEAR, color: "auto", fill },
    children:  text ? [new TextRun({
      text,
      bold:    opts.bold !== false,
      italics: opts.italics || false,
      size:    pt(opts.size || 11),
      color:   opts.color || C.white,
      font:    "Calibri",
      allCaps: opts.allCaps || false,
    })] : [],
  });
}

function plain(text, opts) {
  opts = opts || {};
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing:   { before: opts.spaceBefore || 40, after: opts.spaceAfter || 40 },
    indent:    opts.indent ? { left: convertInchesToTwip(opts.indent), hanging: convertInchesToTwip(0.2) } : undefined,
    shading:   opts.fill ? { type: ShadingType.CLEAR, color: "auto", fill: opts.fill } : undefined,
    border:    opts.border || undefined,
    children: (opts.runs || []).concat(text ? [new TextRun({
      text,
      bold:    opts.bold || false,
      italics: opts.italics || false,
      size:    pt(opts.size || 11),
      color:   opts.color || C.dark,
      font:    "Calibri",
    })] : []),
  });
}

function bullet(symbol, symColor, text, textColor) {
  return new Paragraph({
    spacing: { before: 36, after: 36 },
    indent:  { left: convertInchesToTwip(0.38), hanging: convertInchesToTwip(0.22) },
    children: [
      new TextRun({ text: symbol + "  ", color: symColor, size: pt(11), font: "Calibri", bold: true }),
      new TextRun({ text, size: pt(11), color: textColor || C.dark, font: "Calibri" }),
    ],
  });
}

function pb() { return new Paragraph({ children: [new PageBreak()] }); }

function hr() {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.border } },
    children: [],
  });
}

function spacer(before, after, fill) {
  return new Paragraph({
    spacing: { before: before || 0, after: after || 0 },
    shading: fill ? { type: ShadingType.CLEAR, color: "auto", fill } : undefined,
    children: [],
  });
}

// -- cover --------------------------------------------------------------------
function makeCover() {
  return [
    spacer(0, 0, C.navy),
    bgPara(C.navy, "OpenVision  |  SemiCon-AI", { size: 26, spaceBefore: 80, spaceAfter: 20, border: { bottom: { style: BorderStyle.THICK, size: 10, color: C.cyan } } }),
    bgPara(C.navy, "HACKATHON EXECUTION PLAN", { size: 18, color: C.cyan, spaceAfter: 10, allCaps: true }),
    bgPara(C.navy, "Wafer Image Restoration  |  Denoising & Super-Resolution", { size: 12, color: C.cyanSoft, italics: true, spaceAfter: 60 }),
    bgPara(C.navy, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500", { size: 10, color: C.cyan, spaceBefore: 20, spaceAfter: 20, bold: false }),
    // meta rows
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 20, after: 20 },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: C.navy },
      children: [
        new TextRun({ text: "Schedule:  ", bold: true, size: pt(11), color: C.amber, font: "Calibri" }),
        new TextRun({ text: "30 Jul 2026 \u2192 16 Aug 2026", size: pt(11), color: C.white, font: "Calibri" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 20, after: 20 },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: C.navy },
      children: [
        new TextRun({ text: "Round 1 Deadline:  ", bold: true, size: pt(11), color: C.amber, font: "Calibri" }),
        new TextRun({ text: "16 August 2026", size: pt(11), color: C.white, font: "Calibri" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 20, after: 20 },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: C.navy },
      children: [
        new TextRun({ text: "Round 2 (if selected):  ", bold: true, size: pt(11), color: C.amber, font: "Calibri" }),
        new TextRun({ text: "~23 August 2026  (approx. 1 week after Round 1)", size: pt(11), color: C.white, font: "Calibri" }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 20, after: 20 },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: C.navy },
      children: [
        new TextRun({ text: "Team:  ", bold: true, size: pt(11), color: C.amber, font: "Calibri" }),
        new TextRun({ text: "SreeNaresh1", size: pt(11), color: C.white, font: "Calibri" }),
      ],
    }),
    bgPara(C.navy, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500", { size: 10, color: C.cyan, spaceBefore: 20, spaceAfter: 20, bold: false }),
    bgPara(C.navy, "This document is the compressed competition schedule.", { size: 10, color: C.cyanSoft, italics: true, bold: false, spaceAfter: 20 }),
    bgPara(C.navy, "The master 10-week engineering roadmap continues after Round 1.", { size: 10, color: C.cyanSoft, italics: true, bold: false, spaceAfter: 80 }),
    spacer(0, 0, C.navy),
    pb(),
  ];
}

// -- overview timeline table (using paragraphs) -------------------------------
function makeTimeline() {
  const rows = [
    { phase: "Phase 1  |  Infrastructure",  dates: "30 Jul \u2013 01 Aug",  goal: "Degradation pipeline, configs, dummy data, unit tests",            color: C.phase1 },
    { phase: "Phase 2  |  Dataset",         dates: "02 Aug \u2013 05 Aug",  goal: "Validation pipeline, experiment logger, preview QC, docs",         color: C.phase2 },
    { phase: "Phase 3  |  Baseline",        dates: "06 Aug \u2013 09 Aug",  goal: "Denoising baseline training, PSNR/SSIM benchmarks, checkpoints",   color: C.phase3 },
    { phase: "Phase 4  |  Evaluation",      dates: "10 Aug \u2013 12 Aug",  goal: "SR x2 inference, LPIPS, benchmark table, visual QC",               color: C.phase4 },
    { phase: "Phase 5  |  Submission Prep", dates: "13 Aug \u2013 15 Aug",  goal: "Demo, final report, experiment archive, CI polish",                 color: C.phase5 },
    { phase: "ROUND 1  DEADLINE",           dates: "16 Aug 2026",           goal: "Submission cutoff",                                                color: C.round1 },
  ];

  const paras = [
    bgPara(C.navyMid, "HACKATHON TIMELINE OVERVIEW", { size: 14, color: C.white, allCaps: true, spaceBefore: 0, spaceAfter: 0, indent: 0.15, align: AlignmentType.LEFT, border: { bottom: { style: BorderStyle.THICK, size: 6, color: C.cyan } } }),
    spacer(60, 60),
  ];

  rows.forEach((r, i) => {
    paras.push(
      new Paragraph({
        spacing: { before: i === 0 ? 0 : 10, after: 0 },
        shading: { type: ShadingType.CLEAR, color: "auto", fill: r.color },
        indent: { left: convertInchesToTwip(0.15) },
        border: (r.phase.startsWith("ROUND")) ? {
          top: { style: BorderStyle.THICK, size: 8, color: C.cyan },
          bottom: { style: BorderStyle.THICK, size: 8, color: C.cyan },
        } : undefined,
        children: [
          new TextRun({ text: r.phase, bold: true, size: pt(11), color: C.white, font: "Calibri" }),
          new TextRun({ text: "     " + r.dates + "  \u2014  " + r.goal, size: pt(10), color: r.phase.startsWith("ROUND") ? C.cyanSoft : C.cyanSoft, font: "Calibri", bold: false }),
        ],
      })
    );
  });

  paras.push(spacer(60, 100));
  return paras;
}

// -- phase block builder -------------------------------------------------------
function phaseHeader(label, dates, color) {
  return [
    new Paragraph({
      spacing: { before: 300, after: 0 },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: color },
      indent: { left: convertInchesToTwip(0.15) },
      border: {
        top:    { style: BorderStyle.SINGLE, size: 4, color: C.cyan },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: C.cyan },
      },
      children: [
        new TextRun({ text: label, bold: true, size: pt(18), color: C.white, font: "Calibri" }),
        new TextRun({ text: "     \u25B6  " + dates, size: pt(12), color: C.cyanSoft, font: "Calibri", bold: false }),
      ],
    }),
  ];
}

function subLabel(text, color, borderColor) {
  return new Paragraph({
    spacing: { before: 140, after: 40 },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: color },
    indent: { left: convertInchesToTwip(0.15) },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor || C.cyan } },
    children: [new TextRun({ text, bold: true, size: pt(13), color: C.white, font: "Calibri", allCaps: true })],
  });
}

function goalBox(text, color) {
  return new Paragraph({
    spacing: { before: 50, after: 120 },
    indent: { left: convertInchesToTwip(0.2) },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "EAF4FB" },
    border: { left: { style: BorderStyle.THICK, size: 14, color: color } },
    children: [new TextRun({ text, bold: true, size: pt(12), color: color, font: "Calibri", italics: true })],
  });
}

function riskBox(text) {
  return new Paragraph({
    spacing: { before: 50, after: 50 },
    indent: { left: convertInchesToTwip(0.38), hanging: convertInchesToTwip(0.22) },
    children: [
      new TextRun({ text: "\u26A0  ", color: C.amber, bold: true, size: pt(12), font: "Calibri" }),
      new TextRun({ text, size: pt(10), color: C.gray, font: "Calibri", italics: true }),
    ],
  });
}

// -- PHASE DEFINITIONS --------------------------------------------------------
const phases = [
  {
    label: "Phase 1  |  Infrastructure",
    dates: "30 Jul \u2013 01 Aug 2026  (3 days)",
    color: C.phase1,
    goal: "Build the full synthetic degradation pipeline and testing foundation. Nothing blocks Phase 2 until this is done.",
    objectives: [
      "Set up Git repository, virtual environment, and CI skeleton",
      "Implement Gaussian and Poisson noise injection (degradation.py)",
      "Implement Gaussian/motion blur degradation module",
      "Implement super-resolution downsampling (x2, x4) within dataset pipeline",
      "Build SEMPairDataset: crop, augment, degrade, return tensors (wafer_dataset.py)",
      "Author base degradation.yaml config + 5 preset YAMLs with schema_version",
      "Build make_dummy_dataset.py to generate placeholder PNGs + manifest.json",
      "Write 37 unit tests: noise, downsample, dataset, reproducibility (pytest)",
      "Confirm same seed produces bit-identical degraded outputs",
    ],
    deliverables: [
      "degradation.py + wafer_dataset.py — stable, tested modules",
      "6 versioned YAML configs (base + 5 presets)",
      "make_dummy_dataset.py generating dummy PNGs + manifest.json",
      "37 passing pytest tests (zero failures)",
      "CI pipeline skeleton (GitHub Actions or equivalent)",
    ],
    risks: [
      "Noise parameter ranges are placeholders until real wafer images arrive \u2014 tune in Phase 2",
      "Grayscale-only for now; colour SEM support is deferred to Round 2",
    ],
    exitCriteria: [
      "pytest runs clean: 37 tests, 0 failures",
      "make_dummy_dataset.py produces valid PNGs and manifest.json",
      "Same seed produces bit-identical degradation output (reproducibility test passes)",
    ],
  },
  {
    label: "Phase 2  |  Dataset Validation & Experiment Tracking",
    dates: "02 Aug \u2013 05 Aug 2026  (4 days)",
    color: C.phase2,
    goal: "Prove the dataset is clean and every experiment is traceable before any training begins.",
    objectives: [
      "Build validate_dataset.py: pixel stats, corrupt-file detection, duplicate check",
      "Ensure CI exits code 1 on corrupt files or duplicates (CI-friendly)",
      "Implement ExperimentLogger writing experiment.csv with git_commit column",
      "Build preview_pairs.py: degradation visual grid + per-sample *_meta.json",
      "Run validate_dataset.py on dummy dataset; produce validation_report.json",
      "Tune noise/blur YAML parameter ranges against real wafer image samples",
      "Write docs/degradation_pipeline.md (complete technical reference, all examples runnable)",
      "Begin baseline training setup in parallel on Day 4 (do not wait for docs to be merged)",
    ],
    deliverables: [
      "validate_dataset.py with CI-friendly exit codes",
      "validation_report.json (schema-versioned)",
      "ExperimentLogger (logger.py) with CSV + git_commit column",
      "preview_pairs.py: degradation_preview.png + degradation_preview_meta.json",
      "Tuned YAML configs based on real-image QC",
      "docs/degradation_pipeline.md reviewed and merged",
    ],
    risks: [
      "Real wafer images may not be available \u2014 proceed with dummy data; retune configs when they arrive",
      "Documentation review cycles can extend into Phase 3 time \u2014 time-box to 2 hours",
    ],
    exitCriteria: [
      "validate_dataset.py produces valid validation_report.json with zero corrupt files or duplicates",
      "CI fails correctly when corrupt/duplicate images are injected",
      "ExperimentLogger appends a complete row to experiment.csv with a valid git_commit",
      "degradation_preview.png generated and visually reviewed",
    ],
  },
  {
    label: "Phase 3  |  Baseline Training  (Denoising)",
    dates: "06 Aug \u2013 09 Aug 2026  (4 days)",
    color: C.phase3,
    goal: "Have a working, logged, reproducible denoising baseline before Round 1. Do not defer training.",
    objectives: [
      "Implement train.py: training loop, DataLoader + seed_worker, checkpoint saves",
      "Select baseline denoising architecture: UNet or DnCNN",
      "Configure L1 loss (+ optional perceptual loss) and Adam optimiser",
      "Run baseline training on denoise_light, denoise_medium, denoise_heavy presets",
      "Compute PSNR and SSIM metrics on held-out validation split",
      "Log all runs to experiment.csv (config name + git commit + epoch + loss + PSNR + SSIM)",
      "Save best model checkpoint per preset with config snapshot alongside",
      "Qualitative visual inspection: before/after image comparisons",
      "Document baseline benchmark results (target PSNR range based on literature)",
    ],
    deliverables: [
      "train.py supporting all denoise presets via --config flag",
      "Denoising model checkpoints (light / medium / heavy)",
      "PSNR and SSIM benchmark table (3 presets x validation set)",
      "experiment.csv with complete run history and git hashes",
      "Qualitative before/after image gallery (minimum 6 samples per preset)",
    ],
    risks: [
      "Out-of-memory on GPU \u2014 reduce batch size or crop size first; do not switch architecture",
      "seed_worker must be passed to every DataLoader; missing it silently reduces training diversity",
      "Training instability: check LR first (1e-4 is safe default); do not change architecture mid-sprint",
    ],
    exitCriteria: [
      "All three denoise presets train to convergence with no NaN/Inf loss",
      "PSNR/SSIM logged for every run and traceable via git commit",
      "Best checkpoints load cleanly and produce valid inference outputs",
    ],
  },
  {
    label: "Phase 4  |  Evaluation  (SR x2 + Benchmarking)",
    dates: "10 Aug \u2013 12 Aug 2026  (3 days)",
    color: C.phase4,
    goal: "Deliver SR x2 results and a consolidated benchmark table. x4, LPIPS full suite, colour support, and ablations are deferred to Round 2.",
    objectives: [
      "Adapt train.py for super-resolution task: SR-specific loss (L1 + perceptual)",
      "Run SR x2 baseline training using sr_x2.yaml preset",
      "Compute PSNR and SSIM for SR x2 on held-out test split",
      "Implement infer.py: single-image and batch inference script",
      "Run inference on unseen wafer images; inspect upscaled outputs visually",
      "Produce consolidated benchmark table: denoise (3 presets) + SR x2",
      "Document Round 1 limitations: x4 deferred, LPIPS deferred, colour deferred",
    ],
    deliverables: [
      "train.py updated to support sr_x2 preset",
      "SR x2 model checkpoint",
      "infer.py: single-image and batch inference",
      "Consolidated benchmark table (denoise light/medium/heavy + SR x2)",
      "Round 1 limitations section in docs",
    ],
    risks: [
      "SR x2 training time may exceed 3 days on limited hardware \u2014 cut epochs; prioritise converged checkpoints over final accuracy",
      "Do not start SR x4 in this phase \u2014 it risks leaving x2 incomplete for Round 1",
    ],
    exitCriteria: [
      "SR x2 trains to convergence and PSNR/SSIM logged",
      "infer.py runs on unseen images without errors",
      "Consolidated benchmark table is complete and reproducible",
    ],
    deferredToRound2: [
      "SR x4 training (sr_x4.yaml preset)",
      "LPIPS perceptual metric evaluation",
      "Colour SEM imagery support",
      "Ablation study: with/without Poisson noise during SR training",
      "Extended architecture comparison",
    ],
  },
  {
    label: "Phase 5  |  Submission Preparation",
    dates: "13 Aug \u2013 15 Aug 2026  (3 days)",
    color: C.phase5,
    goal: "Polish, package, and submit. Nothing new gets built in this phase.",
    objectives: [
      "Harden CI: lint (ruff/flake8), test gates enforced on all PRs",
      "Expand unit tests to cover train.py and infer.py (target: 50+ tests)",
      "Record demo video: raw wafer image \u2192 denoised output \u2192 SR x2 output",
      "Write final Round 1 technical report: methodology, results, limitations",
      "Archive reproducible experiment bundle (configs + weights + CSV + docs)",
      "Merge all open feature branches to main",
      "Final end-to-end smoke test: clone repo, setup env, run full pipeline",
      "Review submission requirements and checklist",
    ],
    deliverables: [
      "50+ passing unit tests (100% pass rate)",
      "CI pipeline blocking PRs on lint or test failures",
      "Demo video (raw \u2192 denoised \u2192 SR x2)",
      "Round 1 technical report (PDF or DOCX)",
      "Reproducible experiment archive (configs + weights + CSV + docs)",
      "Clean main branch, all PRs merged",
    ],
    risks: [
      "Do not introduce new features in this phase \u2014 every new line of code is a risk to submission stability",
      "Smoke test the full pipeline on a clean environment before final submission",
      "Record the demo video by 14 Aug to allow one day of contingency",
    ],
    exitCriteria: [
      "Full pipeline reproducible on a fresh clone with a single setup command",
      "50+ tests passing, CI green on main",
      "Demo video recorded and reviewed",
      "Technical report finalised and ready to attach",
    ],
  },
];

// -- ROUND 1 BLOCK -------------------------------------------------------------
function makeRound1Block() {
  return [
    new Paragraph({
      spacing: { before: 300, after: 0 },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: C.navy },
      indent: { left: convertInchesToTwip(0.15) },
      border: {
        top:    { style: BorderStyle.THICK, size: 10, color: C.cyan },
        bottom: { style: BorderStyle.THICK, size: 10, color: C.cyan },
      },
      children: [
        new TextRun({ text: "\u2605  ROUND 1 DEADLINE", bold: true, size: pt(22), color: C.white, font: "Calibri" }),
        new TextRun({ text: "     16 August 2026", size: pt(16), color: C.cyan, font: "Calibri", bold: false }),
      ],
    }),
    spacer(40, 40, C.navy),
    new Paragraph({
      spacing: { before: 0, after: 0 },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: C.navy },
      indent: { left: convertInchesToTwip(0.2) },
      children: [new TextRun({ text: "Submit by end of day. All Phase 1\u20135 deliverables must be complete.", size: pt(11), color: C.cyanSoft, font: "Calibri", italics: true })],
    }),
    spacer(60, 80, C.navy),
    spacer(60, 60),
    plain("Round 1 Submission Checklist", { bold: true, size: 13, color: C.navy }),
    bullet("\u2714", C.green, "Git repository is public (or access granted to judges)", C.dark),
    bullet("\u2714", C.green, "README.md with quickstart instructions (single setup command)", C.dark),
    bullet("\u2714", C.green, "All model checkpoints accessible (link or bundle)", C.dark),
    bullet("\u2714", C.green, "Benchmark table included (denoise x3 presets + SR x2)", C.dark),
    bullet("\u2714", C.green, "Demo video attached or linked", C.dark),
    bullet("\u2714", C.green, "Technical report attached", C.dark),
    bullet("\u2714", C.green, "experiment.csv with traceable run history", C.dark),
    bullet("\u2714", C.green, "pytest suite passing on CI (link to CI run)", C.dark),
  ];
}

// -- ROUND 2 PLAN -------------------------------------------------------------
function makeRound2Block() {
  return [
    pb(),
    new Paragraph({
      spacing: { before: 300, after: 0 },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: C.round2 },
      indent: { left: convertInchesToTwip(0.15) },
      border: {
        top:    { style: BorderStyle.SINGLE, size: 4, color: C.cyan },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: C.cyan },
      },
      children: [
        new TextRun({ text: "Round 2 Plan", bold: true, size: pt(18), color: C.white, font: "Calibri" }),
        new TextRun({ text: "     (If selected  \u2014  approx. 23 Aug 2026)", size: pt(12), color: C.cyanSoft, font: "Calibri", bold: false }),
      ],
    }),
    spacer(60, 40),
    plain("If selected for Round 2, resume the master 10-week engineering roadmap from Sprint 4 Phase 2 onwards. Priority order:", { color: C.gray, italics: true }),
    spacer(20, 20),
    subLabel("Round 2 Objectives", C.round2, C.cyan),
    bullet("\u25B8", C.cyan, "SR x4 training using sr_x4.yaml preset", C.dark),
    bullet("\u25B8", C.cyan, "LPIPS perceptual metric evaluation across all tasks", C.dark),
    bullet("\u25B8", C.cyan, "Ablation study: with/without Poisson noise during SR training", C.dark),
    bullet("\u25B8", C.cyan, "Colour SEM imagery support (extend wafer_dataset.py channel handling)", C.dark),
    bullet("\u25B8", C.cyan, "Mixed-precision training (torch.cuda.amp) for GPU efficiency", C.dark),
    bullet("\u25B8", C.cyan, "Extended architecture comparison (ESRGAN / SwinIR consideration)", C.dark),
    bullet("\u25B8", C.cyan, "Learning-rate scheduling and early stopping", C.dark),
    spacer(40, 40),
    subLabel("Round 2 Deliverables", C.green, "2ECC71"),
    bullet("\u2714", C.green, "SR x4 model checkpoint + benchmark row", C.dark),
    bullet("\u2714", C.green, "Full LPIPS scores across denoise + SR tasks", C.dark),
    bullet("\u2714", C.green, "Ablation study report", C.dark),
    bullet("\u2714", C.green, "Colour SEM support (if dataset provides colour images)", C.dark),
    bullet("\u2714", C.green, "Updated final technical report with complete results", C.dark),
    spacer(40, 40),
    new Paragraph({
      spacing: { before: 80, after: 80 },
      indent: { left: convertInchesToTwip(0.2) },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: "FEF9E7" },
      border: { left: { style: BorderStyle.THICK, size: 14, color: C.amber } },
      children: [new TextRun({ text: "After Round 2, continue the full 10-week master roadmap (Sprint 5 polish tasks: AMP, CI hardening, final demo, archive) to produce the production-grade open-source release.", size: pt(11), color: C.gray, font: "Calibri", italics: true })],
    }),
  ];
}

// -- BUILD PHASE SECTION -------------------------------------------------------
function buildPhase(phase) {
  const items = [];
  items.push(...phaseHeader(phase.label, phase.dates, phase.color));
  items.push(goalBox(phase.goal, phase.color));
  items.push(subLabel("Objectives", phase.color, C.cyan));
  phase.objectives.forEach(o => items.push(bullet("\u25B8", C.cyan, o)));
  items.push(subLabel("Deliverables", C.green, "2ECC71"));
  phase.deliverables.forEach(d => items.push(bullet("\u2714", C.green, d)));
  if (phase.deferredToRound2) {
    items.push(subLabel("Deferred to Round 2", C.amber, C.amber));
    phase.deferredToRound2.forEach(d => items.push(bullet("\u23F3", C.amber, d)));
  }
  items.push(subLabel("Risks & Constraints", C.red, C.red));
  phase.risks.forEach(r => items.push(riskBox(r)));
  items.push(subLabel("Exit Criteria", C.navyMid, C.cyan));
  phase.exitCriteria.forEach(e => items.push(bullet("\u25A0", C.navy, e)));
  return items;
}

// -- ASSEMBLE -----------------------------------------------------------------
const allParas = [
  ...makeCover(),
  ...makeTimeline(),
  hr(),
];

phases.forEach((phase, idx) => {
  allParas.push(...buildPhase(phase));
  if (idx < phases.length - 1) {
    allParas.push(hr());
    allParas.push(pb());
  }
});

allParas.push(hr());
allParas.push(...makeRound1Block());
allParas.push(...makeRound2Block());

const doc = new Document({
  creator: "SreeNaresh1 / OpenVision",
  title: "SemiCon-AI Hackathon Execution Plan",
  description: "Compressed hackathon execution plan for OpenVision SemiCon-AI (30 Jul - 16 Aug 2026)",
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: pt(11), color: C.dark },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: {
          top:    convertInchesToTwip(0.75),
          bottom: convertInchesToTwip(0.75),
          left:   convertInchesToTwip(0.9),
          right:  convertInchesToTwip(0.9),
        },
      },
    },
    children: allParas,
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("docs/SemiCon-AI_Hackathon_Execution_Plan.docx", buffer);
  console.log("SUCCESS: docs/SemiCon-AI_Hackathon_Execution_Plan.docx generated.");
});

