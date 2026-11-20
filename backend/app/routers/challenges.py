"""Student & Mentor Challenge Marketplace & Safe Masked Dataset Streaming Routes (PRD Ch. 5 & 11.3)."""
from __future__ import annotations

import io
import json

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.rbac import require_role
from app.models import BuilderSubmission, DiagnosticCase, User
from app.services.storage import storage_service

router = APIRouter(prefix="/challenges", tags=["challenges"])


def _serialize_challenge(c: DiagnosticCase, db: Session) -> dict:
    brief = json.loads(c.challenge_brief_json or "{}")
    stats = json.loads(c.deterministic_stats_json or "{}")
    sub_count = db.query(BuilderSubmission).filter(BuilderSubmission.case_id == c.id).count()
    return {
        "id": c.id,
        "workspace_mode": c.workspace_mode,
        "domain_category": c.domain_category,
        "scale_tier": c.scale_tier or "",
        "current_tools": json.loads(c.current_tools_json or "[]"),
        "target_metric": c.target_metric,
        "status": c.status,
        "row_count": stats.get("row_count", 0),
        "col_count": stats.get("col_count", 0),
        "est_monthly_leak_inr": stats.get("est_monthly_leak_inr", 0),
        "challenge_brief": brief,
        "submission_count": sub_count,
        "pii_verified": True,
        "created_at": c.created_at.isoformat() if c.created_at else "",
    }


@router.get("")
def list_challenges(
    mode: str | None = Query(None),
    domain: str | None = Query(None),
    solution_type: str | None = Query(None),
    difficulty: str | None = Query(None),
    sort: str = Query("newest"),
    user: User = Depends(require_role(["STUDENT", "MENTOR", "ADMIN"])),
    db: Session = Depends(get_db),
):
    q = db.query(DiagnosticCase).filter(
        DiagnosticCase.is_published_to_builders.is_(True),
        DiagnosticCase.status != "ARCHIVED",
    )
    if mode:
        q = q.filter(DiagnosticCase.workspace_mode == mode.upper())
    if domain:
        q = q.filter(DiagnosticCase.domain_category == domain)

    cases = q.order_by(DiagnosticCase.created_at.desc()).all()
    items = [_serialize_challenge(c, db) for c in cases]

    if solution_type:
        items = [i for i in items if i["challenge_brief"].get("expected_deliverable_type") == solution_type]
    if difficulty:
        items = [i for i in items if i["challenge_brief"].get("difficulty") == difficulty]

    if sort == "impact":
        items.sort(key=lambda x: x.get("est_monthly_leak_inr", 0), reverse=True)
    elif sort == "fewest_submissions":
        items.sort(key=lambda x: x.get("submission_count", 0))

    return {"challenges": items}


@router.get("/{case_id}")
def get_challenge_detail(
    case_id: str,
    user: User = Depends(require_role(["STUDENT", "MENTOR", "ADMIN"])),
    db: Session = Depends(get_db),
):
    case = db.query(DiagnosticCase).filter(DiagnosticCase.id == case_id).first()
    if not case or (not case.is_published_to_builders and user.role != "ADMIN") or (case.status == "ARCHIVED" and user.role != "ADMIN"):
        raise HTTPException(status_code=404, detail={"error_code": "ENTITY_NOT_FOUND", "message": "Published challenge not found.", "details": {}})

    # Read ONLY masked_csv_path for schema + 5-row preview; NEVER touch raw_csv_path
    masked_bytes = storage_service.read_bytes(case.masked_csv_path)
    df = pd.read_csv(io.BytesIO(masked_bytes), nrows=5, dtype=str).fillna("")
    stats = json.loads(case.deterministic_stats_json or "{}")
    schema_types = stats.get("schema_types", {})

    detail = _serialize_challenge(case, db)
    detail["dataset_preview"] = {
        "columns": [{"name": col, "type": schema_types.get(col, "text")} for col in df.columns],
        "rows": df.to_dict(orient="records"),
    }
    return detail


@router.get("/{case_id}/dataset")
def download_masked_dataset(
    case_id: str,
    user: User = Depends(require_role(["STUDENT", "MENTOR", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """Streams masked_csv_path exclusively. NEVER touches raw_csv_path."""
    case = db.query(DiagnosticCase).filter(DiagnosticCase.id == case_id).first()
    if not case or (not case.is_published_to_builders and user.role != "ADMIN"):
        raise HTTPException(status_code=404, detail={"error_code": "ENTITY_NOT_FOUND", "message": "Published dataset not found.", "details": {}})

    masked_bytes = storage_service.read_bytes(case.masked_csv_path)
    return Response(
        content=masked_bytes,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{case.id}_masked_safe.csv"'},
    )
