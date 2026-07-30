const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, ShadingType, WidthType, VerticalAlign,
  convertInchesToTwip, PageBreak, UnderlineType,
} = require("docx");
const fs = require("fs");

// ─── STYLE CONSTANTS ──────────────────────────────────────────────────────────
function pt(s) { return s * 2; }
const BLACK   = "000000";
const DARK    = "1C1C1C";
const GRAY    = "444444";
const LGRAY   = "AAAAAA";
const WHITE   = "FFFFFF";
const TBLHEAD = "E8E8E8"; // very light gray — table header only

// ─── PRIMITIVES ───────────────────────────────────────────────────────────────
function pb() { return new Paragraph({ children: [new PageBreak()] }); }

function hr() {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999" } },
    children: [],
  });
}

function spacer(b, a) {
  return new Paragraph({ spacing: { before: b || 0, after: a || 0 }, children: [] });
}

// Cover title
function coverTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 60 },
    border: { bottom: { style: BorderStyle.THICK, size: 8, color: BLACK } },
    children: [new TextRun({ text, bold: true, size: pt(26), color: BLACK, font: "Calibri" })],
  });
}
function coverSub(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: pt(13), color: DARK, font: "Calibri", italics: true })],
  });
}
function coverMeta(label, value) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 20, after: 20 },
    children: [
      new TextRun({ text: label + ": ", bold: true, size: pt(11), color: DARK, font: "Calibri" }),
      new TextRun({ text: value, size: pt(11), color: DARK, font: "Calibri" }),
    ],
  });
}

// Section heading (H1)
function h1(text) {
  return new Paragraph({
    spacing: { before: 280, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: BLACK } },
    children: [new TextRun({ text, bold: true, size: pt(16), color: BLACK, font: "Calibri" })],
  });
}

// Sub-heading (H2)
function h2(text) {
  return new Paragraph({
    spacing: { before: 180, after: 40 },
    children: [new TextRun({ text, bold: true, size: pt(13), color: BLACK, font: "Calibri",
      underline: { type: UnderlineType.SINGLE, color: BLACK } })],
  });
}

// Body paragraph
function body(text, opts) {
  opts = opts || {};
  return new Paragraph({
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: { before: 40, after: 40 },
    indent: opts.indent ? { left: convertInchesToTwip(opts.indent) } : undefined,
    children: [new TextRun({ text, size: pt(11), color: DARK, font: "Calibri", italics: opts.italics || false, bold: opts.bold || false })],
  });
}

// Standard bullet
function bullet(text, opts) {
  opts = opts || {};
  return new Paragraph({
    spacing: { before: 36, after: 36 },
    indent: { left: convertInchesToTwip(0.4), hanging: convertInchesToTwip(0.2) },
    children: [
      new TextRun({ text: opts.sym || "-", bold: opts.symBold || false, size: pt(11), color: BLACK, font: "Calibri" }),
      new TextRun({ text: "  " + text, size: pt(11), color: DARK, font: "Calibri", bold: opts.bold || false }),
    ],
  });
}

// Bold label + normal text in one line
function labelLine(label, text) {
  return new Paragraph({
    spacing: { before: 36, after: 36 },
    indent: { left: convertInchesToTwip(0.4), hanging: convertInchesToTwip(0.2) },
    children: [
      new TextRun({ text: "-  ", size: pt(11), color: BLACK, font: "Calibri" }),
      new TextRun({ text: label + ": ", bold: true, size: pt(11), color: BLACK, font: "Calibri" }),
      new TextRun({ text, size: pt(11), color: DARK, font: "Calibri" }),
    ],
  });
}

// Table cell
function tc(text, opts) {
  opts = opts || {};
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.head ? { type: ShadingType.CLEAR, color: "auto", fill: TBLHEAD } : undefined,
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 2, color: "999999" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "999999" },
      left:   { style: BorderStyle.SINGLE, size: 2, color: "999999" },
      right:  { style: BorderStyle.SINGLE, size: 2, color: "999999" },
    },
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      spacing: { before: 60, after: 60 },
      indent: { left: convertInchesToTwip(0.1) },
      children: [new TextRun({ text, bold: opts.bold || false, size: pt(opts.size || 10), color: DARK, font: "Calibri", italics: opts.italics || false })],
    })],
  });
}

// ─── STACK TABLE ──────────────────────────────────────────────────────────────
const stackRows = [
  ["Language",         "Python 3.10+",           "",        "Primary implementation language; universal ML ecosystem support"],
  ["Deep Learning",    "PyTorch 2.1+",            "torch",   "Model definition, training loop, GPU acceleration (CUDA), AMP"],
  ["Image Processing", "OpenCV (headless) 4.8+",  "cv2",     "Image I/O, Gaussian/motion blur, pixel-level degradation ops"],
  ["Numerical",        "NumPy 1.24+",             "np",      "Array math, noise generation, pixel statistics, random seeding"],
  ["Augmentation",     "Albumentations 2.0+",     "",        "Geometric transforms (flip, rotate) applied symmetrically to pairs"],
  ["Metrics",          "scikit-image 0.22+",      "skimage",  "SSIM computation; structural similarity for restoration quality"],
  ["Visualisation",    "Matplotlib 3.7+",         "plt",     "Degradation preview grids, before/after comparison plots"],
  ["Configuration",    "PyYAML 6.0+",             "yaml",    "Human-readable versioned experiment configs; schema_version field"],
  ["Experiment Log",   "CSV (Python stdlib)",      "csv",     "Zero-dependency, Git-friendly run log with git commit traceability"],
  ["Testing",          "pytest",                  "pytest",  "37+ unit tests covering noise, downsample, dataset, reproducibility"],
  ["Linting",          "ruff / flake8",           "",        "Code style enforcement; CI gate on every pull request"],
  ["Type Checking",    "mypy",                    "",        "Static type analysis to catch errors before runtime (Sprint 5)"],
  ["CI / CD",          "GitHub Actions",           "",        "Automated test + lint pipeline; exit-code-1 on dataset corruption"],
  ["Version Control",  "Git",                     "",        "Branch strategy, commit-traced experiment reproducibility"],
  ["Packaging",        "pip + requirements.txt",  "pip",     "Reproducible environment; single pip install -r command"],
];

function makeStackTable() {
  const header = new TableRow({
    tableHeader: true,
    children: [
      tc("Layer",             { width: 18, bold: true, head: true, align: AlignmentType.CENTER }),
      tc("Technology",        { width: 22, bold: true, head: true, align: AlignmentType.CENTER }),
      tc("Package / Import",  { width: 15, bold: true, head: true, align: AlignmentType.CENTER }),
      tc("Purpose",           { width: 45, bold: true, head: true, align: AlignmentType.CENTER }),
    ],
  });
  const rows = stackRows.map(r => new TableRow({ children: [
    tc(r[0], { width: 18, bold: true }),
    tc(r[1], { width: 22 }),
    tc(r[2] || "-", { width: 15, italics: true, size: 9.5 }),
    tc(r[3], { width: 45 }),
  ]}));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...rows] });
}

// ─── CONTENT SECTIONS ─────────────────────────────────────────────────────────
function makeCover() {
  return [
    spacer(120, 0),
    coverTitle("OpenVision - SemiCon-AI"),
    coverSub("Project Plan Summary"),
    coverSub("Wafer Image Restoration | Denoising & Super-Resolution"),
    spacer(60, 60),
    hr(),
    coverMeta("Domain",   "Semiconductor Wafer Inspection | Deep Learning | Computer Vision"),
    coverMeta("Tasks",    "Image Denoising  +  Super-Resolution (x2, x4)"),
    coverMeta("Team",     "SreeNaresh1"),
    coverMeta("Date",     "July 2026"),
    hr(),
    pb(),
  ];
}

function makeOverview() {
  return [
    h1("1.  Project Overview"),
    body("OpenVision (SemiCon-AI) is an AI-powered image restoration system for semiconductor wafer inspection imagery. It applies deep learning to reverse the degradation introduced by scanning electron microscopes (SEM) and optical inspection tools, producing cleaner, higher-resolution images that improve defect detection accuracy downstream."),
    spacer(40, 40),

    h2("Background and Problem Statement"),
    body("Semiconductor manufacturing relies on wafer inspection imagery to detect microscopic defects at nanometer scale. SEM and optical inspection systems introduce two primary degradation types that compromise downstream defect analysis:"),
    bullet("Noise - Gaussian shot noise and Poisson (photon-count) noise arise from electron beam physics and detector sensitivity limits."),
    bullet("Blur - Gaussian and motion blur occur from beam focus instability, vibration, and sample drift during acquisition."),
    bullet("Low Resolution - High-throughput scan modes trade pixel density for speed, producing images too coarse for fine-grained defect localisation."),
    spacer(20, 20),
    body("No paired real-world dataset (clean + degraded) exists publicly for this domain. The project therefore generates synthetic degradation from clean reference images - the same approach used in published wafer-TEM/SEM restoration literature - then trains neural networks to reverse those corruptions."),

    h2("Goals"),
    bullet("Build a reproducible, config-driven synthetic degradation pipeline for SEM / optical wafer images"),
    bullet("Train baseline denoising models (UNet / DnCNN) and evaluate with PSNR and SSIM metrics"),
    bullet("Train super-resolution models (x2, x4) and benchmark against published literature"),
    bullet("Produce a fully traceable experiment log tying every result to a git commit and config version"),
    bullet("Deliver a clean, CI-tested, documented codebase ready for external reproducibility"),

    h2("Key Constraints"),
    bullet("No paired real dataset exists publicly - all training data is synthetically generated"),
    bullet("Grayscale SEM imagery in Phase 1; colour SEM support is a Round 2 extension"),
    bullet("Hackathon Round 1 deadline: 16 August 2026 - only 17 days from project start"),
    bullet("Reproducibility is a first-class requirement: every result must be traceable to a git commit"),
  ];
}

function makeArchitecture() {
  const stages = [
    ["Stage 1 - Synthetic Degradation", "degradation.py applies probabilistic Gaussian noise, Poisson noise, Gaussian/motion blur, and downsampling to clean source images. Each stage is gated by an independent probability p, producing a diverse training distribution. Every output carries a versioned metadata schema for traceability."],
    ["Stage 2 - Dataset Loading",        "SEMPairDataset (wafer_dataset.py) reads source images, applies random crops and geometric augmentations (flip/rotate via Albumentations), calls the degradation pipeline, and returns (clean, degraded) tensor pairs. seed_worker ensures deterministic multi-worker degradation."],
    ["Stage 3 - Configuration and Experiment Management", "All degradation parameters live in versioned YAML configs (schema_version field). Six presets ship out of the box. ExperimentLogger appends rows to experiment.csv stamped with timestamp, git commit hash, config name, loss, PSNR, and SSIM."],
    ["Stage 4 - Model Training",         "train.py accepts a --config flag and supports both denoising and super-resolution tasks. Checkpoints are saved per epoch alongside a config snapshot. Mixed-precision (AMP) and LR scheduling are Sprint 5 additions."],
    ["Stage 5 - Evaluation and Inference","PSNR and SSIM are computed on a held-out validation split after every epoch. validate_dataset.py provides objective dataset health checks before training. infer.py runs single-image or batch inference on unseen images. LPIPS and ablation studies are Round 2 additions."],
  ];
  const items = [
    pb(),
    h1("2.  Architecture Overview"),
    body("The system is a modular research pipeline: synthetic degradation > dataset loading > model training > evaluation > inference. Each stage is independently testable, config-driven, and produces versioned artefacts."),
    spacer(20, 20),
    h2("Pipeline Stages"),
  ];
  stages.forEach(s => {
    items.push(new Paragraph({
      spacing: { before: 80, after: 20 },
      children: [new TextRun({ text: s[0], bold: true, size: pt(11.5), color: BLACK, font: "Calibri" })],
    }));
    items.push(new Paragraph({
      spacing: { before: 20, after: 60 },
      indent: { left: convertInchesToTwip(0.35) },
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: s[1], size: pt(11), color: DARK, font: "Calibri" })],
    }));
  });
  items.push(h2("Quality and Reproducibility Layer"));
  [
    "37+ pytest unit tests covering noise, downsample, dataset loading, and seed reproducibility",
    "CI pipeline (GitHub Actions) with lint, type-check, and test gates on every PR",
    "validate_dataset.py exits code 1 on corrupt files or duplicates - CI-friendly",
    "preview_pairs.py generates visual QC grids and per-sample JSON metadata",
    "Every result traceable to exact git commit via experiment.csv",
  ].forEach(t => items.push(bullet(t)));
  return items;
}

function makeTechStack() {
  return [
    pb(),
    h1("3.  Tech Stack"),
    spacer(60, 60),
    makeStackTable(),
    spacer(80, 80),
  ];
}

const whyReasons = [
  { title: "PyTorch over TensorFlow",
    text: "PyTorch's dynamic computation graph makes it the dominant framework in academic image restoration research (DnCNN, SRGAN, SwinIR are all PyTorch-native). Its DataLoader and seed_worker APIs give fine-grained control over multi-worker determinism, which is critical for reproducing degradation across training runs. Native AMP (torch.cuda.amp) is a one-line addition for mixed-precision training in Sprint 5." },
  { title: "OpenCV and NumPy for degradation (not torchvision transforms)",
    text: "Degradation physics (Gaussian noise sigma, Poisson peak, blur kernel size) must be tunable at the exact numerical level. OpenCV and NumPy operate on raw arrays with stable, predictable cross-version behaviour. torchvision transforms abstract these parameters in ways that can change between versions, silently breaking reproducibility. Using OpenCV/NumPy for noise and blur while reserving Albumentations only for geometric augmentations gives the best of both worlds." },
  { title: "Albumentations for geometric augmentation only",
    text: "Albumentations provides a dual-transform API that applies the same spatial transform to both the clean and degraded image in a pair. This is essential for maintaining pixel alignment in supervised restoration training. Its API is stable for geometric operations (flip, rotate, crop), which is all the project uses it for." },
  { title: "YAML configs with schema_version (not argparse or .env files)",
    text: "Hardcoded argparse flags cannot be archived alongside a checkpoint. .env files are not diff-friendly. YAML files are human-readable, Git-committable, and can be schema-versioned. Bundling a config snapshot next to every checkpoint means any experiment can be reproduced years later by pointing train.py at the saved YAML. The schema_version field ensures backward compatibility as parameters evolve." },
  { title: "CSV experiment logging (not TensorBoard or Weights and Biases)",
    text: "TensorBoard and W&B require running services and have dependency chains that can fail in CI or offline environments. A CSV file is zero-dependency, portable, human-readable, Git-diffable, and survives tool deprecations. Adding a git_commit column means every row is permanently traceable to exact code state without external tooling. TensorBoard can be added on top later; CSV cannot easily be added retroactively." },
  { title: "pytest with strict unit tests from day one",
    text: "Image processing bugs (off-by-one in crop size, RNG seed not propagating, noise applied twice) are invisible to the human eye but destroy training metrics. The test suite catches these at the module level. CI integration ensures every PR is automatically validated, preventing regressions during the fast hackathon iteration cycle." },
  { title: "GitHub Actions CI (not manual testing)",
    text: "In a hackathon with a hard deadline, manual testing is a liability. CI enforces that the full test suite passes, linting is clean, and dataset validation exits correctly before any merge. The validate_dataset.py exit-code-1 pattern makes dataset integrity a CI gate, not a manual checklist item." },
];

function makeWhyStack() {
  const items = [
    h1("4.  Why This Stack?"),
    body("Every technology choice is driven by three principles: (1) reproducibility - results must be traceable months later; (2) hackathon velocity - the toolchain must not block iteration; (3) research alignment - the stack must match the ecosystem where wafer restoration research is published."),
    spacer(40, 40),
  ];
  whyReasons.forEach((r, i) => {
    items.push(new Paragraph({
      spacing: { before: 100, after: 20 },
      children: [new TextRun({ text: (i+1) + ".  " + r.title, bold: true, size: pt(11.5), color: BLACK, font: "Calibri" })],
    }));
    items.push(new Paragraph({
      spacing: { before: 20, after: 60 },
      indent: { left: convertInchesToTwip(0.35) },
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: r.text, size: pt(11), color: DARK, font: "Calibri" })],
    }));
  });
  return items;
}

function makeDeliverables() {
  return [
    pb(),
    h1("5.  Deliverables at a Glance"),

    h2("Code and Modules"),
    bullet("degradation.py - Gaussian noise, Poisson noise, blur, downsampling with versioned metadata schema"),
    bullet("wafer_dataset.py - SEMPairDataset, seed_worker, crop + augment + degrade pipeline"),
    bullet("logger.py - ExperimentLogger with git commit, config, PSNR, SSIM columns"),
    bullet("train.py - Training loop supporting all denoise and SR presets via --config"),
    bullet("infer.py - Single-image and batch inference script"),
    bullet("validate_dataset.py - CI-friendly dataset health check (exits code 1 on failure)"),
    bullet("preview_pairs.py - Visual degradation grid + per-sample metadata JSON"),
    bullet("make_dummy_dataset.py - Placeholder image + manifest.json generator"),

    h2("Configuration Presets"),
    bullet("degradation.yaml - Base config with all tunable parameters (schema_version: 1.0.0)"),
    bullet("denoise_light.yaml / denoise_medium.yaml / denoise_heavy.yaml - Denoising presets"),
    bullet("sr_x2.yaml / sr_x4.yaml - Super-resolution scale presets"),

    h2("Tests and Quality Gates"),
    bullet("test_noise.py - Gaussian + Poisson noise correctness (incl. physical property: lower peak => higher variance)"),
    bullet("test_downsample.py - Downsample output size and pixel range validation"),
    bullet("test_dataset.py - p=0 (no degradation), p=1 (always degrade), metadata schema validation"),
    bullet("test_reproducibility.py - Same seed gives bit-identical output; different seeds give different outputs"),

    h2("Artefacts and Reports"),
    bullet("validation_report.json - Dataset health: image count, size stats, corrupt/duplicate counts"),
    bullet("experiment.csv - Full traceable run history (timestamp, git_commit, config, loss, PSNR, SSIM)"),
    bullet("degradation_preview.png / *_meta.json - Visual QC grid and per-sample degradation metadata"),
    bullet("Model checkpoints - Best epoch per config preset with config snapshot bundled alongside"),
    bullet("docs/degradation_pipeline.md - Complete technical reference with all examples runnable"),

    h2("Success Metrics"),
    bullet("Denoising (all 3 presets) - PSNR and SSIM benchmarked versus literature baselines"),
    bullet("SR x2 (Round 1 target) - PSNR and SSIM on held-out test split"),
    bullet("SR x4 (Round 2 target) - PSNR, SSIM, and LPIPS perceptual metric"),
    bullet("Test suite - 50+ passing tests at Round 1 submission; 100% pass rate enforced by CI"),
    spacer(60, 40),
    body("All deliverables are designed to be independently reproducible: clone the repository, run pip install -r requirements-degradation.txt, then execute any script with its preset YAML. No hidden state, no external services, no manual configuration required.", { italics: true }),
  ];
}

const risks = [
  { risk: "No real paired dataset exists publicly", level: "HIGH",
    mit: "Generate synthetic degradation from clean images. Tune noise/blur YAML parameters once real samples are available. Document all assumptions explicitly in config files." },
  { risk: "Training time exceeds available GPU budget", level: "MEDIUM",
    mit: "Reduce batch size and crop size first. Prioritise converged checkpoints over final-epoch accuracy. Apply AMP (Sprint 5) to recover throughput." },
  { risk: "Noise parameter ranges mismatch real SEM imagery", level: "MEDIUM",
    mit: "Run validate_dataset.py and preview_pairs.py early. Compare preview grids against problem-statement images. Retune YAML configs in Phase 2." },
  { risk: "seed_worker omitted from DataLoader", level: "LOW",
    mit: "Covered by test_reproducibility.py. CI gate on pytest catches this before training begins." },
  { risk: "SR x4 scope cannot fit Round 1 deadline", level: "PLANNED",
    mit: "SR x4 is explicitly deferred to Round 2. Round 1 delivers SR x2 only. Documented in the Hackathon Execution Plan." },
  { risk: "Documentation review delays Phase 3 start", level: "LOW",
    mit: "Time-box documentation review to 2 hours. Begin train.py scaffolding in parallel from Phase 2 Day 4." },
];

function makeRisks() {
  const items = [
    hr(),
    h1("6.  Risks and Mitigations"),
    spacer(40, 40),
  ];
  risks.forEach(r => {
    items.push(new Paragraph({
      spacing: { before: 80, after: 20 },
      children: [
        new TextRun({ text: "[" + r.level + "]  ", bold: true, size: pt(11), color: BLACK, font: "Calibri" }),
        new TextRun({ text: r.risk, bold: true, size: pt(11), color: BLACK, font: "Calibri" }),
      ],
    }));
    items.push(labelLine("Mitigation", r.mit));
    items.push(spacer(10, 10));
  });
  return items;
}

// ─── ASSEMBLE ─────────────────────────────────────────────────────────────────
const all = [
  ...makeCover(),
  ...makeOverview(),
  ...makeArchitecture(),
  ...makeTechStack(),
  hr(),
  ...makeWhyStack(),
  ...makeDeliverables(),
  ...makeRisks(),
];

const doc = new Document({
  creator: "SreeNaresh1 / OpenVision",
  title: "SemiCon-AI Project Plan Summary",
  styles: { default: { document: { run: { font: "Calibri", size: pt(11), color: DARK } } } },
  sections: [{ properties: { page: { margin: {
    top: convertInchesToTwip(1), bottom: convertInchesToTwip(1),
    left: convertInchesToTwip(1.25), right: convertInchesToTwip(1.25),
  } } }, children: all }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("docs/SemiCon-AI_Project_Plan_Summary.docx", buf);
  console.log("SUCCESS: Project_Plan_Summary.docx");
});
