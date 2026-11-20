"""Health & Live Database Metrics Route (Zero Mock Data)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import BuilderSubmission, DiagnosticCase, User
from app.services.serializers import get_system_config

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False

    cfg = get_system_config(db)
    gemini_configured = bool(settings.gemini_api_key and settings.gemini_api_key != "your_gemini_api_key_here")
    firebase_configured = bool(settings.firebase_project_id)

    total_businesses = db.query(User).filter(User.role == "BUSINESS").count()
    total_students = db.query(User).filter(User.role == "STUDENT").count()
    total_mentors = db.query(User).filter(User.role == "MENTOR").count()
    total_audits = db.query(DiagnosticCase).count()
    published_challenges = (
        db.query(DiagnosticCase)
        .filter(DiagnosticCase.is_published_to_builders.is_(True), DiagnosticCase.status != "ARCHIVED")
        .count()
    )
    approved_pilots = db.query(BuilderSubmission).filter(BuilderSubmission.status == "APPROVED_CONNECTED").count()

    return {
        "status": "ok" if db_ok else "degraded",
        "database": "postgresql" if not settings.database_url.startswith("sqlite") else "sqlite",
        "gemini_model": "gemini-2.5-flash",
        "gemini_configured": gemini_configured,
        "firebase_configured": firebase_configured,
        "storage_mode": "gcs" if settings.gcs_bucket_raw else "local_isolated",
        "active_workspace_modes": cfg.get("enabled_modes", ["SMB", "CAMPUS", "PERSONAL"]),
        "live_counts": {
            "businesses": total_businesses,
            "students": total_students,
            "mentors": total_mentors,
            "audits": total_audits,
            "published_challenges": published_challenges,
            "approved_pilots": approved_pilots,
        },
    }
