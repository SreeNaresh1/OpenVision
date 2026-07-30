const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, ShadingType, WidthType, VerticalAlign,
  convertInchesToTwip, PageBreak,
} = require("docx");
const fs = require("fs");

function pt(s) { return s * 2; }

const C = {
  navy:"0D2137", navyMid:"1A3A5C", navyLight:"1E3A5F",
  cyan:"00C2E0", cyanSoft:"B3EEF8", cyanPale:"E8F8FD",
  amber:"F4A124", amberPale:"FEF6E4",
  green:"1A7A4A", greenSoft:"D0F0E0", greenPale:"F0FAF5",
  purple:"6C3483", purplePale:"F5EEF8",
  red:"C0392B", redPale:"FDEDEC",
  white:"FFFFFF", dark:"1C1C1C", gray:"4A4A4A", grayLight:"7F8C8D",
  border:"BDD7EE", rowAlt:"F4F9FD", rowHead:"0D2137",
};

function pt2(s) { return s * 2; }
function pb() { return new Paragraph({ children: [new PageBreak()] }); }
function spacer(b,a,fill) {
  return new Paragraph({ spacing:{before:b||0,after:a||0}, shading:fill?{type:ShadingType.CLEAR,color:"auto",fill}:undefined, children:[] });
}
function hr(color) {
  return new Paragraph({ spacing:{before:60,after:60}, border:{bottom:{style:BorderStyle.SINGLE,size:2,color:color||C.border}}, children:[] });
}
function bgPara(fill, text, opts) {
  opts=opts||{};
  return new Paragraph({
    alignment:opts.align||AlignmentType.CENTER,
    spacing:{before:opts.before||0,after:opts.after||0},
    indent:opts.indent?{left:convertInchesToTwip(opts.indent)}:undefined,
    border:opts.border||undefined,
    shading:{type:ShadingType.CLEAR,color:"auto",fill},
    children:text?[new TextRun({text,bold:opts.bold!==false,italics:opts.italics||false,size:pt(opts.size||11),color:opts.color||C.white,font:"Calibri",allCaps:opts.allCaps||false})]:[],
  });
}
function heading(text,color,bgColor,size,opts) {
  opts=opts||{};
  return new Paragraph({
    alignment:opts.align||AlignmentType.LEFT,
    spacing:{before:opts.before||200,after:opts.after||40},
    indent:{left:convertInchesToTwip(0.15)},
    shading:{type:ShadingType.CLEAR,color:"auto",fill:bgColor||C.navyMid},
    border:opts.border||{bottom:{style:BorderStyle.SINGLE,size:4,color:C.cyan}},
    children:[new TextRun({text,bold:true,size:pt(size||14),color:color||C.white,font:"Calibri",allCaps:opts.allCaps||false})],
  });
}
function body(runs_or_text,opts) {
  opts=opts||{};
  let children;
  if(typeof runs_or_text==="string"){
    children=[new TextRun({text:runs_or_text,size:pt(opts.size||11),color:opts.color||C.dark,font:"Calibri",bold:opts.bold||false,italics:opts.italics||false})];
  } else { children=runs_or_text; }
  return new Paragraph({
    alignment:opts.align||AlignmentType.LEFT,
    spacing:{before:opts.before||40,after:opts.after||40},
    indent:opts.indent?{left:convertInchesToTwip(opts.indent)}:undefined,
    shading:opts.fill?{type:ShadingType.CLEAR,color:"auto",fill:opts.fill}:undefined,
    border:opts.border||undefined,
    children,
  });
}
function bullet(sym,symColor,text,textColor,size) {
  return new Paragraph({
    spacing:{before:36,after:36},
    indent:{left:convertInchesToTwip(0.38),hanging:convertInchesToTwip(0.22)},
    children:[
      new TextRun({text:sym+"  ",color:symColor,size:pt(size||11),font:"Calibri",bold:true}),
      new TextRun({text,size:pt(size||11),color:textColor||C.dark,font:"Calibri"}),
    ],
  });
}
function callout(text,fill,borderColor,textColor) {
  return new Paragraph({
    spacing:{before:60,after:60},
    indent:{left:convertInchesToTwip(0.2)},
    shading:{type:ShadingType.CLEAR,color:"auto",fill:fill||C.cyanPale},
    border:{left:{style:BorderStyle.THICK,size:14,color:borderColor||C.cyan}},
    children:[new TextRun({text,size:pt(11),color:textColor||C.navyMid,font:"Calibri",italics:true})],
  });
}
function tc(text,opts) {
  opts=opts||{};
  return new TableCell({
    width:opts.width?{size:opts.width,type:WidthType.PERCENTAGE}:undefined,
    verticalAlign:VerticalAlign.CENTER,
    shading:opts.fill?{type:ShadingType.CLEAR,color:"auto",fill:opts.fill}:undefined,
    borders:{
      top:{style:BorderStyle.SINGLE,size:1,color:opts.borderColor||C.border},
      bottom:{style:BorderStyle.SINGLE,size:1,color:opts.borderColor||C.border},
      left:{style:BorderStyle.SINGLE,size:1,color:opts.borderColor||C.border},
      right:{style:BorderStyle.SINGLE,size:1,color:opts.borderColor||C.border},
    },
    children:[new Paragraph({
      alignment:opts.align||AlignmentType.LEFT,
      spacing:{before:60,after:60},
      indent:{left:convertInchesToTwip(0.1)},
      children:opts.runs?opts.runs:[new TextRun({text,bold:opts.bold||false,size:pt(opts.size||10),color:opts.color||C.dark,font:"Calibri",italics:opts.italics||false})],
    })],
  });
}
function headerCell(text,width) {
  return tc(text,{bold:true,color:C.white,fill:C.rowHead,size:10.5,width,align:AlignmentType.CENTER,borderColor:C.navyMid});
}

// COVER
function makeCover() {
  return [
    spacer(0,0,C.navy),
    bgPara(C.navy,"OpenVision  |  SemiCon-AI",{size:26,before:80,after:20,border:{bottom:{style:BorderStyle.THICK,size:10,color:C.cyan}}}),
    bgPara(C.navy,"PROJECT PLAN SUMMARY",{size:20,color:C.cyan,after:10,allCaps:true}),
    bgPara(C.navy,"Wafer Image Restoration  |  Denoising & Super-Resolution",{size:12,color:C.cyanSoft,italics:true,after:60}),
    bgPara(C.navy,"\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",{size:10,color:C.cyan,before:20,after:20,bold:false}),
    new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:20,after:20},shading:{type:ShadingType.CLEAR,color:"auto",fill:C.navy},children:[new TextRun({text:"Domain:  ",bold:true,size:pt(11),color:C.amber,font:"Calibri"}),new TextRun({text:"Semiconductor Wafer Inspection  |  Deep Learning  |  Computer Vision",size:pt(11),color:C.white,font:"Calibri"})]}),
    new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:20,after:20},shading:{type:ShadingType.CLEAR,color:"auto",fill:C.navy},children:[new TextRun({text:"Tasks:  ",bold:true,size:pt(11),color:C.amber,font:"Calibri"}),new TextRun({text:"Image Denoising  +  Super-Resolution (x2, x4)",size:pt(11),color:C.white,font:"Calibri"})]}),
    new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:20,after:20},shading:{type:ShadingType.CLEAR,color:"auto",fill:C.navy},children:[new TextRun({text:"Team:  ",bold:true,size:pt(11),color:C.amber,font:"Calibri"}),new TextRun({text:"SreeNaresh1",size:pt(11),color:C.white,font:"Calibri"})]}),
    new Paragraph({alignment:AlignmentType.CENTER,spacing:{before:20,after:20},shading:{type:ShadingType.CLEAR,color:"auto",fill:C.navy},children:[new TextRun({text:"Date:  ",bold:true,size:pt(11),color:C.amber,font:"Calibri"}),new TextRun({text:"July 2026",size:pt(11),color:C.white,font:"Calibri"})]}),
    bgPara(C.navy,"\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",{size:10,color:C.cyan,before:20,after:80,bold:false}),
    spacer(0,0,C.navy),
    pb(),
  ];
}

// SECTION 1: OVERVIEW
function makeOverview() {
  return [
    heading("1.  Project Overview",C.white,C.navy,16,{border:{bottom:{style:BorderStyle.THICK,size:6,color:C.cyan}}}),
    spacer(40,20),
    callout("OpenVision (SemiCon-AI) is an AI-powered image restoration system for semiconductor wafer inspection imagery. It applies deep learning to reverse the degradation introduced by scanning electron microscopes (SEM) and optical inspection tools, producing cleaner, higher-resolution images that improve defect detection accuracy downstream.",C.cyanPale,C.cyan,C.navyMid),
    spacer(40,40),
    heading("Background & Problem Statement",C.white,C.navyMid,13),
    body("Semiconductor manufacturing relies on wafer inspection imagery to detect microscopic defects at nanometer scale. SEM and optical inspection systems introduce two primary degradation types that compromise downstream defect analysis:",{before:80,after:40}),
    bullet("\u25B8",C.cyan,"Noise  \u2014  Gaussian shot noise and Poisson (photon-count) noise arise from electron beam physics and detector sensitivity limits.",C.dark),
    bullet("\u25B8",C.cyan,"Blur   \u2014  Gaussian and motion blur occur from beam focus instability, vibration, and sample drift during acquisition.",C.dark),
    bullet("\u25B8",C.cyan,"Low Resolution  \u2014  High-throughput scan modes trade pixel density for speed, producing images too coarse for fine-grained defect localisation.",C.dark),
    spacer(20,20),
    body("No paired real-world dataset (clean + degraded) exists publicly for this domain. The project generates synthetic degradation from clean reference images \u2014 the same approach used in published wafer-TEM/SEM restoration literature \u2014 then trains neural networks to reverse those corruptions.",{before:40,after:80}),
    heading("Goals",C.white,C.navyMid,13),
    bullet("\u2714",C.green,"Build a reproducible, config-driven synthetic degradation pipeline for SEM / optical wafer images",C.dark),
    bullet("\u2714",C.green,"Train baseline denoising models (UNet / DnCNN) and evaluate with PSNR and SSIM metrics",C.dark),
    bullet("\u2714",C.green,"Train super-resolution models (x2, x4) and benchmark against published literature",C.dark),
    bullet("\u2714",C.green,"Produce a fully traceable experiment log tying every result to a git commit and config version",C.dark),
    bullet("\u2714",C.green,"Deliver a clean, CI-tested, documented codebase ready for external reproducibility",C.dark),
    spacer(40,80),
    heading("Key Constraints",C.white,C.navyMid,13),
    bullet("\u26A0",C.amber,"No paired real dataset exists publicly  \u2014  all training data is synthetically generated",C.dark),
    bullet("\u26A0",C.amber,"Grayscale SEM imagery in Phase 1; colour SEM support is a Round 2 extension",C.dark),
    bullet("\u26A0",C.amber,"Hackathon Round 1 deadline: 16 August 2026  \u2014  only 17 days from project start",C.dark),
    bullet("\u26A0",C.amber,"Reproducibility is a first-class requirement: every result must be traceable to a git commit",C.dark),
  ];
}

// SECTION 2: ARCHITECTURE
function makeArchitecture() {
  const stages = [
    ["Stage 1  \u2014  Synthetic Degradation","degradation.py applies probabilistic Gaussian noise, Poisson noise, Gaussian/motion blur, and downsampling. Each stage is gated by an independent probability p, producing a diverse training distribution. Every output carries a versioned metadata schema."],
    ["Stage 2  \u2014  Dataset Loading","SEMPairDataset (wafer_dataset.py) reads source images, applies random crops and Albumentations geometric augmentations, calls the degrader, and returns (clean, degraded) tensor pairs. seed_worker ensures deterministic multi-worker degradation."],
    ["Stage 3  \u2014  Configuration & Experiment Management","All parameters live in versioned YAML configs (schema_version field). Six presets ship out of the box. ExperimentLogger appends rows to experiment.csv stamped with git commit, config name, loss, PSNR, and SSIM."],
    ["Stage 4  \u2014  Model Training","train.py accepts a --config flag and supports both denoising and SR tasks. Checkpoints are saved per epoch alongside a config snapshot. AMP and LR scheduling are Sprint 5 additions."],
    ["Stage 5  \u2014  Evaluation & Inference","PSNR and SSIM computed on a held-out split after every epoch. validate_dataset.py provides objective dataset health checks before training. infer.py runs single-image or batch inference. LPIPS and ablation studies are Round 2 additions."],
  ];
  const items = [
    pb(),
    heading("2.  Architecture Overview",C.white,C.navy,16,{border:{bottom:{style:BorderStyle.THICK,size:6,color:C.cyan}}}),
    spacer(40,40),
    callout("The system is a modular research pipeline: synthetic degradation \u2192 dataset loading \u2192 model training \u2192 evaluation \u2192 inference. Each stage is independently testable, config-driven, and produces versioned artefacts.",C.cyanPale,C.cyan,C.navyMid),
    spacer(40,40),
    heading("Pipeline Stages",C.white,C.navyMid,13),
    spacer(20,20),
  ];
  stages.forEach(s => {
    items.push(new Paragraph({spacing:{before:50,after:20},children:[new TextRun({text:s[0],bold:true,size:pt(11.5),color:C.navyMid,font:"Calibri"})]}));
    items.push(new Paragraph({spacing:{before:20,after:50},indent:{left:convertInchesToTwip(0.3)},children:[new TextRun({text:s[1],size:pt(10.5),color:C.gray,font:"Calibri"})]}));
  });
  items.push(heading("Quality & Reproducibility Layer",C.white,C.navyMid,13));
  ["37+ pytest unit tests covering noise, downsample, dataset loading, and seed reproducibility",
   "CI pipeline (GitHub Actions) with lint, type-check, and test gates on every PR",
   "validate_dataset.py exits code 1 on corrupt files or duplicates  \u2014  CI-friendly",
   "preview_pairs.py generates visual QC grids and per-sample JSON metadata",
   "Every result traceable to exact git commit via experiment.csv"
  ].forEach(t => items.push(bullet("\u25B8",C.cyan,t,C.dark)));
  return items;
}

// SECTION 3: TECH STACK TABLE
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
  const headerRow = new TableRow({
    tableHeader:true,
    children:[headerCell("Layer",18),headerCell("Technology",22),headerCell("Package / Import",16),headerCell("Purpose",44)],
  });
  const dataRows = stackRows.map((r,i) => {
    const fill = i%2===0 ? C.white : C.rowAlt;
    return new TableRow({ children:[
      tc(r[0],{width:18,fill,bold:true,color:C.navy,size:10}),
      tc(r[1],{width:22,fill,color:C.dark,size:10}),
      tc(r[2]||"\u2014",{width:16,fill,color:C.grayLight,size:9.5,italics:true}),
      tc(r[3],{width:44,fill,color:C.gray,size:10}),
    ]});
  });
  return new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:[headerRow,...dataRows]});
}

function makeTechStack() {
  return [
    pb(),
    heading("3.  Tech Stack",C.white,C.navy,16,{border:{bottom:{style:BorderStyle.THICK,size:6,color:C.cyan}}}),
    spacer(60,60),
    makeStackTable(),
    spacer(80,80),
  ];
}

// SECTION 4: WHY THIS STACK
const whyReasons = [
  {n:1,title:"PyTorch over TensorFlow",fill:C.cyanPale,border:C.cyan,
   text:"PyTorch's dynamic computation graph makes it the dominant framework in academic image restoration research (DnCNN, SRGAN, SwinIR are all PyTorch-native). Its DataLoader and seed_worker APIs give fine-grained control over multi-worker determinism, which is critical for reproducing degradation across training runs. Native AMP (torch.cuda.amp) is a one-line addition for mixed-precision training in Sprint 5."},
  {n:2,title:"OpenCV + NumPy for degradation (not torchvision transforms)",fill:C.greenPale,border:C.green,
   text:"Degradation physics (Gaussian noise sigma, Poisson peak, blur kernel size) must be tunable at the exact numerical level. OpenCV and NumPy operate on raw arrays with stable, predictable cross-version behaviour. torchvision transforms abstract these parameters in ways that can change between versions, silently breaking reproducibility. Using OpenCV/NumPy for noise and blur while reserving Albumentations only for geometric augmentations gives the best of both."},
  {n:3,title:"Albumentations for geometric augmentation only",fill:C.purplePale,border:C.purple,
   text:"Albumentations provides a dual-transform API that applies the same spatial transform to both the clean and degraded image in a pair. This is essential for maintaining pixel alignment in supervised restoration training. Its API is stable for geometric operations (flip, rotate, crop), which is all the project uses it for."},
  {n:4,title:"YAML configs with schema_version (not argparse or .env files)",fill:C.amberPale,border:C.amber,
   text:"Hardcoded argparse flags cannot be archived alongside a checkpoint. .env files are not diff-friendly. YAML files are human-readable, Git-committable, and can be schema-versioned. Bundling a config snapshot next to every checkpoint means any experiment can be reproduced years later by pointing train.py at the saved YAML. The schema_version field ensures backward compatibility as parameters evolve."},
  {n:5,title:"CSV experiment logging (not TensorBoard or Weights & Biases)",fill:C.cyanPale,border:C.cyan,
   text:"TensorBoard and W&B require running services and have dependency chains that can fail in CI or offline environments. A CSV file is zero-dependency, portable, human-readable, Git-diffable, and survives tool deprecations. Adding a git_commit column means every row is permanently traceable to exact code state. TensorBoard can be layered on top later; CSV cannot be added retroactively."},
  {n:6,title:"pytest with strict unit tests from day one",fill:C.greenPale,border:C.green,
   text:"Image processing bugs (off-by-one in crop size, RNG seed not propagating, noise applied twice) are invisible to the human eye but destroy training metrics. The test suite catches these at module level: test_p0_means_no_degradation, test_same_seed_same_output, test_lower_peak_means_higher_variance. CI integration ensures every PR is automatically validated, preventing regressions during the fast hackathon iteration cycle."},
  {n:7,title:"GitHub Actions CI (not manual testing)",fill:C.purplePale,border:C.purple,
   text:"In a hackathon with a hard deadline, manual testing is a liability. CI enforces that the full test suite passes, linting is clean, and dataset validation exits correctly before any merge. The validate_dataset.py exit-code-1 pattern makes dataset integrity a CI gate, not a checklist item. This frees the team to iterate quickly on model architecture without worrying about silent infrastructure regressions."},
];

function makeWhyStack() {
  const items = [
    heading("4.  Why This Stack?",C.white,C.navy,16,{border:{bottom:{style:BorderStyle.THICK,size:6,color:C.cyan}}}),
    spacer(40,40),
    callout("Every technology choice is driven by three principles: (1) reproducibility \u2014 results must be traceable months later; (2) hackathon velocity \u2014 the toolchain must not block iteration; (3) research alignment \u2014 the stack must match the ecosystem where wafer restoration research is published.",C.cyanPale,C.cyan,C.navyMid),
    spacer(60,60),
  ];
  whyReasons.forEach(r => {
    items.push(new Paragraph({spacing:{before:80,after:20},children:[
      new TextRun({text:r.n+".  ",bold:true,size:pt(12),color:C.navy,font:"Calibri"}),
      new TextRun({text:r.title,bold:true,size:pt(12),color:C.navyMid,font:"Calibri"}),
    ]}));
    items.push(new Paragraph({
      spacing:{before:20,after:60},
      indent:{left:convertInchesToTwip(0.2)},
      shading:{type:ShadingType.CLEAR,color:"auto",fill:r.fill},
      border:{left:{style:BorderStyle.THICK,size:12,color:r.border}},
      children:[new TextRun({text:r.text,size:pt(11),color:C.gray,font:"Calibri"})],
    }));
  });
  return items;
}

// SECTION 5: DELIVERABLES
function makeDeliverables() {
  return [
    pb(),
    heading("5.  Deliverables at a Glance",C.white,C.navy,16,{border:{bottom:{style:BorderStyle.THICK,size:6,color:C.cyan}}}),
    spacer(40,40),
    heading("Code & Modules",C.white,C.navyMid,13),
    bullet("\u2714",C.green,"degradation.py  \u2014  Gaussian noise, Poisson noise, blur, downsampling with versioned metadata schema",C.dark),
    bullet("\u2714",C.green,"wafer_dataset.py  \u2014  SEMPairDataset, seed_worker, crop + augment + degrade pipeline",C.dark),
    bullet("\u2714",C.green,"logger.py  \u2014  ExperimentLogger with git commit, config, PSNR, SSIM columns",C.dark),
    bullet("\u2714",C.green,"train.py  \u2014  Training loop supporting all denoise and SR presets via --config",C.dark),
    bullet("\u2714",C.green,"infer.py  \u2014  Single-image and batch inference script",C.dark),
    bullet("\u2714",C.green,"validate_dataset.py  \u2014  CI-friendly dataset health check (exits code 1 on failure)",C.dark),
    bullet("\u2714",C.green,"preview_pairs.py  \u2014  Visual degradation grid + per-sample metadata JSON",C.dark),
    bullet("\u2714",C.green,"make_dummy_dataset.py  \u2014  Placeholder image + manifest.json generator",C.dark),
    spacer(20,20),
    heading("Configuration Presets",C.white,C.navyMid,13),
    bullet("\u25B8",C.cyan,"degradation.yaml  \u2014  Base config with all tunable parameters (schema_version: 1.0.0)",C.dark),
    bullet("\u25B8",C.cyan,"denoise_light.yaml  /  denoise_medium.yaml  /  denoise_heavy.yaml  \u2014  Denoising presets",C.dark),
    bullet("\u25B8",C.cyan,"sr_x2.yaml  /  sr_x4.yaml  \u2014  Super-resolution scale presets",C.dark),
    spacer(20,20),
    heading("Tests & Quality Gates",C.white,C.navyMid,13),
    bullet("\u25B8",C.cyan,"test_noise.py  \u2014  Gaussian + Poisson noise correctness (incl. physical property: lower peak higher variance)",C.dark),
    bullet("\u25B8",C.cyan,"test_downsample.py  \u2014  Downsample output size and pixel range validation",C.dark),
    bullet("\u25B8",C.cyan,"test_dataset.py  \u2014  p=0 (no degradation), p=1 (always degrade), metadata schema validation",C.dark),
    bullet("\u25B8",C.cyan,"test_reproducibility.py  \u2014  Same seed gives bit-identical output; different seeds give different outputs",C.dark),
    spacer(20,20),
    heading("Artefacts & Reports",C.white,C.navyMid,13),
    bullet("\u25B8",C.cyan,"validation_report.json  \u2014  Dataset health: image count, size stats, corrupt/duplicate counts",C.dark),
    bullet("\u25B8",C.cyan,"experiment.csv  \u2014  Full traceable run history (timestamp, git_commit, config, loss, PSNR, SSIM)",C.dark),
    bullet("\u25B8",C.cyan,"degradation_preview.png  /  *_meta.json  \u2014  Visual QC grid and per-sample degradation metadata",C.dark),
    bullet("\u25B8",C.cyan,"Model checkpoints  \u2014  Best epoch per config preset with config snapshot bundled alongside",C.dark),
    bullet("\u25B8",C.cyan,"docs/degradation_pipeline.md  \u2014  Complete technical reference with all examples runnable",C.dark),
    spacer(20,20),
    heading("Success Metrics",C.white,C.navyMid,13),
    bullet("\u25A0",C.navy,"Denoising (all 3 presets)  \u2014  PSNR and SSIM benchmarked vs. literature baselines",C.dark),
    bullet("\u25A0",C.navy,"SR x2 (Round 1 target)  \u2014  PSNR and SSIM on held-out test split",C.dark),
    bullet("\u25A0",C.navy,"SR x4 (Round 2 target)  \u2014  PSNR, SSIM, and LPIPS perceptual metric",C.dark),
    bullet("\u25A0",C.navy,"Test suite  \u2014  50+ passing tests at Round 1 submission; 100% pass rate enforced by CI",C.dark),
    spacer(60,80),
    callout("All deliverables are designed to be independently reproducible: clone the repo, run pip install -r requirements-degradation.txt, then execute any script with its preset YAML. No hidden state, no external services, no manual configuration required.",C.greenPale,C.green,C.green),
  ];
}

// SECTION 6: RISKS
const risks = [
  {risk:"No real paired dataset exists publicly",level:"HIGH",fill:C.redPale,border:C.red,
   mit:"Generate synthetic degradation from clean images. Tune noise/blur YAML parameters once real samples are available. Document all assumptions explicitly in config files."},
  {risk:"Training time exceeds available GPU budget",level:"MED",fill:C.amberPale,border:C.amber,
   mit:"Reduce batch size and crop size first. Prioritise converged checkpoints over final-epoch accuracy. Apply AMP (Sprint 5) to recover throughput."},
  {risk:"Noise parameter ranges mismatch real SEM imagery",level:"MED",fill:C.amberPale,border:C.amber,
   mit:"Run validate_dataset.py and preview_pairs.py early. Compare preview grids against problem-statement images. Retune YAML configs in Phase 2."},
  {risk:"seed_worker omitted from DataLoader",level:"LOW",fill:C.greenPale,border:C.green,
   mit:"Covered by test_reproducibility.py. CI gate on pytest catches this before training begins."},
  {risk:"SR x4 scope cannot fit Round 1 deadline",level:"PLAN",fill:C.cyanPale,border:C.cyan,
   mit:"SR x4 is explicitly deferred to Round 2. Round 1 delivers SR x2 only. Documented in the Hackathon Execution Plan."},
  {risk:"Documentation review delays Phase 3 start",level:"LOW",fill:C.greenPale,border:C.green,
   mit:"Time-box documentation review to 2 hours. Begin train.py scaffolding in parallel from Phase 2 Day 4."},
];

function makeRisks() {
  const items = [
    heading("6.  Risks & Mitigations",C.white,C.navy,16,{border:{bottom:{style:BorderStyle.THICK,size:6,color:C.cyan}}}),
    spacer(60,60),
  ];
  risks.forEach(r => {
    items.push(new Paragraph({spacing:{before:60,after:10},children:[
      new TextRun({text:"["+r.level+"]  ",bold:true,size:pt(10),color:r.border,font:"Calibri"}),
      new TextRun({text:r.risk,bold:true,size:pt(11),color:C.navy,font:"Calibri"}),
    ]}));
    items.push(new Paragraph({
      spacing:{before:10,after:40},
      indent:{left:convertInchesToTwip(0.2)},
      shading:{type:ShadingType.CLEAR,color:"auto",fill:r.fill},
      border:{left:{style:BorderStyle.THICK,size:12,color:r.border}},
      children:[
        new TextRun({text:"Mitigation:  ",bold:true,size:pt(10.5),color:r.border,font:"Calibri"}),
        new TextRun({text:r.mit,size:pt(10.5),color:C.gray,font:"Calibri"}),
      ],
    }));
  });
  return items;
}

// ASSEMBLE
const allParas = [
  ...makeCover(),
  ...makeOverview(),
  ...makeArchitecture(),
  ...makeTechStack(),
  hr(),
  ...makeWhyStack(),
  ...makeDeliverables(),
  hr(),
  ...makeRisks(),
];

const doc = new Document({
  creator:"SreeNaresh1 / OpenVision",
  title:"SemiCon-AI Project Plan Summary",
  description:"Project overview, tech stack, architecture, deliverables and risks for OpenVision SemiCon-AI",
  styles:{default:{document:{run:{font:"Calibri",size:pt(11),color:C.dark}}}},
  sections:[{
    properties:{page:{margin:{top:convertInchesToTwip(0.75),bottom:convertInchesToTwip(0.75),left:convertInchesToTwip(0.9),right:convertInchesToTwip(0.9)}}},
    children:allParas,
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("docs/SemiCon-AI_Project_Plan_Summary.docx", buffer);
  console.log("SUCCESS: docs/SemiCon-AI_Project_Plan_Summary.docx generated.");
});
