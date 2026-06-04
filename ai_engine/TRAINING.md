# CervixVisionAI — Model Training Guide

## Architecture

The ensemble consists of two models trained independently and fused at inference:

| Model | Role | Parameters | ONNX file |
|---|---|---|---|
| Swin Transformer | Primary (60% weight) | 88M (Base) / 28M (Tiny) | `artifacts/onnx/swin_model.onnx` |
| EfficientNet-B3 | Secondary (40% weight) | 12M | `artifacts/onnx/efficientnet_model.onnx` |

Both models are trained using a two-stage strategy:
1. **Semi-supervised learning (SSL)** — supervised training on labeled data with
   pseudo-label consistency loss on unlabeled data.
2. **High-sensitivity fine-tuning** — re-trains with 2× loss weight on positive
   class to maximise sensitivity (minimise false negatives for cancer screening).

---

## Choose your hardware profile

### Option A — GPU server or cloud (recommended for best accuracy)
- Uses **Swin Base** (`swin_base_patch4_window7_224`, 88M params)
- Requires ~8 GB VRAM minimum
- Full 25 + 10 epochs per model
- Estimated time: 4–8 hours on a single T4/RTX 3080

```bash
python train.py                       # uses config/params.yaml by default
```

### Option B — CPU laptop (feasible, slower)
- Uses **Swin Tiny** (`swin_tiny_patch4_window7_224`, 28M params)
- Reduced epochs (10 + 5 per model)
- Smaller batch size (8)
- Estimated time: **6–14 hours** on a modern laptop CPU
- EfficientNet-B3 trains in ~3–4 hours; Swin Tiny in ~3–10 hours

```bash
python train.py --config config/params_cpu.yaml
```

### Option C — Free cloud GPU (recommended if laptop is too slow)

**Kaggle** (30 GPU hours/week free, T4 or P100):
1. Go to kaggle.com → New Notebook → Settings → Accelerator: GPU T4
2. Upload the `ai_engine/` directory or clone the repo
3. Run:
```bash
!pip install -e .
!python train.py
```
Download the trained `.pth` and `.onnx` files from the output section.

**Google Colab** (limited free GPU, Pro recommended):
1. New notebook → Runtime → Change runtime type → T4 GPU
2. Mount Google Drive or clone the repo
3. Run the same commands as Kaggle

---

## Prerequisites

```bash
cd ai_engine

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Linux/macOS
venv\Scripts\activate           # Windows

# Install the package and dependencies
pip install -e .
pip install -r requirements.txt
```

Verify CUDA is available (GPU training only):
```python
import torch
print(torch.cuda.is_available())   # True = GPU will be used
print(torch.cuda.get_device_name(0))
```

---

## Data

The dataset is downloaded automatically from HuggingFace during Stage 1:
- **Repository**: `AHFIDAILabs/via-cervix`
- **File**: `via_cervix.zip`
- **Expected structure after extraction**:

```
artifacts/data/final/
├── labeled/
│   ├── Positive/     ← acetowhite-positive cervical images
│   └── Negative/     ← normal cervical images
└── Unlabeled/        ← unlabeled images for SSL
```

If the HuggingFace download fails (rate limit or no internet), place a copy of
`via_cervix.zip` in `data/` — the pipeline will use it as a fallback.

---

## Running training

```bash
# GPU (default — Swin Base + EfficientNet-B3)
python train.py

# CPU laptop (Swin Tiny + EfficientNet-B3, faster config)
python train.py --config config/params_cpu.yaml
```

The pipeline runs 5 stages automatically. Progress is logged to `logfile.log`
and printed to stdout. Each stage is **skipped automatically** if its output
artifacts already exist — so you can safely re-run after a crash.

### Stage breakdown

| Stage | Script | Output |
|---|---|---|
| 1. Data ingestion | `stage_01_data_ingestion.py` | `artifacts/data/final/` |
| 2. Build base models | `stage_02_build_models.py` | `artifacts/build_models/*.pth` |
| 3. Train ensemble | `stage_03_train_ensemble.py` | `artifacts/training/swin_model.pth`, `efficientnet_model.pth` |
| 4. Evaluate | `stage_04_model_evaluation.py` | `artifacts/evaluation/` |
| 5. ONNX export | `stage_05_onnx_export.py` | `artifacts/onnx/swin_model.onnx`, `efficientnet_model.onnx` |

---

## Expected training time estimates

| Hardware | Stage 3 (Swin Base) | Stage 3 (Swin Tiny) | Stage 3 (EfficientNet-B3) | Total |
|---|---|---|---|---|
| NVIDIA T4 (Kaggle) | 1.5–3 h | 40–80 min | 20–40 min | 4–6 h |
| RTX 3080 / 4080 | 45–90 min | 20–40 min | 10–20 min | 2–4 h |
| MacBook M2 (MPS) | 3–6 h | 1–2 h | 30–60 min | 4–8 h |
| Laptop CPU (i7/i9) | 40–80 h ❌ | **6–10 h ✓** | **3–5 h ✓** | **~10–15 h** |

For CPU-only laptops, **always use `params_cpu.yaml`** (Swin Tiny).

---

## Monitoring training progress

```bash
# Watch the log file live
tail -f logfile.log

# Check artifacts as they are created
ls -lh artifacts/training/
ls -lh artifacts/onnx/
```

Training curves are saved as PNGs:
- `artifacts/training/swin_*_curves.png`
- `artifacts/training/efficientnet_*_curves.png`

---

## Validating trained models

After training completes, check evaluation metrics:

```bash
cat artifacts/evaluation/evaluation_metrics.json
```

Target metrics for cervical cancer screening:

| Metric | Minimum acceptable | Target |
|---|---|---|
| Sensitivity (recall for Positive) | ≥ 0.90 | ≥ 0.95 |
| Specificity | ≥ 0.85 | ≥ 0.92 |
| AUC-ROC | ≥ 0.92 | ≥ 0.97 |

If sensitivity is below 0.90, reduce `INFERENCE_THRESHOLD` in `params.yaml`
(e.g., from 0.3 to 0.25) and re-evaluate without retraining.

---

## Validating the ONNX export

Run a quick sanity check on the exported models:

```bash
python - <<'EOF'
import onnxruntime as ort
import numpy as np

for name, path in [
    ("Swin",         "artifacts/onnx/swin_model.onnx"),
    ("EfficientNet", "artifacts/onnx/efficientnet_model.onnx"),
]:
    sess = ort.InferenceSession(path)
    dummy = np.random.randn(1, 3, 224, 224).astype(np.float32)
    out = sess.run(None, {"image": dummy})
    print(f"{name}: output shape {out[0].shape} — OK")
EOF
```

Expected output:
```
Swin: output shape (1, 2) — OK
EfficientNet: output shape (1, 2) — OK
```

---

## Exporting ONNX without retraining

If you already have trained `.pth` files and only need the ONNX files:

```bash
python -c "
from cervix_visionai.pipeline.stage_05_onnx_export import OnnxExportPipeline
OnnxExportPipeline().main()
"
```

---

## Copying models to the Android app

Once ONNX export is complete, copy the models to the frontend assets for
on-device (offline) inference:

```bash
cp artifacts/onnx/swin_model.onnx       ../frontend/assets/models/
cp artifacts/onnx/efficientnet_model.onnx ../frontend/assets/models/
```

The `frontend/utils/onDeviceInference.ts` utility loads these models at runtime
for offline inference when connectivity is unavailable.
