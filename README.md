# CervixVisionAI

An AI-powered, smartphone-based screening tool that puts specialist-level
cervical cancer detection into the hands of frontline health workers in
low-resource settings.

Cervical cancer is preventable, yet kills over 350,000 women a year — 90% of
them in low- and middle-income countries, where Visual Inspection with Acetic
Acid (VIA) remains the dominant screening method despite its low sensitivity
and high inter-observer variability. CervixVisionAI closes that gap with an
ensemble deep-learning model that analyzes VIA images on-device and returns a
risk score, lesion classification, and explainable AI (Grad-CAM) output a
health worker can act on immediately.

## How it fits together

```
Healthcare Worker (mobile app)
        │  capture image, quality check
        ▼
Backend API Gateway (Node.js/Express + Socket.io)
        │  proxies analysis requests, persists results, pushes live updates
        ▼
AI Engine (FastAPI + ONNX ensemble: Swin Transformer + EfficientNet-B3/ConvNeXt)
        │  risk_score, lesion_class, xai_output (Grad-CAM)
        ▼
Backend → MongoDB (results) + Socket.io (real-time notification to the app)
        ▼
Clinical decision support, treatment recommendation, EMR/HIS hand-off
```

The mobile app never talks to the AI engine directly — the backend acts as the
API gateway, routing analysis requests, persisting results in MongoDB, and
emitting Socket.io events back to the app in real time.

## Repository layout

| Path | Service | Stack |
|---|---|---|
| [`frontend/`](frontend/) | Healthcare worker mobile app | React Native (Expo) — see [frontend/README.md](frontend/README.md) |
| [`backend/`](backend/) | API gateway, auth, MongoDB persistence, Socket.io | Node.js / Express / Mongoose — see [backend/README.md](backend/README.md) |
| [`ai_engine/`](ai_engine/) | Ensemble inference service (ONNX), training pipeline | Python / FastAPI / PyTorch — see [ai_engine/README.md](ai_engine/README.md) and [ai_engine/TRAINING.md](ai_engine/TRAINING.md) |
| [`nginx/`](nginx/) | Reverse proxy / TLS termination configs (dev + prod) | nginx |
| [`docker-compose.yml`](docker-compose.yml) / [`docker-compose.prod.yml`](docker-compose.prod.yml) | Local and production orchestration | Docker Compose |

## Running it locally

The whole stack (MongoDB, backend, ai_engine, nginx) runs via Docker Compose:

```bash
docker compose up -d --build
```

- Backend: http://localhost:5000 (also proxied through nginx on :80)
- AI engine: http://localhost:8000
- Nginx: http://localhost

Each service also documents running it standalone for development — see the
linked READMEs above. Copy `.env` → fill in the `<required>` values for each
service's own `.env` (see the comments in the root [`.env`](.env) for what
each variable does and where it's consumed).

## Deploying to production

Production deployment (Docker Compose + nginx with HTTPS via Let's Encrypt) is
documented end-to-end in [DEPLOYMENT.md](DEPLOYMENT.md), including the model
training/export workflow, server requirements, SSL certificate bootstrap, and
the production compose overrides in `docker-compose.prod.yml`.

## Understanding AI results

Every scan produces three metrics and a clinical interpretation title.

### Risk Score

The raw positive-class probability output by the ensemble (0–100%).  
It answers the clinical question: **"How likely does this image show acetowhite changes?"**

| Range | Meaning |
|---|---|
| ≥ 65% | Clear acetowhite features — High Risk |
| 30–64% | Equivocal features — Moderate Risk |
| < 30% | No significant acetowhite features — Low Risk |

### Confidence

A measure of AI decisiveness — how far the model's probability is from a 50/50 tie:

```
Confidence = 2 × |Risk Score − 50%|
```

- **0%** — completely undecided (the model sees equal evidence on both sides)
- **100%** — maximally certain (the model is at the far end of its probability range)

Confidence is **independent** of Risk Score. A 70% risk score image can still have low confidence if the model's features are ambiguous. Confidence ≥ 30% → Uncertainty "Low"; Confidence < 30% → Uncertainty "High".

### Uncertainty

The complement of Confidence (100% − Confidence). When Uncertainty is **High**, the finding is near the model's detection boundary and a clinician should review the image regardless of the risk level.

### Clinical Interpretation

The app combines Risk Score and Confidence to select one of six range-based titles:

| Risk Score | Uncertainty | Title shown |
|---|---|---|
| ≥ 65% | Low | High Risk — Refer Urgently |
| ≥ 65% | High | High Risk — Specialist Review Required |
| 50–65% | any | Moderate Risk — Clinical Review Needed |
| 30–50% | any | Borderline Positive — Human Review Essential |
| < 30% (Negative) | Low | Likely Clear — Routine Follow-up |
| < 30% (Negative) | High | Borderline Negative — Follow-up Advised |

### Exporting results

Results are stored locally in a SQLite database on the device. Current export options:

1. **On-screen report** — tap any result card in *All Results* to open the full report modal.
2. **Screenshot / screen record** — use Android's native screenshot for ad-hoc documentation.
3. **Structured export (planned)** — CSV/PDF export to shareable files is on the development roadmap.

When internet connectivity is available, results will sync automatically to the backend (MongoDB) where they can be accessed via the admin interface.

---

## License

See [ai_engine/LICENSE](ai_engine/LICENSE).
