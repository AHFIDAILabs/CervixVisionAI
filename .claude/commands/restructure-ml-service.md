Read the full project structure before doing anything.
Do not modify any files until you have shown me the complete plan and I approve.

## PHASE 1 — DELETIONS
Remove the following from ml_service:
- ml_service/app/ directory containing:
  static/css/style.css
  static/images/
  static/js/script.js
  templates/faq.html
  templates/index.html
  templates/prediction.html
  app/main.py (Jinja2 web UI — no longer needed)
- render.yaml (Render deployment config — no longer needed)

After deletion, report what was removed and confirm nothing else was touched.

## PHASE 2 — MODEL REVISION
The current model is EfficientNet-B3.
Replace it with an Ensemble Learning Framework using:
- Swin Transformer (primary)
- EfficientNet-B3 or ConvNeXt (secondary)

Requirements:
- Each model exports to ONNX format for Edge AI / Android deployment
- Ensemble combines predictions via weighted average or learned fusion
- Retain the existing training and evaluation pipeline structure
- Add an ensemble config file (ensemble_config.yaml or similar) for weights and model paths
- Rename model files and references to reflect the new architecture clearly
- If retraining scripts exist, update them for the ensemble setup

## PHASE 3 — RENAME FILES AND DIRECTORIES
Based on the new structure, rename files and subdirectories in ml_service to be:
- Descriptive and consistent (snake_case for Python)
- Reflective of their actual role (e.g. pipeline/, inference/, models/)
Propose the rename map before executing it.

## PHASE 4 — CONNECT THE THREE SUBSYSTEMS
Connect frontend/, backend/, and ml_service/ into a single unified application
following this architecture (in order):
1. Healthcare Worker Android App (frontend) →
2. Image Capture + Quality Assessment →
3. AI Inference Engine (ml_service FastAPI via ONNX) →
4. Risk Score + Lesion Classification + Explainable AI outputs →
5. Clinical Decision Support + Treatment Recommendation →
6. Health Information Systems / EMR →
7. Monitoring and MLOps Layer (audit logs, drift detection)

Integration requirements:
- frontend calls ml_service through the existing backend (backend acts as API gateway)
- backend routes analysis requests to ml_service/api_main.py
- ml_service returns structured results: risk_score, lesion_class, xai_output
- backend stores results in MongoDB and emits socket event to frontend
- Add or update API contracts (request/response types) across all three services
- Update environment config files (.env.example) for all three services

## PHASE 5 — FIX ALL IDENTIFIED ISSUES
Fix every issue identified in the prior analysis, prioritized by severity:

CRITICAL / HIGH (fix first):
- jwt.js lines 25, 38, 51: Remove all raw token and user object logging
- cron.js lines 3, 4: Fix undefined import and wrong express instance
- notificationService.js line 2: Fix wrong model path (notification → notifications)
- refreshToken.js line 17: Fix findOne to support multi-session token refresh
- refreshToken.js line 118: Fix revokeToken — bcrypt re-hash breaks revocation
- index.js lines 76, 83: Add authentication checks to socket events
- Models/refreshToken.js line 14: Fix TTL index to use expireAfterSeconds: 0
- authService.ts lines 21, 27: Remove credential and token debug logs
- authService.ts line 48: Align refresh endpoint URL across authService and axiosHelper
- axiosHelper.ts line 68: Update AuthContext state on refresh failure
- RegisterScreen.tsx line 97: Add password === confirmPassword validation
- main.py line 67: Sanitize file.filename — use uuid + extension only
- api_main.py line 174: Add None check before file.content_type.startswith()
- api_main.py line 181: Guard file.filename None before Path().suffix
- api_main.py line 32: Replace allow_origins=["*"] with specific origins

MEDIUM:
- api_main.py line 193: Replace asyncio.get_event_loop() with get_running_loop()
- api_main.py line 279: Replace sequential batch loop with asyncio.gather()
- authController.js line 58: Align frontend/backend contract on required patient fields
- authController.js line 153: Remove raw token logging

LOW:
- results.tsx lines 64, 75: Replace .replace("_", " ") with /_/g regex
- cloudinary.js line 7: Detect actual MIME type instead of hardcoding JPEG
- ci-cd.yml line 36: Remove --exit-zero from flake8 so lint failures fail the build
- database.js line 11: Remove deprecated Mongoose options
- userService.ts line 29: Replace any[] with proper TypeScript type
- UserDash.tsx lines 28, 68, 69: Replace hardcoded date/count with API calls; add handler
- UserSetting.tsx lines 65, 103: Implement or explicitly disable Change Password and Delete Account

## CONSTRAINTS
- Follow all existing naming conventions and architecture patterns in the codebase
- Do not introduce new libraries without flagging and getting approval first
- Show me the full plan after Phase 1 analysis before making any changes
- Commit after each phase with a descriptive commit message
