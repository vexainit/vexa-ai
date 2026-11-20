"""Platform Admin Control Plane: Full Governance over Business, Student, Mentor Ecosystems & Live Database Tables."""
from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
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
from app.services.storage import storage_service

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/overview")
def admin_overview(
    user: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    cases = db.query(DiagnosticCase).order_by(DiagnosticCase.created_at.desc()).all()
    subs = db.query(BuilderSubmission).order_by(BuilderSubmission.updated_at.desc()).all()
    users = db.query(User).order_by(User.created_at.desc()).all()
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()

    audits_by_mode = {"SMB": 0, "CAMPUS": 0, "PERSONAL": 0}
    for c in cases:
        audits_by_mode[c.workspace_mode] = audits_by_mode.get(c.workspace_mode, 0) + 1

    published_count = sum(1 for c in cases if c.is_published_to_builders and c.status != "ARCHIVED")
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    active_builders = len({
        s.builder_id
        for s in subs
        if not s.updated_at or s.updated_at.replace(tzinfo=timezone.utc) >= cutoff
    })
    pending_reviews = sum(1 for s in subs if s.status == "PENDING_REVIEW")
    reviewed_subs = [s for s in subs if s.status in ("APPROVED_CONNECTED", "REVISION_NEEDED")]
    approved_pilots = sum(1 for s in subs if s.status == "APPROVED_CONNECTED")

    turnarounds: list[float] = []
    for s in reviewed_subs:
        if s.created_at and s.updated_at:
            diff_min = max(1.0, (s.updated_at - s.created_at).total_seconds() / 60.0)
            turnarounds.append(diff_min)
    avg_turnaround = round(sum(turnarounds) / len(turnarounds), 1) if turnarounds else 0.0

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

    # Per-user activity stats for Admin Business / Student / Mentor tables
    case_counts_by_owner: dict[str, int] = {}
    for c in cases:
        case_counts_by_owner[c.owner_id] = case_counts_by_owner.get(c.owner_id, 0) + 1

    sub_counts_by_builder: dict[str, dict[str, int]] = {}
    reviews_by_mentor: dict[str, int] = {}
    for s in subs:
        b = sub_counts_by_builder.setdefault(s.builder_id, {"total": 0, "approved": 0})
        b["total"] += 1
        if s.status == "APPROVED_CONNECTED":
            b["approved"] += 1
        if s.reviewed_by_mentor_id:
            reviews_by_mentor[s.reviewed_by_mentor_id] = reviews_by_mentor.get(s.reviewed_by_mentor_id, 0) + 1

    enriched_users = []
    for u in users:
        su = serialize_user(u)
        su["stats"] = {
            "audits_count": case_counts_by_owner.get(u.id, 0),
            "submissions_count": sub_counts_by_builder.get(u.id, {}).get("total", 0),
            "verified_builds_count": sub_counts_by_builder.get(u.id, {}).get("approved", 0),
            "reviews_completed": reviews_by_mentor.get(u.id, 0),
        }
        enriched_users.append(su)

    return {
        "kpis": {
            "total_audits": len(cases),
            "audits_by_mode": audits_by_mode,
            "published_challenges": published_count,
            "active_builders": active_builders,
            "pending_mentor_reviews": pending_reviews,
            "approved_business_pilots": approved_pilots,
            "avg_review_turnaround_mins": avg_turnaround,
            "total_businesses": sum(1 for u in users if u.role == "BUSINESS"),
            "total_students": sum(1 for u in users if u.role == "STUDENT"),
            "total_mentors": sum(1 for u in users if u.role == "MENTOR"),
            "pending_mentor_verifications": sum(1 for u in users if u.role == "MENTOR" and not u.is_verified),
        },
        "funnel": [
            {"stage": "Audits Run", "count": len(cases)},
            {"stage": "Published to Builders", "count": published_count},
            {"stage": "Drafts Submitted", "count": len(subs)},
            {"stage": "Mentor Reviewed", "count": len(reviewed_subs)},
            {"stage": "Approved Pilots", "count": approved_pilots},
        ],
        "config": get_system_config(db),
        "users": enriched_users,
        "cases": [serialize_case(c, db) for c in cases],
        "submissions": [serialize_submission(s, include_case=True) for s in subs],
        "audit_logs": serialized_logs,
    }


@router.get("/database/{table_name}")
def inspect_database_table(
    table_name: str,
    limit: int = Query(100, ge=1, le=500),
    admin: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    """Live database explorer for Platform Admin across all 4 core relational tables."""
    if table_name == "users":
        rows = db.query(User).order_by(User.created_at.desc()).limit(limit).all()
        return {
            "table": "users",
            "total_rows": db.query(User).count(),
            "columns": ["id", "full_name", "email", "role", "is_verified", "is_active", "created_at"],
            "rows": [
                {
                    "id": r.id,
                    "full_name": r.full_name,
                    "email": r.email,
                    "role": r.role,
                    "is_verified": r.is_verified,
                    "is_active": r.is_active,
                    "created_at": r.created_at.isoformat() if r.created_at else "",
                }
                for r in rows
            ],
        }
    if table_name == "diagnostic_cases":
        rows = db.query(DiagnosticCase).order_by(DiagnosticCase.created_at.desc()).limit(limit).all()
        return {
            "table": "diagnostic_cases",
            "total_rows": db.query(DiagnosticCase).count(),
            "columns": ["id", "owner_id", "workspace_mode", "title", "domain_category", "is_published_to_builders", "status", "created_at"],
            "rows": [
                {
                    "id": r.id,
                    "owner_id": r.owner_id,
                    "workspace_mode": r.workspace_mode,
                    "title": r.title,
                    "domain_category": r.domain_category,
                    "is_published_to_builders": r.is_published_to_builders,
                    "status": r.status,
                    "created_at": r.created_at.isoformat() if r.created_at else "",
                }
                for r in rows
            ],
        }
    if table_name == "builder_submissions":
        rows = db.query(BuilderSubmission).order_by(BuilderSubmission.updated_at.desc()).limit(limit).all()
        return {
            "table": "builder_submissions",
            "total_rows": db.query(BuilderSubmission).count(),
            "columns": ["id", "case_id", "builder_id", "version", "solution_title", "solution_type", "status", "reviewed_by_mentor_id", "updated_at"],
            "rows": [
                {
                    "id": r.id,
                    "case_id": r.case_id,
                    "builder_id": r.builder_id,
                    "version": r.version,
                    "solution_title": r.solution_title,
                    "solution_type": r.solution_type,
                    "status": r.status,
                    "reviewed_by_mentor_id": r.reviewed_by_mentor_id or "—",
                    "updated_at": r.updated_at.isoformat() if r.updated_at else "",
                }
                for r in rows
            ],
        }
    if table_name == "system_audit_logs":
        rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
        return {
            "table": "system_audit_logs",
            "total_rows": db.query(AuditLog).count(),
            "columns": ["id", "actor_id", "action_type", "target_entity_id", "metadata_json", "created_at"],
            "rows": [
                {
                    "id": r.id,
                    "actor_id": r.actor_id,
                    "action_type": r.action_type,
                    "target_entity_id": r.target_entity_id,
                    "metadata_json": r.metadata_json,
                    "created_at": r.created_at.isoformat() if r.created_at else "",
                }
                for r in rows
            ],
        }
    raise HTTPException(
        status_code=400,
        detail={"error_code": "INVALID_TABLE", "message": f"Unknown table: {table_name}", "details": {}},
    )


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


@router.delete("/users/{user_id}")
def delete_user_record(
    user_id: str,
    admin: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail={"error_code": "ENTITY_NOT_FOUND", "message": "User not found.", "details": {}})
    if target.role == "ADMIN":
        raise HTTPException(status_code=400, detail={"error_code": "CANNOT_DELETE_ADMIN", "message": "Admin accounts cannot be deleted.", "details": {}})
    db.query(BuilderSubmission).filter(BuilderSubmission.builder_id == target.id).delete()
    db.query(DiagnosticCase).filter(DiagnosticCase.owner_id == target.id).delete()
    db.query(AuditLog).filter(AuditLog.actor_id == target.id).delete()
    db.delete(target)
    log_audit_event(db, admin.id, "USER_DELETED", user_id, {"email": target.email, "role": target.role})
    db.commit()
    return {"deleted": True, "user_id": user_id}


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


@router.delete("/cases/{case_id}")
def delete_case_record(
    case_id: str,
    admin: User = Depends(require_role(["ADMIN"])),
    db: Session = Depends(get_db),
):
    case = db.query(DiagnosticCase).filter(DiagnosticCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail={"error_code": "ENTITY_NOT_FOUND", "message": "Case not found.", "details": {}})
    storage_service.delete_if_exists(case.raw_csv_path)
    storage_service.delete_if_exists(case.masked_csv_path)
    db.delete(case)
    log_audit_event(db, admin.id, "CASE_DELETED", case_id, {"title": case.title})
    db.commit()
    return {"deleted": True, "case_id": case_id}


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
