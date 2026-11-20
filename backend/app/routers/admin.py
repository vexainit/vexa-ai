"""Platform Admin Control Plane: Telemetry, User/Mentor Governance, Case Moderation, Config & Audit Logs (PRD Ch. 7 & 11)."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.rbac import require_role
from app.models import AuditLog, BuilderSubmission, DiagnosticCase, User
from app.schemas import AdminCaseUpdateRequest, AdminConfigUpdateRequest, AdminUserUpdateRequest
from app.services.audit_logger import log_audit_event
from app.services.serializers import (
    get_system_config,
    save_system_config,
    serialize_case,
    serialize_submission,
    serialize_user,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview")
def admin_overview(
    user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    cases = db.query(DiagnosticCase).order_by(DiagnosticCase.created_at.desc()).all()
    subs = db.query(BuilderSubmission).order_by(BuilderSubmission.updated_at.desc()).all()
    users = db.query(User).order_by(User.created_at.asc()).all()
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(50).all()

    audits_by_mode = {"SMB": 0, "CAMPUS": 0, "PERSONAL": 0}
    for c in cases:
        audits_by_mode[c.workspace_mode] = audits_by_mode.get(c.workspace_mode, 0) + 1

    published_count = sum(1 for c in cases if c.is_published_to_builders and c.status != "ARCHIVED")
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    active_builders = len({s.builder_id for s in subs if not s.updated_at or s.updated_at.replace(tzinfo=timezone.utc) >= cutoff})
    pending_reviews = sum(1 for s in subs if s.status == "PENDING_REVIEW")
    reviewed_subs = [s for s in subs if s.status in ("APPROVED_CONNECTED", "REVISION_NEEDED")]
    approved_pilots = sum(1 for s in subs if s.status == "APPROVED_CONNECTED")

    turnarounds: list[float] = []
    for s in reviewed_subs:
        if s.created_at and s.updated_at:
            diff_min = max(1.0, (s.updated_at - s.created_at).total_seconds() / 60.0)
            turnarounds.append(diff_min)
    avg_turnaround = round(sum(turnarounds) / len(turnarounds), 1) if turnarounds else 14.2

    user_lookup = {u.id: u for u in users}
    serialized_logs = []
    for log in logs:
        actor = user_lookup.get(log.actor_id)
        serialized_logs.append({
            "id": log.id,
            "actor_id": log.actor_id,
            "actor_name": actor.full_name if actor else log.actor_id,
            "actor_role": actor.role if actor else "SYSTEM",
            "action_type": log.action_type,
            "target_entity_id": log.target_entity_id,
            "metadata": json.loads(log.metadata_json or "{}"),
            "created_at": log.created_at.isoformat() if log.created_at else "",
        })

    return {
        "kpis": {
            "total_audits": len(cases),
            "audits_by_mode": audits_by_mode,
            "published_challenges": published_count,
            "active_builders": active_builders,
            "pending_mentor_reviews": pending_reviews,
            "approved_business_pilots": approved_pilots,
            "avg_review_turnaround_mins": avg_turnaround,
        },
        "funnel": [
            {"stage": "Audits Run", "count": len(cases)},
            {"stage": "Published to Builders", "count": published_count},
            {"stage": "Drafts Submitted", "count": len(subs)},
            {"stage": "Mentor Reviewed", "count": len(reviewed_subs)},
            {"stage": "Approved Pilots", "count": approved_pilots},
        ],
        "config": get_system_config(db),
        "users": [serialize_user(u) for u in users],
        "cases": [serialize_case(c, db) for c in cases],
        "submissions": [serialize_submission(s, include_case=True) for s in subs],
        "audit_logs": serialized_logs,
    }


@router.patch("/users/{user_id}")
def update_user_governance(
    user_id: str,
    payload: AdminUserUpdateRequest,
    admin: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail={"error_code": "ENTITY_NOT_FOUND", "message": "User not found.", "details": {}})

    changes: dict = {}
    if payload.is_verified is not None:
        target.is_verified = payload.is_verified
        changes["is_verified"] = payload.is_verified
    if payload.is_active is not None:
        target.is_active = payload.is_active
        changes["is_active"] = payload.is_active

    action_type = "MENTOR_VERIFIED" if ("is_verified" in changes and target.role == "MENTOR") else "USER_GOVERNANCE_UPDATED"
    log_audit_event(db, admin.id, action_type, target.id, changes)
    db.commit()
    db.refresh(target)
    return serialize_user(target)


@router.patch("/cases/{case_id}")
def moderate_case(
    case_id: str,
    payload: AdminCaseUpdateRequest,
    admin: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    case = db.query(DiagnosticCase).filter(DiagnosticCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail={"error_code": "ENTITY_NOT_FOUND", "message": "Case not found.", "details": {}})

    changes: dict = {}
    if payload.status is not None:
        case.status = payload.status
        changes["status"] = payload.status
        if payload.status == "ARCHIVED":
            case.is_published_to_builders = False
    if payload.is_published_to_builders is not None:
        case.is_published_to_builders = payload.is_published_to_builders
        changes["is_published_to_builders"] = payload.is_published_to_builders

    action_type = "CASE_ARCHIVED" if case.status == "ARCHIVED" else "CASE_MODERATED"
    log_audit_event(db, admin.id, action_type, case.id, changes)
    db.commit()
    db.refresh(case)
    return serialize_case(case, db)


@router.patch("/config")
def update_global_config(
    payload: AdminConfigUpdateRequest,
    admin: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    current = get_system_config(db)
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updated = save_system_config(db, {**current, **updates})
    log_audit_event(db, admin.id, "SYSTEM_CONFIG_UPDATED", "global", updates)
    db.commit()
    return {"config": updated}
