"""Business Audits, PII Diff Drawer, Publish, Ticket Export & Pilot Handoff Routes (PRD Ch. 4, 11, 17, 18)."""
from __future__ import annotations

import json
import logging
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies.rbac import assert_case_owner, require_role
from app.models import BuilderSubmission, DiagnosticCase, User
from app.schemas import PilotHandoffRequest, PublishCaseRequest
from app.services.audit_logger import log_audit_event
from app.services.gemini_engine import generate_diagnostic_and_brief
from app.services.pii_scrubber import PIILeakageViolationError, scrub_pii
from app.services.profiler import load_dataframe_from_bytes, profile_dataframe
from app.services.serializers import PRESET_METADATA, get_system_config, serialize_case, serialize_submission
from app.services.storage import storage_service
from app.services.ticket_exporter import generate_tickets_csv, generate_tickets_markdown

logger = logging.getLogger("vexa.audits")
router = APIRouter(prefix="/audits", tags=["audits"])


@router.post("")
async def create_audit(
    workspace_mode: str = Form("SMB"),
    organization_or_profile_name: str | None = Form(None),
    domain_category: str | None = Form(None),
    scale_tier: str | None = Form(None),
    primary_pain_points: str | None = Form(None),
    current_tools: str | None = Form(None),
    target_success_metric: str | None = Form(None),
    preset_key: str | None = Form(None),
    file: UploadFile | None = File(None),
    user: User = Depends(require_role(["BUSINESS", "ADMIN"])),
    db: Session = Depends(get_db),
):
    t_total = time.perf_counter()
    cfg = get_system_config(db)
    mode = workspace_mode.upper().strip()
    if mode not in ("SMB", "CAMPUS", "PERSONAL"):
        raise HTTPException(
            status_code=400,
            detail={"error_code": "INVALID_WORKSPACE_MODE", "message": f"Unsupported mode {mode}.", "details": {}},
        )
    if mode not in cfg.get("enabled_modes", ["SMB", "CAMPUS", "PERSONAL"]) and user.role != "ADMIN":
        raise HTTPException(
            status_code=403,
            detail={"error_code": "MODE_DISABLED", "message": f"Workspace mode {mode} is disabled by Platform Admin.", "details": {}},
        )

    # Resolve preset vs uploaded file
    preset_meta = PRESET_METADATA.get(preset_key) if preset_key else None
    if preset_key and not preset_meta:
        raise HTTPException(
            status_code=400,
            detail={"error_code": "INVALID_PRESET", "message": f"Unknown preset_key: {preset_key}", "details": {}},
        )

    if file is not None and file.filename:
        fname = file.filename
        if not fname.lower().endswith((".csv", ".xlsx")):
            raise HTTPException(
                status_code=400,
                detail={
                    "error_code": "FILE_TYPE_UNSUPPORTED",
                    "message": "Only .csv and .xlsx operational files are supported.",
                    "details": {"filename": fname},
                },
            )
        raw_bytes = await file.read()
        max_bytes = int(cfg.get("max_upload_mb", settings.max_upload_mb)) * 1024 * 1024
        if len(raw_bytes) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail={
                    "error_code": "FILE_TOO_LARGE",
                    "message": f"Uploaded file exceeds {cfg.get('max_upload_mb', 10)} MB limit.",
                    "details": {"size_bytes": len(raw_bytes)},
                },
            )
    elif preset_meta:
        preset_path = Path(settings.sample_data_dir) / preset_meta["filename"]
        if not preset_path.exists():
            raise HTTPException(
                status_code=404,
                detail={"error_code": "ENTITY_NOT_FOUND", "message": f"Preset dataset missing: {preset_meta['filename']}", "details": {}},
            )
        fname = preset_meta["filename"]
        raw_bytes = preset_path.read_bytes()
    else:
        raise HTTPException(
            status_code=400,
            detail={"error_code": "FILE_REQUIRED", "message": "Upload a .csv/.xlsx file or select a 1-click Indian demo preset.", "details": {}},
        )

    # Parse intake metadata (falling back to preset defaults when invoked with preset_key)
    title = (organization_or_profile_name or (preset_meta["organization_or_profile_name"] if preset_meta else "Operational Diagnostic")).strip()
    domain = (domain_category or (preset_meta["domain_category"] if preset_meta else "Retail/D2C")).strip()
    scale = (scale_tier or (preset_meta["scale_tier"] if preset_meta else "6-20")).strip()
    target = (target_success_metric or (preset_meta["target_success_metric"] if preset_meta else "Reduce operational leakage by 35% in 30 days")).strip()

    def _parse_list(val: str | None, default: list[str]) -> list[str]:
        if not val:
            return default
        try:
            parsed = json.loads(val)
            if isinstance(parsed, list):
                return [str(x) for x in parsed]
        except Exception:
            pass
        return [x.strip() for x in val.split(",") if x.strip()] or default

    pain_points = _parse_list(primary_pain_points, preset_meta["primary_pain_points"] if preset_meta else ["Order/Delivery Delays"])
    tools = _parse_list(current_tools, preset_meta["current_tools"] if preset_meta else ["Excel/Sheets", "WhatsApp"])

    # Stage 1: Deterministic Pandas profiling
    try:
        df = load_dataframe_from_bytes(raw_bytes, fname)
    except ValueError as exc:
        code = "FILE_TOO_LARGE" if "Row limit" in str(exc) else "CSV_PARSE_ERROR"
        status_code = 413 if code == "FILE_TOO_LARGE" else 422
        raise HTTPException(status_code=status_code, detail={"error_code": code, "message": str(exc), "details": {}})

    stats = profile_dataframe(df, mode)

    # Stage 2: Two-pass Indian PII Scrubbing + Zero-Leak Gate
    t_pii = time.perf_counter()
    try:
        masked_df, redacted_cols, diff_rows, rules_triggered = scrub_pii(df)
    except PIILeakageViolationError as exc:
        log_audit_event(db, user.id, "PII_LEAK_GATE_BLOCKED", "pending_case", {"reason": str(exc)})
        db.commit()
        raise HTTPException(
            status_code=500,
            detail={"error_code": "PII_LEAK_GATE_BLOCKED", "message": "PII verification gate blocked unsafe dataset.", "details": {"reason": str(exc)}},
        )
    pii_ms = int((time.perf_counter() - t_pii) * 1000)

    # Stage 3: Isolated Raw vs. Masked storage writes
    case_id = f"case_{uuid.uuid4().hex[:10]}"
    raw_csv_bytes = df.to_csv(index=False).encode("utf-8")
    masked_csv_bytes = masked_df.to_csv(index=False).encode("utf-8")
    raw_path = storage_service.write_bytes("raw", f"{case_id}_raw.csv", raw_csv_bytes)
    masked_path = storage_service.write_bytes("masked", f"{case_id}_masked.csv", masked_csv_bytes)

    # Stage 4: Gemini 2.5 Flash structured synthesis (NEVER receives raw rows)
    intake_payload = {
        "workspace_mode": mode,
        "organization_or_profile_name": title,
        "domain_category": domain,
        "scale_tier": scale,
        "primary_pain_points": pain_points,
        "current_tools": tools,
        "target_success_metric": target,
    }
    ai_report, gemini_ms = generate_diagnostic_and_brief(mode, intake_payload, stats)

    pii_diff_payload = {
        "case_id": case_id,
        "zero_leak_verified": True,
        "redacted_columns": redacted_cols,
        "rules_triggered": rules_triggered,
        "sample_rows": diff_rows,
    }

    case = DiagnosticCase(
        id=case_id,
        owner_id=user.id,
        workspace_mode=mode,
        title=title,
        domain_category=domain,
        scale_tier=scale,
        pain_points_json=json.dumps(pain_points),
        current_tools_json=json.dumps(tools),
        target_metric=target,
        deterministic_stats_json=json.dumps(stats),
        ai_report_json=json.dumps(ai_report),
        challenge_brief_json=json.dumps(ai_report.get("challenge_brief", {})),
        pii_diff_sample_json=json.dumps(pii_diff_payload),
        raw_csv_path=raw_path,
        masked_csv_path=masked_path,
        is_published_to_builders=False,
        status="ACTIVE",
    )
    db.add(case)
    log_audit_event(
        db,
        user.id,
        "CASE_CREATED",
        case_id,
        {
            "workspace_mode": mode,
            "row_count": stats.get("row_count"),
            "redacted_columns": redacted_cols,
            "generation_mode": ai_report.get("generation_mode"),
        },
    )
    db.commit()
    db.refresh(case)

    total_ms = int((time.perf_counter() - t_total) * 1000)
    logger.info(
        json.dumps({
            "event": "audit_completed",
            "case_id": case_id,
            "profiling_ms": stats.get("profiling_ms"),
            "pii_scrub_ms": pii_ms,
            "gemini_ms": gemini_ms,
            "total_ms": total_ms,
            "generation_mode": ai_report.get("generation_mode"),
        })
    )

    resp = serialize_case(case, db)
    resp["latency_ms"] = total_ms
    resp["stage_timings_ms"] = {
        "profiling_ms": stats.get("profiling_ms", 0),
        "pii_scrub_ms": pii_ms,
        "gemini_ms": gemini_ms,
        "total_ms": total_ms,
    }
    return resp


@router.get("")
def list_audits(
    user: User = Depends(require_role(["BUSINESS", "ADMIN"])),
    db: Session = Depends(get_db),
):
    q = db.query(DiagnosticCase)
    if user.role != "ADMIN":
        q = q.filter(DiagnosticCase.owner_id == user.id)
    cases = q.order_by(DiagnosticCase.created_at.desc()).all()
    return {"audits": [serialize_case(c, db) for c in cases]}


@router.get("/{case_id}")
def get_audit(
    case_id: str,
    user: User = Depends(require_role(["BUSINESS", "ADMIN"])),
    db: Session = Depends(get_db),
):
    case = db.query(DiagnosticCase).filter(DiagnosticCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail={"error_code": "ENTITY_NOT_FOUND", "message": "Audit case not found.", "details": {}})
    assert_case_owner(case, user)
    return serialize_case(case, db)


@router.get("/{case_id}/pii-diff")
def get_pii_diff(
    case_id: str,
    user: User = Depends(require_role(["BUSINESS", "ADMIN"])),
    db: Session = Depends(get_db),
):
    case = db.query(DiagnosticCase).filter(DiagnosticCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail={"error_code": "ENTITY_NOT_FOUND", "message": "Audit case not found.", "details": {}})
    assert_case_owner(case, user)
    return json.loads(case.pii_diff_sample_json or "{}")


@router.patch("/{case_id}/publish")
def toggle_publish_case(
    case_id: str,
    payload: PublishCaseRequest,
    user: User = Depends(require_role(["BUSINESS", "ADMIN"])),
    db: Session = Depends(get_db),
):
    case = db.query(DiagnosticCase).filter(DiagnosticCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail={"error_code": "ENTITY_NOT_FOUND", "message": "Audit case not found.", "details": {}})
    assert_case_owner(case, user)
    case.is_published_to_builders = payload.is_published_to_builders
    action = "CASE_PUBLISHED" if payload.is_published_to_builders else "CASE_UNPUBLISHED"
    log_audit_event(db, user.id, action, case.id, {"is_published_to_builders": case.is_published_to_builders})
    db.commit()
    db.refresh(case)
    return serialize_case(case, db)


@router.get("/{case_id}/tickets")
def export_tickets(
    case_id: str,
    format: str = Query("md", pattern="^(md|csv)$"),
    user: User = Depends(require_role(["BUSINESS", "ADMIN"])),
    db: Session = Depends(get_db),
):
    case = db.query(DiagnosticCase).filter(DiagnosticCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail={"error_code": "ENTITY_NOT_FOUND", "message": "Audit case not found.", "details": {}})
    assert_case_owner(case, user)
    ai_report = json.loads(case.ai_report_json or "{}")
    if format == "csv":
        content = generate_tickets_csv(case.title, ai_report, case.target_metric)
        return PlainTextResponse(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{case.id}_tickets.csv"'},
        )
    content = generate_tickets_markdown(case.title, ai_report, case.target_metric)
    return PlainTextResponse(
        content=content,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{case.id}_tickets.md"'},
    )


@router.get("/{case_id}/solutions")
def get_matched_solutions(
    case_id: str,
    user: User = Depends(require_role(["BUSINESS", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """Only APPROVED_CONNECTED submissions are revealed to the Business Owner (PRD Ch. 4.6)."""
    case = db.query(DiagnosticCase).filter(DiagnosticCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail={"error_code": "ENTITY_NOT_FOUND", "message": "Audit case not found.", "details": {}})
    assert_case_owner(case, user)
    all_subs = db.query(BuilderSubmission).filter(BuilderSubmission.case_id == case.id).order_by(BuilderSubmission.updated_at.desc()).all()
    approved = [serialize_submission(s) for s in all_subs if s.status == "APPROVED_CONNECTED"]
    return {
        "case": serialize_case(case, db),
        "pipeline_counts": {
            "total": len(all_subs),
            "pending_review": sum(1 for s in all_subs if s.status == "PENDING_REVIEW"),
            "revision_needed": sum(1 for s in all_subs if s.status == "REVISION_NEEDED"),
            "approved_connected": len(approved),
        },
        "approved_solutions": approved,
    }


@router.post("/{case_id}/handoff")
def schedule_pilot_handoff(
    case_id: str,
    payload: PilotHandoffRequest,
    user: User = Depends(require_role(["BUSINESS", "ADMIN"])),
    db: Session = Depends(get_db),
):
    case = db.query(DiagnosticCase).filter(DiagnosticCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail={"error_code": "ENTITY_NOT_FOUND", "message": "Audit case not found.", "details": {}})
    assert_case_owner(case, user)
    case.status = "PILOT_MATCHED"
    log_audit_event(
        db,
        user.id,
        "PILOT_HANDOFF_SCHEDULED",
        case.id,
        {"submission_id": payload.submission_id, "calendar_url": payload.calendar_url, "notes": payload.notes},
    )
    db.commit()
    db.refresh(case)
    return serialize_case(case, db)
