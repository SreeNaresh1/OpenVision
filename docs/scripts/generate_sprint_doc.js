const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  ShadingType,
  WidthType,
  convertInchesToTwip,
  PageBreak,
} = require("docx");
const fs = require("fs");

const COLORS = {
  primary: "1E3A5F",
  accent: "00AEEF",
  gold: "F4A124",
  lightBg: "EAF4FB",
  white: "FFFFFF",
  darkGray: "2D2D2D",
  midGray: "555555",
  sectionBg: "D6EAF8",
  border: "AED6F1",
};

function pt(size) { return size * 2; }

function coverHeading(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, bold: true, size: pt(28), color: COLORS.white, font: "Calibri" })],
    shading: { type: ShadingType.CLEAR, color: "auto", fill: COLORS.primary },
    border: { bottom: { style: BorderStyle.THICK, size: 8, color: COLORS.accent } },
  });
}

function coverSubtitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: pt(13), color: COLORS.accent, font: "Calibri", italics: true })],
    shading: { type: ShadingType.CLEAR, color: "auto", fill: COLORS.primary },
  });
}

function coverMeta(label, value) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 20, after: 20 },
    children: [
      new TextRun({ text: label + ": ", bold: true, size: pt(11), color: COLORS.gold, font: "Calibri" }),
      new TextRun({ text: value, size: pt(11), color: COLORS.white, font: "Calibri" }),
    ],
    shading: { type: ShadingType.CLEAR, color: "auto", fill: COLORS.primary },
  });
}

function sprintHeader(sprintNum, weeks) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 320, after: 0 },
    children: [new TextRun({ text: "Sprint " + sprintNum + "  (" + weeks + ")", bold: true, size: pt(20), color: COLORS.white, font: "Calibri" })],
    shading: { type: ShadingType.CLEAR, color: "auto", fill: COLORS.primary },
    indent: { left: convertInchesToTwip(0.15) },
    border: {
      top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.accent },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.accent },
    },
  });
}

function themeLine(text) {
  return new Paragraph({
    spacing: { before: 40, after: 0 },
    children: [
      new TextRun({ text: "Theme", bold: true, size: pt(12), color: COLORS.primary, font: "Calibri", allCaps: true }),
    ],
    shading: { type: ShadingType.CLEAR, color: "auto", fill: COLORS.sectionBg },
    indent: { left: convertInchesToTwip(0.15) },
  });
}

function themeValue(text) {
  return new Paragraph({
    spacing: { before: 0, after: 140 },
    children: [new TextRun({ text, bold: true, size: pt(13), color: COLORS.primary, font: "Calibri", italics: true })],
    shading: { type: ShadingType.CLEAR, color: "auto", fill: COLORS.sectionBg },
    indent: { left: convertInchesToTwip(0.2) },
    border: { left: { style: BorderStyle.THICK, size: 12, color: COLORS.accent } },
  });
}

function sectionLabel(label, bgColor, borderColor) {
  return new Paragraph({
    spacing: { before: 160, after: 40 },
    children: [new TextRun({ text: label, bold: true, size: pt(14), color: COLORS.white, font: "Calibri", allCaps: true })],
    shading: { type: ShadingType.CLEAR, color: "auto", fill: bgColor || COLORS.primary },
    indent: { left: convertInchesToTwip(0.15) },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor || COLORS.accent } },
  });
}

function bullet(symbol, symbolColor, text) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.2) },
    children: [
      new TextRun({ text: symbol + "  ", color: symbolColor, size: pt(11), font: "Calibri" }),
      new TextRun({ text, size: pt(11), color: COLORS.darkGray, font: "Calibri" }),
    ],
  });
}

function introLine(text) {
  return new Paragraph({
    spacing: { before: 80, after: 60 },
    indent: { left: convertInchesToTwip(0.15) },
    children: [new TextRun({ text, size: pt(11), color: COLORS.midGray, font: "Calibri", italics: true })],
  });
}

function pageBreakPara() {
  return new Paragraph({ children: [new PageBreak()] });
}

function divider() {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border } },
    children: [],
  });
}

function emptyBgLine() {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0 },
    children: [],
    shading: { type: ShadingType.CLEAR, color: "auto", fill: COLORS.primary },
  });
}

const sprints = [
  {
    num: 1, weeks: "Weeks 1-2",
    theme: "Foundation & Data Infrastructure",
    objectives: [
      "Define project scope and research goals for wafer image restoration",
      "Survey and document SEM/optical wafer-inspection literature",
      "Set up Git repository, virtual environment, and CI pipeline",
      "Design the synthetic degradation pipeline architecture",
      "Implement Gaussian and Poisson noise injection modules",
      "Implement motion/Gaussian blur degradation module",
      "Implement super-resolution downsampling (x2, x4)",
      "Build SEMPairDataset with crop, augment, and degrade pipeline",
      "Create base degradation YAML config and 5 preset configs",
      "Author make_dummy_dataset.py for placeholder data generation",
      "Write unit tests for noise, blur, downsample, and reproducibility (37 tests)",
    ],
    deliverables: [
      "Git repository with branch strategy and CI/CD setup",
      "Synthetic degradation pipeline (degradation.py + wafer_dataset.py)",
      "6 versioned YAML configs (base + 5 presets: denoise light/medium/heavy, SR x2/x4)",
      "37 passing unit tests (pytest) covering noise, downsample, dataset, reproducibility",
      "manifest.json generation script (make_dummy_dataset.py)",
      "Initial module-level API documentation",
    ],
    reviewIntro: "Reviewers should be able to:",
    reviewItems: [
      "Run make_dummy_dataset.py and produce dummy PNG images + manifest.json",
      "Apply any preset YAML and observe statistically different degradation outputs",
      "Execute the full pytest suite and see 37 tests pass with zero failures",
      "Confirm reproducibility: same seed produces bit-identical degraded output",
      "Inspect per-sample degradation metadata JSON",
    ],
    retroItems: [
      "Were noise/blur parameter ranges appropriate for real SEM imagery?",
      "Did the probabilistic degradation produce sufficient training diversity?",
      "Are YAML versioning conventions clear and followed by all contributors?",
      "Were unit-test coverage targets met? Any edge cases missed?",
      "Is the dummy dataset generator representative enough for early validation?",
    ],
  },
  {
    num: 2, weeks: "Weeks 3-4",
    theme: "Dataset Validation & Experiment Tracking",
    objectives: [
      "Build validate_dataset.py with objective dataset health-check logic",
      "Implement ExperimentLogger writing timestamped experiment.csv",
      "Integrate git_commit column for full traceability of every run",
      "Build preview_pairs.py generating visual degradation grid output",
      "Save per-sample *_meta.json alongside preview grids",
      "Validate dummy dataset and produce validation_report.json",
      "Ensure CI exits code 1 on corrupt files or duplicate images",
      "Write docs/degradation_pipeline.md as complete technical reference",
      "Conduct degradation QC review against real wafer image samples",
      "Tune noise/blur parameter ranges based on QC findings",
    ],
    deliverables: [
      "validate_dataset.py with CI-friendly exit codes",
      "validation_report.json (schema-versioned, all fields documented)",
      "ExperimentLogger (logger.py) with CSV output and git commit column",
      "preview_pairs.py producing degradation_preview.png + _meta.json",
      "Tuned YAML configs reflecting real-image noise characteristics",
      "docs/degradation_pipeline.md (complete, reviewed and merged)",
    ],
    reviewIntro: "Reviewers should be able to:",
    reviewItems: [
      "Run validate_dataset.py and produce a complete validation_report.json",
      "Observe CI pipeline fail correctly on injected corrupt/duplicate images",
      "Generate degradation_preview.png and visually verify noise realism",
      "Log an experiment entry and trace it back via git commit hash",
      "Confirm all documentation examples are accurate and runnable",
    ],
    retroItems: [
      "Were validation thresholds (pixel mean/std) set appropriately?",
      "Did the experiment logger capture all necessary hyperparameters?",
      "Was the preview grid useful for catching degradation artefacts early?",
      "Did documentation feedback require significant rewrites?",
      "Were parameter tuning decisions well-justified and recorded?",
    ],
  },
  {
    num: 3, weeks: "Weeks 5-6",
    theme: "Baseline Model Training - Denoising",
    objectives: [
      "Select and implement baseline denoising architecture (UNet / DnCNN)",
      "Implement training loop with DataLoader and seed_worker seeding",
      "Configure loss function (L1 / perceptual) and optimiser (Adam)",
      "Run baseline training on denoise_light, denoise_medium, denoise_heavy presets",
      "Implement PSNR and SSIM evaluation metrics",
      "Log every training run to experiment.csv with config + git commit",
      "Save model checkpoints per epoch with config snapshot",
      "Conduct qualitative visual review of denoised output samples",
      "Document baseline benchmark results",
      "Identify failure modes and plan improvements for Sprint 4",
    ],
    deliverables: [
      "train.py supporting all denoise presets via --config argument",
      "Baseline model checkpoints (light / medium / heavy presets)",
      "PSNR and SSIM benchmark table across all three denoise presets",
      "experiment.csv with full traceable run history",
      "Qualitative output image gallery (before / after comparisons)",
      "Sprint 3 benchmark summary report",
    ],
    reviewIntro: "Reviewers should be able to:",
    reviewItems: [
      "Launch training with any denoise preset and observe loss convergence",
      "Reproduce any listed result using the git commit recorded in experiment.csv",
      "Review PSNR/SSIM scores against published literature baselines",
      "Visually inspect denoised outputs and identify remaining artefacts",
      "Confirm checkpoints load cleanly and produce valid inference outputs",
    ],
    retroItems: [
      "Did the baseline architecture achieve acceptable PSNR/SSIM benchmarks?",
      "Were training times within GPU budget? Any out-of-memory issues encountered?",
      "Were seed_worker calls correctly applied across all DataLoader workers?",
      "Did any config preset cause training instability or divergence?",
      "Were there data-loading bottlenecks that need addressing in Sprint 4?",
    ],
  },
  {
    num: 4, weeks: "Weeks 7-8",
    theme: "Super-Resolution Pipeline & Model Benchmarking",
    objectives: [
      "Adapt training pipeline for super-resolution (x2 and x4 tasks)",
      "Implement SR-specific loss (L1 + perceptual / SSIM combination)",
      "Run SR baseline training on sr_x2.yaml and sr_x4.yaml presets",
      "Benchmark SR outputs: PSNR, SSIM, and LPIPS metrics",
      "Compare denoising vs SR results on shared held-out test split",
      "Implement inference script for single-image and batch processing",
      "Add edge-case handling: grayscale enforcement and min-size guards",
      "Extend dataset support for optional colour SEM imagery",
      "Perform ablation: with/without Poisson noise during SR training",
      "Prepare consolidated benchmark report across all tasks and presets",
    ],
    deliverables: [
      "SR-adapted train.py supporting sr_x2 and sr_x4 presets",
      "Inference script (infer.py) for single-image and batch mode",
      "SR model checkpoints for x2 and x4 scale factors",
      "Consolidated benchmark table (denoise + SR across all presets)",
      "Ablation study results (noise combinations vs clean baseline)",
      "Extended documentation covering SR pipeline and inference usage",
    ],
    reviewIntro: "Reviewers should be able to:",
    reviewItems: [
      "Run SR training for both x2 and x4 and observe stable loss convergence",
      "Execute infer.py on unseen wafer images and inspect upscaled results",
      "Review the consolidated benchmark table and compare task-wise performance",
      "Reproduce ablation results using recorded config snapshots",
      "Validate edge-case behaviour: non-square crops, small images, grayscale enforcement",
    ],
    retroItems: [
      "Did SR results justify the additional pipeline complexity over denoising alone?",
      "Were LPIPS perceptual scores consistent with visual quality impressions?",
      "Did colour SEM handling introduce any unexpected regressions?",
      "Were ablation experiments properly isolated and reproducible?",
      "Is the inference script user-friendly enough for external collaborators?",
    ],
  },
  {
    num: 5, weeks: "Weeks 9-10",
    theme: "Optimisation, Robustness & Final Delivery",
    objectives: [
      "Profile and optimise DataLoader throughput (num_workers, prefetch, pin_memory)",
      "Apply mixed-precision training (torch.cuda.amp) for GPU efficiency",
      "Implement early stopping and learning-rate scheduling",
      "Harden CI pipeline: lint (ruff/flake8), type checks (mypy), test gates",
      "Expand unit-test suite to at least 50 tests covering all new modules",
      "Conduct end-to-end integration test on real wafer image subset",
      "Prepare final technical report: methodology, results, and limitations",
      "Record demo video showing full pipeline from raw data to restored output",
      "Archive reproducible experiment bundle (configs + weights + logs)",
      "Conduct final code review and merge all feature branches to main",
    ],
    deliverables: [
      "Optimised training pipeline with AMP support and LR scheduling",
      "Hardened CI with lint, type-check, and full test gates enforced",
      "50+ unit tests achieving 100% pass rate",
      "End-to-end integration test report on real wafer image subset",
      "Final technical report (PDF) covering methodology and results",
      "Demo video of complete pipeline (raw data to restored output)",
      "Reproducible experiment archive (configs + weights + CSV + docs)",
    ],
    reviewIntro: "Reviewers should be able to:",
    reviewItems: [
      "Clone repository and reproduce all results with a single setup command",
      "Run the full test suite and observe 50+ tests passing with zero failures",
      "Watch the demo video and understand the complete end-to-end pipeline",
      "Read the final report and independently assess methodology and limitations",
      "Confirm CI pipeline correctly blocks any PR that breaks tests or linting",
    ],
    retroItems: [
      "Did AMP training reduce GPU time without degrading metric quality?",
      "Were integration tests on real wafer images representative of deployment?",
      "Was the final report sufficiently detailed for external reproducibility?",
      "Were all known limitations from Sprints 1-4 addressed or documented?",
      "What are the highest-impact next steps beyond this project phase?",
    ],
  },
];

function buildSprint(sprint) {
  const items = [];
  items.push(sprintHeader(sprint.num, sprint.weeks));
  items.push(themeLine());
  items.push(themeValue(sprint.theme));
  items.push(sectionLabel("Objectives", COLORS.primary, COLORS.accent));
  sprint.objectives.forEach(o => items.push(bullet("\u25B8", COLORS.accent, o)));
  items.push(sectionLabel("Deliverables", "196F3D", "2ECC71"));
  sprint.deliverables.forEach(d => items.push(bullet("\u2714", "196F3D", d)));
  items.push(sectionLabel("Sprint Review", "1A5276", "5DADE2"));
  items.push(introLine(sprint.reviewIntro));
  sprint.reviewItems.forEach(r => items.push(bullet("\u25CF", COLORS.primary, r)));
  items.push(sectionLabel("Sprint Retrospective", "7D6608", "F4D03F"));
  items.push(introLine("Discuss:"));
  sprint.retroItems.forEach(r => items.push(bullet("?", "B7950B", r)));
  return items;
}

const coverParagraphs = [
  emptyBgLine(),
  coverHeading("OpenVision - SemiCon-AI"),
  coverSubtitle("Wafer Image Restoration  |  Denoising & Super-Resolution"),
  emptyBgLine(),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text: "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500", color: COLORS.accent, size: pt(12), font: "Calibri" })],
    shading: { type: ShadingType.CLEAR, color: "auto", fill: COLORS.primary },
  }),
  coverMeta("Document", "Sprint Planning - All Sprints"),
  coverMeta("Project", "OpenVision / SemiCon-AI"),
  coverMeta("Domain", "Semiconductor Wafer Inspection  |  Deep Learning"),
  coverMeta("Duration", "10 Weeks  |  5 Sprints (2 Weeks Each)"),
  coverMeta("Created", "July 2026"),
  coverMeta("Team", "SreeNaresh1"),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text: "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500", color: COLORS.accent, size: pt(12), font: "Calibri" })],
    shading: { type: ShadingType.CLEAR, color: "auto", fill: COLORS.primary },
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 80 },
    children: [new TextRun({ text: "AI-Powered Restoration of Semiconductor Inspection Imagery", size: pt(10), color: COLORS.lightBg, font: "Calibri", italics: true })],
    shading: { type: ShadingType.CLEAR, color: "auto", fill: COLORS.primary },
  }),
  pageBreakPara(),
];

const allParagraphs = [...coverParagraphs];
sprints.forEach((sprint, idx) => {
  allParagraphs.push(...buildSprint(sprint));
  if (idx < sprints.length - 1) {
    allParagraphs.push(divider());
    allParagraphs.push(pageBreakPara());
  }
});

const doc = new Document({
  creator: "SreeNaresh1 / OpenVision",
  title: "SemiCon-AI Sprint Planning",
  description: "Agile Sprint Planning Document for OpenVision SemiCon-AI Wafer Image Restoration",
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: pt(11), color: COLORS.darkGray },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(0.75),
          bottom: convertInchesToTwip(0.75),
          left: convertInchesToTwip(0.9),
          right: convertInchesToTwip(0.9),
        },
      },
    },
    children: allParagraphs,
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("docs/SemiCon-AI_Sprint_Planning.docx", buffer);
  console.log("SUCCESS: docs/SemiCon-AI_Sprint_Planning.docx generated.");
});
