const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, ShadingType, WidthType, VerticalAlign,
  convertInchesToTwip, PageBreak, UnderlineType,
} = require("docx");
const fs = require("fs");

function pt(s) { return s * 2; }
const BLACK = "000000"; const DARK = "1C1C1C"; const TBLHEAD = "E8E8E8";

function pb() { return new Paragraph({ children: [new PageBreak()] }); }
function spacer(b,a) { return new Paragraph({ spacing:{before:b||0,after:a||0}, children:[] }); }
function hr() { return new Paragraph({ spacing:{before:80,after:80}, border:{bottom:{style:BorderStyle.SINGLE,size:4,color:"999999"}}, children:[] }); }

function coverTitle(t) { return new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:240,after:60}, border:{bottom:{style:BorderStyle.THICK,size:8,color:BLACK}}, children:[new TextRun({text:t,bold:true,size:pt(26),color:BLACK,font:"Calibri"})] }); }
function coverSub(t) { return new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:40,after:40}, children:[new TextRun({text:t,size:pt(13),color:DARK,font:"Calibri",italics:true})] }); }
function coverMeta(l,v) { return new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:20,after:20}, children:[new TextRun({text:l+": ",bold:true,size:pt(11),color:DARK,font:"Calibri"}),new TextRun({text:v,size:pt(11),color:DARK,font:"Calibri"})] }); }

function h1(t) { return new Paragraph({ spacing:{before:280,after:60}, border:{bottom:{style:BorderStyle.SINGLE,size:4,color:BLACK}}, children:[new TextRun({text:t,bold:true,size:pt(16),color:BLACK,font:"Calibri"})] }); }
function h2(t) { return new Paragraph({ spacing:{before:180,after:40}, children:[new TextRun({text:t,bold:true,size:pt(13),color:BLACK,font:"Calibri",underline:{type:UnderlineType.SINGLE,color:BLACK}})] }); }
function h3(t) { return new Paragraph({ spacing:{before:120,after:30}, children:[new TextRun({text:t,bold:true,size:pt(11.5),color:BLACK,font:"Calibri"})] }); }

function body(t,opts) {
  opts=opts||{};
  return new Paragraph({ alignment:AlignmentType.JUSTIFIED, spacing:{before:40,after:40}, indent:opts.indent?{left:convertInchesToTwip(opts.indent)}:undefined, children:[new TextRun({text:t,size:pt(11),color:DARK,font:"Calibri",italics:opts.italics||false})] });
}
function bullet(t) {
  return new Paragraph({ spacing:{before:36,after:36}, indent:{left:convertInchesToTwip(0.4),hanging:convertInchesToTwip(0.2)}, children:[new TextRun({text:"-",size:pt(11),color:BLACK,font:"Calibri"}),new TextRun({text:"  "+t,size:pt(11),color:DARK,font:"Calibri"})] });
}
function labelLine(l,t) {
  return new Paragraph({ spacing:{before:36,after:36}, indent:{left:convertInchesToTwip(0.4),hanging:convertInchesToTwip(0.2)}, children:[new TextRun({text:"-  ",size:pt(11),color:BLACK,font:"Calibri"}),new TextRun({text:l+": ",bold:true,size:pt(11),color:BLACK,font:"Calibri"}),new TextRun({text:t,size:pt(11),color:DARK,font:"Calibri"})] });
}
function tc(t,opts) {
  opts=opts||{};
  return new TableCell({
    width:opts.w?{size:opts.w,type:WidthType.PERCENTAGE}:undefined,
    verticalAlign:VerticalAlign.CENTER,
    shading:opts.head?{type:ShadingType.CLEAR,color:"auto",fill:TBLHEAD}:undefined,
    borders:{top:{style:BorderStyle.SINGLE,size:2,color:"999999"},bottom:{style:BorderStyle.SINGLE,size:2,color:"999999"},left:{style:BorderStyle.SINGLE,size:2,color:"999999"},right:{style:BorderStyle.SINGLE,size:2,color:"999999"}},
    children:[new Paragraph({alignment:opts.align||AlignmentType.LEFT,spacing:{before:60,after:60},indent:{left:convertInchesToTwip(0.1)},children:[new TextRun({text:t,bold:opts.bold||false,size:pt(opts.size||10),color:DARK,font:"Calibri"})]})]
  });
}

// COVER
function makeCover() {
  return [
    spacer(120,0),
    coverTitle("OpenVision - SemiCon-AI"),
    coverSub("Hackathon Execution Plan"),
    coverSub("Wafer Image Restoration | Denoising & Super-Resolution"),
    spacer(60,60),
    hr(),
    coverMeta("Schedule",         "30 July 2026 to 16 August 2026"),
    coverMeta("Round 1 Deadline", "16 August 2026"),
    coverMeta("Round 2",          "Approximately 23 August 2026 (1 week after Round 1, if selected)"),
    coverMeta("Team",             "SreeNaresh1"),
    hr(),
    spacer(40,40),
    body("This document is the compressed competition schedule. The master 10-week engineering roadmap continues after Round 1.", {italics:true}),
    pb(),
  ];
}

// TIMELINE OVERVIEW TABLE
function makeTimelineTable() {
  const rows_data = [
    ["Phase 1 - Infrastructure",  "30 Jul - 01 Aug", "3 days", "Degradation pipeline, configs, dummy data, unit tests"],
    ["Phase 2 - Dataset",         "02 Aug - 05 Aug", "4 days", "Validation pipeline, experiment logger, preview QC, docs"],
    ["Phase 3 - Baseline",        "06 Aug - 09 Aug", "4 days", "Denoising baseline training, PSNR/SSIM benchmarks"],
    ["Phase 4 - Evaluation",      "10 Aug - 12 Aug", "3 days", "SR x2 inference, benchmark table, visual QC"],
    ["Phase 5 - Submission Prep", "13 Aug - 15 Aug", "3 days", "Demo, final report, experiment archive, CI polish"],
    ["Round 1 Deadline",          "16 Aug 2026",     "-",      "Submission cutoff"],
  ];
  const header = new TableRow({ tableHeader:true, children:[
    tc("Phase",      {w:30,bold:true,head:true,align:AlignmentType.CENTER}),
    tc("Dates",      {w:22,bold:true,head:true,align:AlignmentType.CENTER}),
    tc("Duration",   {w:12,bold:true,head:true,align:AlignmentType.CENTER}),
    tc("Goal",       {w:36,bold:true,head:true,align:AlignmentType.CENTER}),
  ]});
  const rows = rows_data.map(r => new TableRow({children:[
    tc(r[0],{w:30,bold:true}),
    tc(r[1],{w:22}),
    tc(r[2],{w:12,align:AlignmentType.CENTER}),
    tc(r[3],{w:36}),
  ]}));
  return new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[header,...rows]});
}

// PHASE BUILDER
function buildPhase(p) {
  const items = [
    h1(p.label),
    new Paragraph({ spacing:{before:60,after:60}, children:[
      new TextRun({text:"Dates: ",bold:true,size:pt(11),color:BLACK,font:"Calibri"}),
      new TextRun({text:p.dates,size:pt(11),color:DARK,font:"Calibri"}),
    ]}),
    body(p.goal, {italics:true}),
    spacer(20,20),
    h2("Objectives"),
  ];
  p.objectives.forEach(o => items.push(bullet(o)));
  items.push(h2("Deliverables"));
  p.deliverables.forEach(d => items.push(bullet(d)));
  if (p.deferred) {
    items.push(h2("Deferred to Round 2"));
    p.deferred.forEach(d => items.push(bullet(d)));
  }
  items.push(h2("Risks and Constraints"));
  p.risks.forEach(r => items.push(labelLine("Risk",r)));
  items.push(h2("Exit Criteria"));
  p.exitCriteria.forEach(e => items.push(bullet(e)));
  return items;
}

const phases = [
  {
    label:"Phase 1 - Infrastructure  (30 Jul - 01 Aug 2026)",
    dates:"30 July 2026 to 01 August 2026 (3 days)",
    goal:"Build the full synthetic degradation pipeline and testing foundation. Nothing blocks Phase 2 until this is done.",
    objectives:[
      "Set up Git repository, virtual environment, and CI skeleton",
      "Implement Gaussian and Poisson noise injection (degradation.py)",
      "Implement Gaussian and motion blur degradation module",
      "Implement super-resolution downsampling (x2, x4) within dataset pipeline",
      "Build SEMPairDataset: crop, augment, degrade, return tensors (wafer_dataset.py)",
      "Author base degradation.yaml config and 5 preset YAMLs with schema_version",
      "Build make_dummy_dataset.py to generate placeholder PNGs and manifest.json",
      "Write 37 unit tests: noise, downsample, dataset, reproducibility (pytest)",
      "Confirm same seed produces bit-identical degraded outputs",
    ],
    deliverables:[
      "degradation.py and wafer_dataset.py - stable, tested modules",
      "6 versioned YAML configs (base + 5 presets)",
      "make_dummy_dataset.py generating dummy PNGs and manifest.json",
      "37 passing pytest tests (zero failures)",
      "CI pipeline skeleton (GitHub Actions or equivalent)",
    ],
    risks:[
      "Noise parameter ranges are placeholders until real wafer images arrive - tune in Phase 2",
      "Grayscale-only for now; colour SEM support is deferred to Round 2",
    ],
    exitCriteria:[
      "pytest runs clean: 37 tests, 0 failures",
      "make_dummy_dataset.py produces valid PNGs and manifest.json",
      "Same seed produces bit-identical degradation output (reproducibility test passes)",
    ],
  },
  {
    label:"Phase 2 - Dataset Validation and Experiment Tracking  (02 - 05 Aug 2026)",
    dates:"02 August 2026 to 05 August 2026 (4 days)",
    goal:"Prove the dataset is clean and every experiment is traceable before any training begins.",
    objectives:[
      "Build validate_dataset.py: pixel stats, corrupt-file detection, duplicate check",
      "Ensure CI exits code 1 on corrupt files or duplicates (CI-friendly)",
      "Implement ExperimentLogger writing experiment.csv with git_commit column",
      "Build preview_pairs.py: degradation visual grid and per-sample *_meta.json",
      "Run validate_dataset.py on dummy dataset; produce validation_report.json",
      "Tune noise and blur YAML parameter ranges against real wafer image samples",
      "Write docs/degradation_pipeline.md (complete technical reference, all examples runnable)",
      "Begin baseline training setup in parallel on Day 4 (do not wait for docs to be merged)",
    ],
    deliverables:[
      "validate_dataset.py with CI-friendly exit codes",
      "validation_report.json (schema-versioned)",
      "ExperimentLogger (logger.py) with CSV and git_commit column",
      "preview_pairs.py: degradation_preview.png and degradation_preview_meta.json",
      "Tuned YAML configs based on real-image QC",
      "docs/degradation_pipeline.md reviewed and merged",
    ],
    risks:[
      "Real wafer images may not be available - proceed with dummy data; retune configs when they arrive",
      "Documentation review cycles can extend into Phase 3 time - time-box to 2 hours",
    ],
    exitCriteria:[
      "validate_dataset.py produces valid validation_report.json with zero corrupt files or duplicates",
      "CI fails correctly when corrupt or duplicate images are injected",
      "ExperimentLogger appends a complete row to experiment.csv with a valid git_commit",
      "degradation_preview.png generated and visually reviewed",
    ],
  },
  {
    label:"Phase 3 - Baseline Training - Denoising  (06 - 09 Aug 2026)",
    dates:"06 August 2026 to 09 August 2026 (4 days)",
    goal:"Have a working, logged, reproducible denoising baseline before Round 1. Do not defer training.",
    objectives:[
      "Implement train.py: training loop, DataLoader with seed_worker, checkpoint saves",
      "Select baseline denoising architecture: UNet or DnCNN",
      "Configure L1 loss (with optional perceptual loss) and Adam optimiser",
      "Run baseline training on denoise_light, denoise_medium, and denoise_heavy presets",
      "Compute PSNR and SSIM metrics on held-out validation split",
      "Log all runs to experiment.csv (config name, git commit, epoch, loss, PSNR, SSIM)",
      "Save best model checkpoint per preset with config snapshot alongside",
      "Qualitative visual inspection: before and after image comparisons",
      "Document baseline benchmark results (target PSNR range based on literature)",
    ],
    deliverables:[
      "train.py supporting all denoise presets via --config flag",
      "Denoising model checkpoints (light, medium, heavy)",
      "PSNR and SSIM benchmark table (3 presets x validation set)",
      "experiment.csv with complete run history and git hashes",
      "Qualitative before and after image gallery (minimum 6 samples per preset)",
    ],
    risks:[
      "Out-of-memory on GPU - reduce batch size or crop size first; do not switch architecture",
      "seed_worker must be passed to every DataLoader; missing it silently reduces training diversity",
      "Training instability: check learning rate first (1e-4 is safe default); do not change architecture mid-phase",
    ],
    exitCriteria:[
      "All three denoise presets train to convergence with no NaN or Inf loss",
      "PSNR and SSIM logged for every run and traceable via git commit",
      "Best checkpoints load cleanly and produce valid inference outputs",
    ],
  },
  {
    label:"Phase 4 - Evaluation - SR x2 and Benchmarking  (10 - 12 Aug 2026)",
    dates:"10 August 2026 to 12 August 2026 (3 days)",
    goal:"Deliver SR x2 results and a consolidated benchmark table. x4, LPIPS, colour support, and ablations are deferred to Round 2.",
    objectives:[
      "Adapt train.py for super-resolution task: SR-specific loss (L1 and perceptual)",
      "Run SR x2 baseline training using sr_x2.yaml preset",
      "Compute PSNR and SSIM for SR x2 on held-out test split",
      "Implement infer.py: single-image and batch inference script",
      "Run inference on unseen wafer images; inspect upscaled outputs visually",
      "Produce consolidated benchmark table: denoise (3 presets) and SR x2",
      "Document Round 1 limitations: x4 deferred, LPIPS deferred, colour support deferred",
    ],
    deliverables:[
      "train.py updated to support sr_x2 preset",
      "SR x2 model checkpoint",
      "infer.py: single-image and batch inference",
      "Consolidated benchmark table (denoise light, medium, heavy and SR x2)",
      "Round 1 limitations section in docs",
    ],
    deferred:[
      "SR x4 training (sr_x4.yaml preset)",
      "LPIPS perceptual metric evaluation",
      "Colour SEM imagery support",
      "Ablation study: with and without Poisson noise during SR training",
      "Extended architecture comparison",
    ],
    risks:[
      "SR x2 training time may exceed 3 days on limited hardware - cut epochs; prioritise converged checkpoints over final accuracy",
      "Do not start SR x4 in this phase - it risks leaving x2 incomplete for Round 1",
    ],
    exitCriteria:[
      "SR x2 trains to convergence and PSNR and SSIM logged",
      "infer.py runs on unseen images without errors",
      "Consolidated benchmark table is complete and reproducible",
    ],
  },
  {
    label:"Phase 5 - Submission Preparation  (13 - 15 Aug 2026)",
    dates:"13 August 2026 to 15 August 2026 (3 days)",
    goal:"Polish, package, and submit. Nothing new gets built in this phase.",
    objectives:[
      "Harden CI: lint (ruff/flake8), test gates enforced on all PRs",
      "Expand unit tests to cover train.py and infer.py (target: 50+ tests)",
      "Record demo video: raw wafer image to denoised output to SR x2 output",
      "Write final Round 1 technical report: methodology, results, limitations",
      "Archive reproducible experiment bundle (configs, weights, CSV, docs)",
      "Merge all open feature branches to main",
      "Final end-to-end smoke test: clone repo, setup env, run full pipeline",
      "Review submission requirements and checklist",
    ],
    deliverables:[
      "50+ passing unit tests (100% pass rate)",
      "CI pipeline blocking PRs on lint or test failures",
      "Demo video (raw image to denoised to SR x2)",
      "Round 1 technical report (PDF or DOCX)",
      "Reproducible experiment archive (configs, weights, CSV, docs)",
      "Clean main branch with all PRs merged",
    ],
    risks:[
      "Do not introduce new features in this phase - every new line of code is a risk to submission stability",
      "Smoke test the full pipeline on a clean environment before final submission",
      "Record the demo video by 14 August to allow one day of contingency",
    ],
    exitCriteria:[
      "Full pipeline reproducible on a fresh clone with a single setup command",
      "50+ tests passing, CI green on main branch",
      "Demo video recorded and reviewed",
      "Technical report finalised and ready to attach",
    ],
  },
];

function makeRound1Block() {
  return [
    hr(),
    h1("Round 1 Deadline - 16 August 2026"),
    body("Submit by end of day. All Phase 1 through Phase 5 deliverables must be complete and the repository must be in a clean, reproducible state."),
    spacer(40,40),
    h2("Submission Checklist"),
    bullet("Git repository is public or access has been granted to judges"),
    bullet("README.md with quickstart instructions (single setup command)"),
    bullet("All model checkpoints accessible (link or bundled archive)"),
    bullet("Benchmark table included (denoise x3 presets and SR x2)"),
    bullet("Demo video attached or linked"),
    bullet("Technical report attached"),
    bullet("experiment.csv with traceable run history"),
    bullet("pytest suite passing on CI (link to CI run)"),
  ];
}

function makeRound2Block() {
  return [
    pb(),
    h1("Round 2 Plan  (If Selected - approx. 23 August 2026)"),
    body("If selected for Round 2, resume the master 10-week engineering roadmap from Sprint 4 Phase 2 onwards. Work items are listed in priority order."),
    spacer(20,20),
    h2("Round 2 Objectives"),
    bullet("SR x4 training using sr_x4.yaml preset"),
    bullet("LPIPS perceptual metric evaluation across all tasks"),
    bullet("Ablation study: with and without Poisson noise during SR training"),
    bullet("Colour SEM imagery support (extend wafer_dataset.py channel handling)"),
    bullet("Mixed-precision training (torch.cuda.amp) for GPU efficiency"),
    bullet("Extended architecture comparison (ESRGAN and SwinIR consideration)"),
    bullet("Learning-rate scheduling and early stopping"),
    h2("Round 2 Deliverables"),
    bullet("SR x4 model checkpoint and benchmark row"),
    bullet("Full LPIPS scores across denoise and SR tasks"),
    bullet("Ablation study report"),
    bullet("Colour SEM support (if dataset provides colour images)"),
    bullet("Updated final technical report with complete results"),
    spacer(40,40),
    body("After Round 2, continue the full 10-week master roadmap (Sprint 5 polish tasks: AMP, CI hardening, final demo, experiment archive) to produce the production-grade open-source release.", {italics:true}),
  ];
}

const all = [
  ...makeCover(),
  h1("Hackathon Timeline Overview"),
  spacer(60,60),
  makeTimelineTable(),
  spacer(80,80),
  hr(),
];

phases.forEach((p,i) => {
  all.push(...buildPhase(p));
  if (i < phases.length - 1) { all.push(hr()); all.push(pb()); }
});

all.push(...makeRound1Block());
all.push(...makeRound2Block());

const doc = new Document({
  creator:"SreeNaresh1 / OpenVision",
  title:"SemiCon-AI Hackathon Execution Plan",
  styles:{default:{document:{run:{font:"Calibri",size:pt(11),color:DARK}}}},
  sections:[{properties:{page:{margin:{top:convertInchesToTwip(1),bottom:convertInchesToTwip(1),left:convertInchesToTwip(1.25),right:convertInchesToTwip(1.25)}}},children:all}],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("docs/SemiCon-AI_Hackathon_Execution_Plan.docx", buf);
  console.log("SUCCESS: Hackathon_Execution_Plan.docx");
});
