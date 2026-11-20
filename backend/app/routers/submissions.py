"""Student Solution Submissions, Versioned Revisions & Public Verified Proof-of-Work Portfolio (PRD Ch. 5 & 11)."""
from __future__ import annotations

import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.rbac import require_role
from app.models import BuilderSubmission, DiagnosticCase, User
from app.schemas import SubmissionCreateRequest
from app.services.audit_logger import log_audit_event
from app.services.gemini_engine import generate_mentor_preaudit
from app.services.serializers import serialize_submission

router = APIRouter(tags=["submissions"])


@router.post("/submissions", status_code=201)
def create_or_revise_submission(
    payload: SubmissionCreateRequest,
    user: User = Depends(require_role(["STUDENT"])),
    db: Session = Depends(get_db),
):
    case = db.query(DiagnosticCase).filter(DiagnosticCase.id == payload.case_id).first()
    if not case or not case.is_published_to_builders or case.status == "ARCHIVED":
        raise HTTPException(
            status_code=404,
            detail={"error_code": "ENTITY_NOT_FOUND", "message": "Published challenge not found.", "details": {}},
        )
    if not payload.demo_url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=400,
            detail={"error_code": "INVALID_DEMO_URL", "message": "Demo URL must begin with http:// or https://.", "details": {}},
        )

    brief = json.loads(case.challenge_brief_json or "{}")
    preaudit = generate_mentor_preaudit(
        challenge_brief=brief,
        submission=payload.model_dump(),
    )

    existing = None
    if payload.resubmit_id:
        existing = (
            db.query(BuilderSubmission)
            .filter(BuilderSubmission.id == payload.resubmit_id, BuilderSubmission.builder_id == user.id)
            .first()
        )
    else:
        existing = (
            db.query(BuilderSubmission)
            .filter(
                BuilderSubmission.case_id == case.id,
                BuilderSubmission.builder_id == user.id,
                BuilderSubmission.status == "REVISION_NEEDED",
            )
            .order_by(BuilderSubmission.updated_at.desc())
            .first()
        )

    if existing:
        existing.version += 1
        existing.solution_title = payload.solution_title
        existing.solution_type = payload.solution_type
        existing.tech_stack_json = json.dumps(payload.tech_stack)
        existing.architecture_summary = payload.architecture_summary
        existing.demo_url = payload.demo_url
        existing.output_preview = payload.output_preview
        existing.ai_preaudit_json = json.dumps(preaudit)
        existing.status = "PENDING_REVIEW"
        sub = existing
        action = "SUBMISSION_REVISED"
    else:
        sub = BuilderSubmission(
            id=f"sub_{uuid.uuid4().hex[:8]}",
            case_id=case.id,
            builder_id=user.id,
            version=1,
            solution_title=payload.solution_title,
            solution_type=payload.solution_type,
            tech_stack_json=json.dumps(payload.tech_stack),
            architecture_summary=payload.architecture_summary,
            demo_url=payload.demo_url,
            output_preview=payload.output_preview,
            ai_preaudit_json=json.dumps(preaudit),
            status="PENDING_REVIEW",
        )
        db.add(sub)
        action = "SUBMISSION_CREATED"

    db.flush()
    log_audit_event(
        db,
        user.id,
        action,
        sub.id,
        {"case_id": case.id, "version": sub.version, "fit_score": preaudit.get("fit_score")},
    )
    db.commit()
    db.refresh(sub)
    return serialize_submission(sub, include_case=True)


@router.get("/submissions")
def list_submissions(
    user: User = Depends(require_role(["STUDENT", "MENTOR", "ADMIN"])),
    db: Session = Depends(get_db),
):
    q = db.query(BuilderSubmission)
    if user.role == "STUDENT":
        q = q.filter(BuilderSubmission.builder_id == user.id)
    subs = q.order_by(BuilderSubmission.updated_at.desc()).all()
    return {"submissions": [serialize_submission(s, include_case=True) for s in subs]}


@router.get("/submissions/{submission_id}")
def get_submission(
    submission_id: str,
    user: User = Depends(require_role(["STUDENT", "MENTOR", "ADMIN"])),
    db: Session = Depends(get_db),
):
    sub = db.query(BuilderSubmission).filter(BuilderSubmission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail={"error_code": "ENTITY_NOT_FOUND", "message": "Submission not found.", "details": {}})
    if user.role == "STUDENT" and sub.builder_id != user.id:
        raise HTTPException(status_code=403, detail={"error_code": "RBAC_FORBIDDEN", "message": "Cannot access another builder's draft.", "details": {}})
    return serialize_submission(sub, include_case=True)


@router.get("/portfolio/{student_id}")
def get_public_portfolio(student_id: str, db: Session = Depends(get_db)):
    """Public read-only Verified Proof-of-Work page (PRD Ch. 5.5 & Page 11). Never leaks private drafts or raw business identity."""
    student = db.query(User).filter(User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail={"error_code": "ENTITY_NOT_FOUND", "message": "Builder profile not found.", "details": {}})

    approved_subs = (
        db.query(BuilderSubmission)
        .filter(
            BuilderSubmission.builder_id == student.id,
            BuilderSubmission.status == "APPROVED_CONNECTED",
        )
        .order_by(BuilderSubmission.updated_at.desc())
        .all()
    )

    cards = []
    skills: set[str] = set(json.loads(student.domain_tags or "[]"))
    for s in approved_subs:
        ser = serialize_submission(s, include_case=True)
        for tag in ser.get("tech_stack", []):
            skills.add(tag)
        brief = ser.get("challenge_brief", {})
        cards.append({
            "id": ser["id"],
            "verification_code": ser["verification_code"],
            "solution_title": ser["solution_title"],
            "solution_type": ser["solution_type"],
            "tech_stack": ser["tech_stack"],
            "demo_url": ser["demo_url"],
            "output_preview": ser["output_preview"],
            "anonymized_impact": f"Solved {brief.get('challenge_title', 'Operational Bottleneck')} ({brief.get('anonymized_context', 'Indian SMB')})",
            "fit_score": (ser.get("ai_preaudit") or {}).get("fit_score", 0),
            "rubric_checks": ser.get("rubric_checks"),
            "mentor_feedback": ser.get("mentor_feedback"),
            "reviewed_by_mentor_name": ser.get("reviewed_by_mentor_name"),
            "approved_at": ser["updated_at"],
        })

    return {
        "student": {
            "id": student.id,
            "full_name": student.full_name,
            "skills": sorted(skills),
            "total_verified_builds": len(cards),
        },
        "verified_cards": cards,
    }
