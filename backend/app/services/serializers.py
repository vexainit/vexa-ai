"""Shared serialization helpers & preset definitions."""
from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.models import BuilderSubmission, DiagnosticCase, SystemConfig, User

DEFAULT_SYSTEM_CONFIG: dict[str, Any] = {
    "min_ai_fit_alert_threshold": 65,
    "max_upload_mb": 10,
    "enabled_modes": ["SMB", "CAMPUS", "PERSONAL"],
}

PRESET_METADATA: dict[str, dict[str, Any]] = {
    "ahmedabad_d2c": {
        "filename": "ahmedabad_d2c.csv",
        "workspace_mode": "SMB",
        "organization_or_profile_name": "Kaya Looms D2C Apparel",
        "domain_category": "Retail/D2C",
        "scale_tier": "6-20",
        "primary_pain_points": ["Order/Delivery Delays", "High Return/Refund Rate"],
        "current_tools": ["Excel/Sheets", "WhatsApp", "Shopify/WooCommerce"],
        "target_success_metric": "Reduce COD RTO rate by 35% and delayed dispatches by 40% within 30 days",
    },
    "surat_wholesale": {
        "filename": "surat_wholesale.csv",
        "workspace_mode": "SMB",
        "organization_or_profile_name": "Surat Looms Wholesale Hub",
        "domain_category": "Manufacturing/Wholesale",
        "scale_tier": "21-50",
        "primary_pain_points": ["Slow Lead Follow-up", "Manual Billing/Inventory Leaks"],
        "current_tools": ["WhatsApp", "Excel/Sheets", "Tally"],
        "target_success_metric": "Cut WhatsApp quote response time under 2 hours and lift conversion above 28%",
    },
    "personal_upi_30d": {
        "filename": "personal_upi_30d.csv",
        "workspace_mode": "PERSONAL",
        "organization_or_profile_name": "Aarav Personal UPI Audit",
        "domain_category": "Salaried",
        "scale_tier": "₹25k–₹75k",
        "primary_pain_points": ["Micro-Transaction Drift", "Late-Night Impulse Spend"],
        "current_tools": ["GPay/PhonePe", "Credit Cards"],
        "target_success_metric": "Cut discretionary micro-spend leakage below INR 5,000/month within 14 days",
    },
}


def get_system_config(db: Session) -> dict[str, Any]:
    row = db.query(SystemConfig).filter(SystemConfig.key == "global").first()
    if not row:
        return dict(DEFAULT_SYSTEM_CONFIG)
    try:
        loaded = json.loads(row.value_json)
        return {**DEFAULT_SYSTEM_CONFIG, **loaded}
    except Exception:
        return dict(DEFAULT_SYSTEM_CONFIG)


def save_system_config(db: Session, cfg: dict[str, Any]) -> dict[str, Any]:
    merged = {**DEFAULT_SYSTEM_CONFIG, **cfg}
    row = db.query(SystemConfig).filter(SystemConfig.key == "global").first()
    if row:
        row.value_json = json.dumps(merged)
    else:
        db.add(SystemConfig(key="global", value_json=json.dumps(merged)))
    return merged


def serialize_user(u: User) -> dict[str, Any]:
    return {
        "id": u.id,
        "full_name": u.full_name,
        "email": u.email,
        "role": u.role,
        "domain_tags": json.loads(u.domain_tags or "[]"),
        "is_verified": bool(u.is_verified),
        "is_active": bool(u.is_active),
        "created_at": u.created_at.isoformat() if u.created_at else "",
    }


def make_verification_code(sub_id: str) -> str:
    tail = "".join(ch for ch in sub_id.upper() if ch.isalnum())[-4:].rjust(4, "0")
    return f"VB-POW-2026-{tail}"


def serialize_submission(s: BuilderSubmission, include_case: bool = False) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": s.id,
        "case_id": s.case_id,
        "builder_id": s.builder_id,
        "builder_name": s.builder.full_name if s.builder else s.builder_id,
        "version": s.version,
        "solution_title": s.solution_title,
        "solution_type": s.solution_type,
        "tech_stack": json.loads(s.tech_stack_json or "[]"),
        "architecture_summary": s.architecture_summary,
        "demo_url": s.demo_url,
        "output_preview": s.output_preview,
        "ai_preaudit": json.loads(s.ai_preaudit_json) if s.ai_preaudit_json else None,
        "status": s.status,
        "reviewed_by_mentor_id": s.reviewed_by_mentor_id,
        "reviewed_by_mentor_name": s.reviewer.full_name if s.reviewer else None,
        "rubric_checks": json.loads(s.rubric_checks_json) if s.rubric_checks_json else None,
        "mentor_feedback": s.mentor_feedback,
        "verification_code": make_verification_code(s.id) if s.status == "APPROVED_CONNECTED" else None,
        "created_at": s.created_at.isoformat() if s.created_at else "",
        "updated_at": s.updated_at.isoformat() if s.updated_at else "",
    }
    if include_case and s.case:
        brief = json.loads(s.case.challenge_brief_json or "{}")
        stats = json.loads(s.case.deterministic_stats_json or "{}")
        data["challenge_brief"] = brief
        data["case_summary"] = {
            "id": s.case.id,
            "workspace_mode": s.case.workspace_mode,
            "domain_category": s.case.domain_category,
            "scale_tier": s.case.scale_tier or "",
            "target_metric": s.case.target_metric,
            "row_count": stats.get("row_count", 0),
            "est_monthly_leak_inr": stats.get("est_monthly_leak_inr", 0),
        }
    return data


def serialize_case(c: DiagnosticCase, db: Session, include_pii_summary: bool = True) -> dict[str, Any]:
    subs = db.query(BuilderSubmission).filter(BuilderSubmission.case_id == c.id).all()
    counts = {
        "pending": sum(1 for s in subs if s.status == "PENDING_REVIEW"),
        "revision_needed": sum(1 for s in subs if s.status == "REVISION_NEEDED"),
        "approved": sum(1 for s in subs if s.status == "APPROVED_CONNECTED"),
    }
    ai_report = json.loads(c.ai_report_json or "{}")
    if "challenge_brief" not in ai_report:
        ai_report["challenge_brief"] = json.loads(c.challenge_brief_json or "{}")

    payload: dict[str, Any] = {
        "id": c.id,
        "owner_id": c.owner_id,
        "workspace_mode": c.workspace_mode,
        "title": c.title,
        "domain_category": c.domain_category,
        "scale_tier": c.scale_tier or "",
        "pain_points": json.loads(c.pain_points_json or "[]"),
        "current_tools": json.loads(c.current_tools_json or "[]"),
        "target_metric": c.target_metric,
        "deterministic_stats": json.loads(c.deterministic_stats_json or "{}"),
        "ai_report": ai_report,
        "is_published_to_builders": bool(c.is_published_to_builders),
        "status": c.status,
        "submission_counts": counts,
        "created_at": c.created_at.isoformat() if c.created_at else "",
    }
    if include_pii_summary and c.pii_diff_sample_json:
        pii_meta = json.loads(c.pii_diff_sample_json)
        payload["pii_summary"] = {
            "masked_columns": pii_meta.get("redacted_columns", []),
            "rules_triggered": pii_meta.get("rules_triggered", []),
            "zero_leak_verified": bool(pii_meta.get("zero_leak_verified", True)),
        }
    return payload
