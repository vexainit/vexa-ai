# Vexa Bridge (v2.0) — Startup Buildathon India 2026

Multi-Mode AI Business Diagnostic, PII-Safe Challenge Scoping & Proof-of-Work Execution Platform built on a **100% Google AI & Cloud stack** (`google-genai` + `gemini-2.5-flash` + Google Cloud Run + Google Cloud Storage + Cloud SQL / SQLite).

## Architecture Highlights
- **Hybrid Deterministic + Generative Intelligence:** Vectorized Pandas/NumPy profiling computes exact row counts, delay %, COD RTO %, INR leakage, and Personal S.P.E.N.D. velocity in `<1.5s` before calling `gemini-2.5-flash` with strict Pydantic v2 `response_schema` JSON outputs (and automatic deterministic fallback on timeout).
- **Zero Raw PII Leakage:** Two-pass Indian PII scrubber (`backend/app/services/pii_scrubber.py`) redacts +91/10-digit phones, emails, UPI handles, PAN/GSTIN/Aadhaar, and addresses, hashes customer names via per-case salted SHA-256 (`CUST_<6HEX>`), neutralizes Excel formula injection (`=`, `+`, `-`, `@`), and passes `backend/scripts/verify_pii.py` with 0 leaks.
- **Editorial Operations Workbench UI (14 Screens):** Warm Alabaster (`#F8F7F4`), Crisp White (`#FFFFFF`), 1px Warm Stone borders (`#E5E2DC`), Deep Forest Teal (`#0F4C5C`), Burnt Terracotta (`#C85A32`) leak alerts, `JetBrains Mono` `tabular-nums`, persistent 3px Role Identity Strips, and the 640px **PII Shield Diff Drawer**.
- **Pre-Seeded 90-Second Judge Demo State:** 4 demo role accounts (`biz_kaya`, `stu_aarav`, `men_priya`, `adm_vexa`) + 1 unverified mentor (`men_pending`), 3 realistic Indian demo CSV presets (`sample_data/`), 1 published Surat Wholesale case, and 1 `PENDING_REVIEW` student draft with Gemini AI Pre-Audit (Fit Score 86).

## Local Development

### 1. Backend (FastAPI)
```powershell
cd backend
.\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
```

### 2. Frontend (React 19 + Vite + Tailwind)
```powershell
cd frontend
npm run dev
```
Open `http://localhost:5173` (API requests proxy automatically to `http://127.0.0.1:8000/api/v1`).

## Automated QA & Zero-Leak PII Verification
```powershell
cd backend
.\.venv\Scripts\pytest.exe -v
.\.venv\Scripts\python.exe -m app.services.seed_demo
.\.venv\Scripts\python.exe scripts\verify_pii.py storage\masked\case_surat_wh_01_masked.csv
```

## Google Cloud Run Deployment (`asia-south1`)
```bash
gcloud run deploy vexa-bridge \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --set-env-vars="GCS_BUCKET_RAW=vexa-raw-private,GCS_BUCKET_MASKED=vexa-masked-safe" \
  --set-secrets="GEMINI_API_KEY=vexa-gemini-key:latest"
```
