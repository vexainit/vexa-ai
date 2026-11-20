"""Health, Demo Users, and Onboarding Routes (PRD Ch. 11.3 & Page 2)."""
from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import OnboardingRequest
from app.services.audit_logger import log_audit_event
from app.services.serializers import get_system_config, serialize_user

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
    return {
        "status": "ok" if db_ok else "degraded",
        "database": "connected" if db_ok else "error",
        "gemini_model": "gemini-2.5-flash",
        "gemini_configured": gemini_configured,
        "storage_mode": "gcs" if settings.gcs_bucket_raw else "local_isolated",
        "active_workspace_modes": cfg.get("enabled_modes", ["SMB", "CAMPUS", "PERSONAL"]),
    }


@router.get("/users/demo")
def list_demo_users(db: Session = Depends(get_db)):
    users = db.query(User).order_by(User.created_at.asc()).all()
    return {"users": [serialize_user(u) for u in users]}


@router.post("/onboarding", status_code=201)
def onboard_user(payload: OnboardingRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.strip().lower()).first()
    if existing:
        return serialize_user(existing)
    is_verified = payload.role != "MENTOR"
    user = User(
        id=f"usr_{uuid.uuid4().hex[:10]}",
        full_name=payload.full_name.strip(),
        email=payload.email.strip().lower(),
        role=payload.role,
        domain_tags=json.dumps(payload.domain_tags),
        is_verified=is_verified,
        is_active=True,
    )
    db.add(user)
    db.flush()
    log_audit_event(db, user.id, "USER_ONBOARDED", user.id, {"role": user.role, "is_verified": is_verified})
    db.commit()
    db.refresh(user)
    return serialize_user(user)
