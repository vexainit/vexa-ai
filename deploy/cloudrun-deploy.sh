#!/usr/bin/env bash
# Unified Google Cloud Run + Cloud SQL PostgreSQL + Cloud Storage + Firebase Auth Deployment Script
# Region: asia-south1 (Mumbai)
set -euo pipefail

: "${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
: "${CLOUDSQL_INSTANCE:?Set CLOUDSQL_INSTANCE (e.g. project:asia-south1:vexa-pg)}"
: "${DATABASE_URL:?Set DATABASE_URL (PostgreSQL Cloud SQL socket URL)}"
: "${GCS_BUCKET_RAW:?Set GCS_BUCKET_RAW}"
: "${GCS_BUCKET_MASKED:?Set GCS_BUCKET_MASKED}"
: "${FIREBASE_PROJECT_ID:?Set FIREBASE_PROJECT_ID}"
: "${JWT_SECRET:?Set JWT_SECRET}"

gcloud run deploy vexa-bridge \
  --project "${GCP_PROJECT_ID}" \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --add-cloudsql-instances "${CLOUDSQL_INSTANCE}" \
  --set-env-vars "DATABASE_URL=${DATABASE_URL},GCS_BUCKET_RAW=${GCS_BUCKET_RAW},GCS_BUCKET_MASKED=${GCS_BUCKET_MASKED},FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID},JWT_SECRET=${JWT_SECRET}" \
  --set-secrets "GEMINI_API_KEY=vexa-gemini-key:latest"
