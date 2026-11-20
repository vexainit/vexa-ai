"""Deterministic Demo Seeder (PRD Ch. 20.3): 4 Demo Roles + 1 Unverified Mentor, 1 Published Case, 1 Pending Student Draft."""
from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import AuditLog, BuilderSubmission, DiagnosticCase, User
from app.services.audit_logger import log_audit_event
from app.services.pii_scrubber import scrub_pii
from app.services.profiler import load_dataframe_from_bytes, profile_dataframe
from app.services.serializers import PRESET_METADATA, save_system_config
from app.services.storage import storage_service


def seed_demo_data(db: Session, force: bool = False) -> None:
    if not force and db.query(User).count() > 0:
        return

    if force:
        db.query(AuditLog).delete()
        db.query(BuilderSubmission).delete()
        db.query(DiagnosticCase).delete()
        db.query(User).delete()
        db.commit()

    # 1. Seed 4 Demo Role Accounts + 1 Unverified Mentor (PRD Ch. 20.3)
    demo_users = [
        User(
            id="biz_kaya",
            full_name="Kaya Looms D2C",
            email="ops@kayalooms.in",
            role="BUSINESS",
            domain_tags=json.dumps(["Retail/D2C", "Apparel", "Ahmedabad"]),
            is_verified=True,
            is_active=True,
        ),
        User(
            id="stu_aarav",
            full_name="Aarav Mehta",
            email="aarav.mehta@builder.in",
            role="STUDENT",
            domain_tags=json.dumps(["Python", "FastAPI", "Gemini 2.5 Flash", "Pandas"]),
            is_verified=True,
            is_active=True,
        ),
        User(
            id="men_priya",
            full_name="Priya Shah",
            email="priya.shah@vexamentors.in",
            role="MENTOR",
            domain_tags=json.dumps(["AI Architecture", "SMB Operations", "Cloud Run"]),
            is_verified=True,
            is_active=True,
        ),
        User(
            id="adm_vexa",
            full_name="Vexa Ops Admin",
            email="admin@vexabridge.in",
            role="ADMIN",
            domain_tags=json.dumps(["Governance", "Compliance", "Telemetry"]),
            is_verified=True,
            is_active=True,
        ),
        User(
            id="men_pending",
            full_name="Vikram Desai (Pending Verification)",
            email="vikram.desai@mentors.in",
            role="MENTOR",
            domain_tags=json.dumps(["Data Engineering", "Supply Chain"]),
            is_verified=False,
            is_active=True,
        ),
    ]
    for u in demo_users:
        db.add(u)
    db.flush()

    save_system_config(db, {
        "min_ai_fit_alert_threshold": 65,
        "max_upload_mb": 10,
        "enabled_modes": ["SMB", "CAMPUS", "PERSONAL"],
    })

    # 2. Seed 1 Pre-Published SMB Case: Surat Wholesale Inquiry & Dispatch Log (PRD Ch. 20.3)
    preset = PRESET_METADATA["surat_wholesale"]
    csv_path = Path(settings.sample_data_dir) / preset["filename"]
    if not csv_path.exists():
        # Auto-generate presets if missing
        from scripts.generate_presets import main as gen_presets
        gen_presets()

    raw_bytes = csv_path.read_bytes()
    df = load_dataframe_from_bytes(raw_bytes, preset["filename"])
    stats = profile_dataframe(df, "SMB")
    masked_df, redacted_cols, diff_rows, rules_triggered = scrub_pii(df)

    case_id = "case_surat_wh_01"
    raw_stored = storage_service.write_bytes("raw", f"{case_id}_raw.csv", df.to_csv(index=False).encode("utf-8"))
    masked_stored = storage_service.write_bytes("masked", f"{case_id}_masked.csv", masked_df.to_csv(index=False).encode("utf-8"))

    ai_report = {
        "health_score": 58,
        "generation_mode": "gemini_2_5_flash",
        "executive_summary": [
            f"Out of {stats['row_count']} Surat textile wholesale inquiries, {stats['delayed_order_pct']}% ({stats['delayed_count']} leads) waited more than 24 hours for a first quote.",
            f"Slow WhatsApp follow-ups collapsed conversion rates from 38% to 9% in delayed leads, driving an estimated INR {int(stats['est_monthly_leak_inr']):,}/month in missed pipeline.",
            f"Manual WhatsApp-to-Tally quote reconciliation costs {stats['est_manual_hours_lost']} staff hours per month.",
        ],
        "top_bottlenecks": [
            {
                "rank": 1,
                "title": "WhatsApp Inquiry Response SLA Breach (>24h Wait)",
                "root_cause": "41% of wholesale WhatsApp inquiries sit unquoted past 24 hours while sales reps manually look up fabric SKU pricing.",
                "quantified_leak": f"INR {int(stats['est_monthly_leak_inr']):,} / month ({stats['delayed_order_pct']}% slow inquiries)",
                "urgency": "CRITICAL",
                "affected_segment": stats["peak_bottleneck_segment"],
            },
            {
                "rank": 2,
                "title": "Manual WhatsApp-to-Excel Quote Entry Errors",
                "root_cause": "Unstructured buyer messages across WhatsApp and Phone cause missed SKU quantities and inconsistent GST quotes.",
                "quantified_leak": f"{stats['est_manual_hours_lost']} manual staff hours / month",
                "urgency": "HIGH",
                "affected_segment": "WhatsApp Wholesale Desk",
            },
            {
                "rank": 3,
                "title": "Unprioritized High-Value Bulk Inquiries",
                "root_cause": "Inquiries above INR 12,000 sit in the same FIFO inbox as small sample requests.",
                "quantified_leak": "38% vs 9% conversion cliff on delayed quotes",
                "urgency": "MEDIUM",
                "affected_segment": "High-Value B2B Textile Buyers",
            },
        ],
        "improvement_roadmap": [
            {
                "title": "Deploy instant WhatsApp Business quick-reply rate card for top 7 fabric SKUs",
                "track": "QUICK_WIN",
                "effort_estimate": "2 hours (SOP change)",
                "expected_impact": "Cuts initial buyer acknowledgment from 26h to <5 minutes",
            },
            {
                "title": "Tag inquiries >INR 12,000 with Priority Queue label at shift start",
                "track": "QUICK_WIN",
                "effort_estimate": "1 hour",
                "expected_impact": "Protects top-quartile wholesale pipeline immediately",
            },
            {
                "title": "Build WhatsApp Lead SLA Auto-Responder & Quote Routing Agent",
                "track": "AI_AUTOMATION_BUILD",
                "effort_estimate": "48-hour Builder Sprint",
                "expected_impact": "Recovers INR 1.5L–2.1L/mo in missed wholesale conversions",
            },
        ],
        "challenge_brief": {
            "challenge_title": "WhatsApp Lead SLA Auto-Responder & Fabric SKU Quote Engine",
            "anonymized_context": "Surat Textile Wholesale Distributor (21-50 staff) operating on WhatsApp, Excel/Sheets, and Tally.",
            "problem_statement": (
                "41% of wholesale WhatsApp inquiries wait over 24 hours for an initial quote, dropping conversion from 38% to 9%. "
                "Build a lightweight SLA triage and auto-quoting workflow that parses daily anonymized inquiry logs, flags >4h unquoted leads, and drafts structured SKU quotes via Gemini 2.5 Flash."
            ),
            "expected_deliverable_type": "AI Agent",
            "difficulty": "Intermediate",
            "target_kpi": "Cut median first-reply SLA under 2 hours and lift delayed lead conversion above 25%",
            "technical_requirements": [
                "Ingest daily anonymized inquiry CSV with graceful handling of mixed timestamps and null replies",
                "Score lead priority deterministically using quote_inr, fabric_sku, and elapsed wait hours",
                "Generate concise English/Hindi/Gujarati quote drafts using Gemini 2.5 Flash structured JSON",
                "Export an escalation queue CSV for leads waiting >4 hours",
            ],
            "evaluation_checklist": [
                "Zero crashes on missing first_reply_at timestamps or duplicate inquiry IDs",
                "Demonstrates measurable SLA triage accuracy on the 400-row masked dataset",
                "Clean web UI or runnable demo usable by a wholesale operations manager",
            ],
        },
        "personal_spend": None,
    }

    pii_diff = {
        "case_id": case_id,
        "zero_leak_verified": True,
        "redacted_columns": redacted_cols,
        "rules_triggered": rules_triggered,
        "sample_rows": diff_rows,
    }

    seeded_case = DiagnosticCase(
        id=case_id,
        owner_id="biz_kaya",
        workspace_mode="SMB",
        title=preset["organization_or_profile_name"],
        domain_category=preset["domain_category"],
        scale_tier=preset["scale_tier"],
        pain_points_json=json.dumps(preset["primary_pain_points"]),
        current_tools_json=json.dumps(preset["current_tools"]),
        target_metric=preset["target_success_metric"],
        deterministic_stats_json=json.dumps(stats),
        ai_report_json=json.dumps(ai_report),
        challenge_brief_json=json.dumps(ai_report["challenge_brief"]),
        pii_diff_sample_json=json.dumps(pii_diff),
        raw_csv_path=raw_stored,
        masked_csv_path=masked_stored,
        is_published_to_builders=True,
        status="ACTIVE",
    )
    db.add(seeded_case)

    # 3. Seed 1 Pre-Submitted Student Draft in PENDING_REVIEW with Gemini AI Pre-Audit (Fit Score 86, PRD Ch. 20.3)
    seeded_preaudit = {
        "fit_score": 86,
        "recommendation": "STRONG_CANDIDATE",
        "key_strengths": [
            "Directly targets Bottleneck #1 (>24h WhatsApp quote SLA breach) with deterministic 4-hour escalation rules.",
            "Clean separation of Pandas SLA latency scoring and Gemini 2.5 Flash multilingual SKU quote drafting.",
            "Tested on all 400 masked wholesale rows with quantified 91% capture of overdue high-value inquiries.",
        ],
        "edge_case_risks": [
            "Verify graceful fallback when first_reply_at is empty or formatted in DD/MM/YYYY.",
            "Confirm handling of transliterated Gujarati fabric inquiries with unrecognized SKU codes.",
        ],
        "mentor_probe_question": "How does your escalation queue behave if a repeat buyer sends three separate WhatsApp inquiries within 30 minutes?",
    }

    seeded_sub = BuilderSubmission(
        id="sub_seed_01",
        case_id=case_id,
        builder_id="stu_aarav",
        version=1,
        solution_title="WhatsApp Lead SLA Auto-Responder",
        solution_type="AI Agent",
        tech_stack_json=json.dumps(["Python", "FastAPI", "Gemini 2.5 Flash", "Pandas", "Cloud Run"]),
        architecture_summary=(
            "Ingests the daily Surat wholesale inquiry CSV using deterministic Pandas timestamp parsing, "
            "computes elapsed SLA wait windows per inquiry, prioritizes leads above INR 12,000 or waiting >4 hours, "
            "and invokes Gemini 2.5 Flash structured JSON to generate ready-to-send English/Hindi/Gujarati SKU quote replies "
            "with null-safe fallbacks for missing timestamps."
        ),
        demo_url="https://sla-responder-demo-asia-south1.run.app",
        output_preview=(
            "Validated on 400-row masked Surat dataset: flagged 164 overdue >24h inquiries (91% high-value recall), "
            "cut simulated median reply latency from 34h to 18m, and projected INR 1,72,000/month pipeline recovery."
        ),
        ai_preaudit_json=json.dumps(seeded_preaudit),
        status="PENDING_REVIEW",
    )
    db.add(seeded_sub)

    log_audit_event(db, "biz_kaya", "CASE_CREATED", case_id, {"workspace_mode": "SMB", "preset": "surat_wholesale"})
    log_audit_event(db, "biz_kaya", "CASE_PUBLISHED", case_id, {"is_published_to_builders": True})
    log_audit_event(db, "stu_aarav", "SUBMISSION_CREATED", "sub_seed_01", {"case_id": case_id, "version": 1, "fit_score": 86})

    db.commit()


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_demo_data(db, force=True)
        print("Vexa Bridge demo state seeded successfully.")
    finally:
        db.close()
