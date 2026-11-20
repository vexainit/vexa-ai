"""Mentor Prioritized Review Queue & Atomic 3-Point Verification Scorecard Routes (PRD Ch. 6 & 11.3)."""
from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.rbac import require_role
from app.models import BuilderSubmission, User
from app.schemas import MentorReviewRequest
from app.services.audit_logger import log_audit_event
from app.services.serializers import serialize_submission

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("")
def list_review_queue(
    status: str = Query("PENDING_REVIEW"),
    sort: str = Query("oldest"),
    user: User = Depends(require_role(["MENTOR", "ADMIN"])),
    db: Session = Depends(get_db),
):
    q = db.query(BuilderSubmission)
    if status.upper() != "ALL":
        if status.upper() == "COMPLETED":
            q = q.filter(BuilderSubmission.status.in_(["APPROVED_CONNECTED", "REVISION_NEEDED"]))
        else:
            q = q.filter(BuilderSubmission.status == status.upper())

    subs = q.all()
    items = [serialize_submission(s, include_case=True) for s in subs]

    if sort == "highest_fit":
        items.sort(key=lambda x: (x.get("ai_preaudit") or {}).get("fit_score", 0), reverse=True)
    elif sort == "lowest_fit":
        items.sort(key=lambda x: (x.get("ai_preaudit") or {}).get("fit_score", 0))
    else:
        # FIFO oldest first
        items.sort(key=lambda x: x.get("updated_at", ""))

    return {
        "mentor_is_verified": bool(user.is_verified or user.role == "ADMIN"),
        "reviews": items,
    }


@router.patch("/{submission_id}")
def submit_mentor_review(
    submission_id: str,
    payload: MentorReviewRequest,
    user: User = Depends(require_role(["MENTOR", "ADMIN"], require_verified=True)),
    db: Session = Depends(get_db),
):
    """Atomic review decision with mandatory 3-point check & audit logging (PRD Ch. 6.4 & 18.1)."""
    sub = db.query(BuilderSubmission).filter(BuilderSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "ENTITY_NOT_FOUND", "message": "Submission not found.", "details": {}},
        )

    checks = payload.rubric_checks
    all_three = checks.solves_core_bottleneck and checks.handles_edge_cases and checks.pilot_ready

    if payload.decision == "APPROVED_CONNECTED" and not all_three:
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "RUBRIC_INCOMPLETE",
                "message": "All 3 verification rubric checks must be true before approving and connecting to the business.",
                "details": checks.model_dump(),
            },
        )

    if payload.decision == "REVISION_NEEDED" and len(payload.mentor_feedback.strip()) < 20:
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "FEEDBACK_TOO_SHORT",
                "message": "Provide at least 20 characters of actionable revision feedback for the builder.",
                "details": {"min_length": 20, "actual_length": len(payload.mentor_feedback.strip())},
            },
        )

    # Atomic state update + immutable audit log inside same DB transaction
    sub.status = payload.decision
    sub.reviewed_by_mentor_id = user.id
    sub.rubric_checks_json = json.dumps(checks.model_dump())
    sub.mentor_feedback = payload.mentor_feedback.strip()

    action_type = "SUBMISSION_APPROVED" if payload.decision == "APPROVED_CONNECTED" else "REVISION_REQUESTED"
    log_audit_event(
        db,
        user.id,
        action_type,
        sub.id,
        {
            "case_id": sub.case_id,
            "builder_id": sub.builder_id,
            "version": sub.version,
            "decision": payload.decision,
            "rubric_checks": checks.model_dump(),
        },
    )
    db.commit()
    db.refresh(sub)
    return serialize_submission(sub, include_case=True)
