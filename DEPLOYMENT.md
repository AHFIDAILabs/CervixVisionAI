# CervixVisionAI — Deployment Guide

---

## Edge AI strategy for low-connectivity environments

CervixVisionAI is designed for use in settings with intermittent or no
internet connectivity (rural clinics, field screenings). The inference
architecture is **offline-first**:

```
Primary path  (online):  App → backend → ai_engine → MongoDB → socket → App
Fallback path (offline): App → on-device ONNX Runtime → local result
```

Both paths produce the same structured result (prediction, risk score,
lesion class, recommendation). When connectivity is restored, offline
results can be synced to the backend.

### What this means for your deployment target

You do **not** need GPU cloud providers (AWS, GCP, Azure GPU instances)
for this project. The AI inference runs on the Android device. The cloud
backend is a thin auth + sync layer only.

**Recommended server**: a low-cost always-on VPS:

| Provider | Price | Recommended spec |
|---|---|---|
| Hetzner Cloud | €4–6/month | CX22: 2 vCPU, 4 GB RAM |
| DigitalOcean | $6/month | Basic Droplet: 1 vCPU, 1 GB RAM |
| Linode/Akamai | $5/month | Shared CPU: 1 GB RAM |

All three run the Docker Compose stack without issue. Choose based on the
geographic region closest to your users to minimise latency.

**Do not use** free-tier serverless providers (Render free, Railway free)
for healthcare — they suspend services after inactivity, which is
unacceptable for a screening tool.

### Activating offline inference

1. Train models and export to ONNX (see `ai_engine/TRAINING.md`)
2. Copy ONNX files to the frontend:
   ```bash
   cp ai_engine/artifacts/onnx/swin_model.onnx        frontend/assets/models/
   cp ai_engine/artifacts/onnx/efficientnet_model.onnx frontend/assets/models/
   ```
3. Use `useOfflineInference` hook in `UserScan.tsx` instead of the direct
   `uploadScan` call — it automatically selects online or on-device
   inference based on connectivity.

---

## Architecture overview

```
Android App (frontend APK)
        │ HTTPS
        ▼
    nginx :443  ─────────────────────────────────────────
        │                                               │
        ▼                                               │
    backend :5000  (Node.js + Socket.io)          (internal only)
        │                                               │
        ├── MongoDB :27017                         ai_engine :8000
        └── ai_engine :8000  (FastAPI ensemble ML)
```

- **frontend** — React Native (Expo). Distributed as an Android APK built via EAS.
- **backend** — Node.js / Express / Socket.io. Talks to MongoDB and ai_engine.
- **ai_engine** — Python / FastAPI. Runs the Swin + EfficientNet-B3 ensemble inference.
- **nginx** — Reverse proxy. Handles HTTPS termination and rate limiting.

---

## Prerequisites

| Tool | Minimum version | Purpose |
|---|---|---|
| Docker | 24+ | Run all server services |
| Docker Compose | v2.20+ | Orchestrate multi-service stack |
| Node.js | 20 LTS | Backend local dev |
| Python | 3.11 | ai_engine local dev |
| EAS CLI | 3.19+ | Build Android APK |
| Expo account | — | EAS build cloud |

---

## 1. Environment setup

Each service reads its own `.env` file. Copy the examples and fill in the secrets.

```bash
cp backend/.env  backend/.env.local    # edit with real secrets
cp ai_engine/.env ai_engine/.env.local
cp frontend/.env frontend/.env.local
```

Key variables — never commit real values:

### `backend/.env`
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cervixvisionai
JWT_SECRET=<64-byte random hex — see below>
REFRESH_TOKEN_SECRET=<different 64-byte random hex>
CLOUDINARY_CLOUD_NAME=<from cloudinary.com/console>
CLOUDINARY_API_KEY=<from cloudinary.com/console>
CLOUDINARY_API_SECRET=<from cloudinary.com/console>
ML_SERVICE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:8081
```

Generate secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### `ai_engine/.env`
```
BACKEND_ALLOWED_ORIGIN=http://localhost:5000
PORT=8000
```

### `frontend/.env`
```
EXPO_PUBLIC_SERVER_URL=http://localhost:5000
```

---

## 2. Local development

Runs MongoDB + backend + ai_engine + nginx via Docker. Frontend runs locally with Expo.

```bash
# 1. Start server-side services
docker compose up --build

# 2. In a separate terminal, start the frontend
cd frontend
npm install
npx expo start
```

| Service | URL |
|---|---|
| nginx (HTTP gateway) | http://localhost:80 |
| backend (direct, dev only) | http://localhost:5000 |
| ai_engine (direct, dev only) | http://localhost:8000 |
| ai_engine API docs | http://localhost:8000/api/docs |
| MongoDB | localhost:27017 |

When testing on a **physical Android device**, replace `localhost` with your machine's
local IP address in `frontend/.env`:
```
EXPO_PUBLIC_SERVER_URL=http://192.168.x.x:5000
```

---

## 3. Train the AI models (first time only)

The ai_engine requires trained model weights before it can serve inference requests.
`ai_engine/artifacts/training/` must contain both:
- `swin_model.pth` — Swin Transformer Base
- `efficientnet_model.pth` — EfficientNet-B3

### Option A — Train from scratch (requires GPU, ~4–8 hours)

```bash
cd ai_engine
pip install -e .
python train.py
```

The pipeline runs 5 stages automatically:
1. Data ingestion (downloads from HuggingFace `AHFIDAILabs/via-cervix`)
2. Build base models
3. Train ensemble (SSL + high-sensitivity fine-tuning)
4. Evaluate
5. Export to ONNX for Android edge inference

### Option B — Copy pre-trained weights

```bash
cp /path/to/swin_model.pth      ai_engine/artifacts/training/
cp /path/to/efficientnet_model.pth ai_engine/artifacts/training/
```

After weights are in place, ONNX export can be run independently:
```bash
cd ai_engine
python -c "
from cervix_visionai.pipeline.stage_05_onnx_export import OnnxExportPipeline
OnnxExportPipeline().main()
"
```

ONNX files are written to `ai_engine/artifacts/onnx/`.

---

## 4. Production deployment

### 4.1 Server requirements

- Ubuntu 22.04 LTS (recommended) or Debian 12
- Minimum 4 vCPU, 8 GB RAM, 40 GB disk
- Ports 80 and 443 open inbound
- A registered domain name pointing to the server IP

### 4.2 Set production environment variables

Create a `.env` file at the **project root** (used by `docker-compose.prod.yml`):

```bash
cp .env .env.prod   # reference file
```

```
# Root-level — used by docker-compose.prod.yml
MONGO_USER=cervixadmin
MONGO_PASSWORD=<strong random password>
DOMAIN=api.yourdomain.com
```

Also update `backend/.env` with production values:
```
NODE_ENV=production
MONGODB_URI=mongodb://cervixadmin:<password>@mongodb:27017/cervixvisionai?authSource=admin
ML_SERVICE_URL=http://ai_engine:8000
FRONTEND_URL=https://app.yourdomain.com
```

### 4.3 Issue SSL certificate (once per domain)

`default.conf.template` defines both the HTTP→HTTPS redirect server *and* the
`listen 443 ssl` server block in the same file, and that HTTPS block points at
`/etc/nginx/ssl/live/${DOMAIN}/{fullchain,privkey}.pem`. nginx checks that
these cert files exist when it loads its config — so on a brand-new server
(no certs yet) nginx won't start at all, not even to serve the HTTP-01
challenge certbot needs. Generate a temporary self-signed placeholder first so
nginx can boot; certbot will overwrite it with the real certificate at the
exact same path, and nginx never needs a config change in between.

```bash
# Step 0: Create a temporary self-signed placeholder cert so nginx can start
# (replace api.yourdomain.com with your real DOMAIN value)
mkdir -p nginx/ssl/live/api.yourdomain.com
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -keyout nginx/ssl/live/api.yourdomain.com/privkey.pem \
  -out nginx/ssl/live/api.yourdomain.com/fullchain.pem \
  -subj "/CN=api.yourdomain.com"

# Step 1: Start nginx — it can now load both server blocks and will serve
# the ACME HTTP-01 challenge so certbot can verify domain ownership
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d nginx

# Step 2: Issue the real certificate (overwrites the placeholder above)
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  --profile certbot run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  -d api.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos --no-eff-email

# Step 3: Reload nginx to pick up the real certificate
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart nginx
```

Certificates are stored in `nginx/ssl/live/api.yourdomain.com/`.

### 4.4 Start the full production stack

```bash
# Copy trained model weights first (Step 3 above)

docker compose \
  -f docker-compose.yml \
  -f docker-compose.prod.yml \
  up -d --build
```

Verify all services are healthy:
```bash
docker compose ps
curl https://api.yourdomain.com/health
```

Expected response:
```json
{ "status": "ok", "service": "cervixvisionai-backend" }
```

### 4.5 Set up automatic certificate renewal

Add a weekly cron job on the host to renew certificates:

```bash
# Edit crontab
crontab -e

# Add this line (runs every Sunday at 3am)
0 3 * * 0 cd /path/to/CervixVisionAI && \
  docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  --profile certbot run --rm certbot renew --quiet && \
  docker compose -f docker-compose.yml -f docker-compose.prod.yml restart nginx
```

---

## 5. Build the Android APK

### 5.1 Set the production backend URL

Edit `frontend/eas.json` and replace the placeholder in both `preview` and `production`
profiles:

```json
"env": {
  "EXPO_PUBLIC_SERVER_URL": "https://api.yourdomain.com"
}
```

### 5.2 Install EAS CLI and authenticate

```bash
npm install -g eas-cli
eas login
```

### 5.3 Build the APK

```bash
cd frontend

# Preview build — APK for internal testing (sideloadable)
eas build --platform android --profile preview

# Production build — APK for Play Store submission
eas build --platform android --profile production
```

EAS builds in the cloud (~5–15 minutes). When complete you receive a download link.

### 5.4 Install on device

1. Download the `.apk`
2. On the Android device: **Settings → Security → Install unknown apps → allow**
3. Open the downloaded file and tap Install

### 5.5 For Play Store submission

Change `buildType` in `eas.json` production profile from `"apk"` to `"app-bundle"`,
then run `eas submit --platform android`.

---

## 6. Monitoring

### View logs

```bash
# All services
docker compose logs -f

# Individual service
docker compose logs -f backend
docker compose logs -f ai_engine
docker compose logs -f nginx
```

### Log files inside containers

| Service | File |
|---|---|
| backend | `combined.log`, `error.log` (Winston) |
| ai_engine | `logs/` directory (timestamped files) |
| nginx | `/var/log/nginx/access.log`, `error.log` |

### Health endpoints

| Endpoint | Expected |
|---|---|
| `GET /health` | `{ "status": "ok" }` |
| `GET /api/docs` (ai_engine, dev only) | FastAPI Swagger UI |

---

## 7. Updating a running production deployment

```bash
# Pull latest code
git pull origin main

# Rebuild and restart only changed services
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d --build backend ai_engine

# No-downtime rolling restart for nginx
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart nginx
```

---

## 8. Rollback

```bash
# Roll back to the previous image (built before the latest --build)
docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  stop backend && \
  docker compose -f docker-compose.yml -f docker-compose.prod.yml \
  up -d backend --no-build
```

For a code rollback, revert the git commit and rebuild:
```bash
git revert HEAD
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ECONNREFUSED` to MongoDB | backend started before MongoDB was healthy | `docker compose restart backend` |
| ai_engine returns 503 | No model weights in `artifacts/training/` | Copy `.pth` files — see Step 3 |
| `Bearer undefined` in logs | Registration used without `await` on `generateTokens` | Ensure backend is on latest commit |
| nginx 502 Bad Gateway | backend or ai_engine container not running | `docker compose ps` then restart unhealthy service |
| SSL certificate error | Cert not issued or expired | Re-run certbot (Step 4.3) |
| APK can't connect to backend | `EXPO_PUBLIC_SERVER_URL` still `localhost` | Update `eas.json` and rebuild APK |
| Socket.io not connecting | `FRONTEND_URL` env var mismatch | Set `FRONTEND_URL` in `backend/.env` to the exact app origin |
