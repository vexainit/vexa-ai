"""End-to-End Acceptance Suite covering TC-01 through TC-06 (PRD Ch. 14.3 & Ch. 24.1)."""
from __future__ import annotations

from unittest.mock import patch


def test_tc01_multi_mode_pipeline(client):
    r_smb = client.post(
        "/api/v1/audits",
        headers={"X-Vexa-User-Id": "biz_kaya", "X-Vexa-Role": "BUSINESS"},
        data={"preset_key": "ahmedabad_d2c", "workspace_mode": "SMB"},
    )
    assert r_smb.status_code == 200
    body_smb = r_smb.json()
    assert body_smb["latency_ms"] < 5000
    assert body_smb["deterministic_stats"]["row_count"] == 500
    assert body_smb["ai_report"]["challenge_brief"]["challenge_title"]

    r_pers = client.post(
        "/api/v1/audits",
        headers={"X-Vexa-User-Id": "biz_kaya", "X-Vexa-Role": "BUSINESS"},
        data={"preset_key": "personal_upi_30d", "workspace_mode": "PERSONAL"},
    )
    assert r_pers.status_code == 200
    body_pers = r_pers.json()
    assert body_pers["latency_ms"] < 5000
    assert body_pers["ai_report"]["personal_spend"] is not None
    assert len(body_pers["ai_report"]["personal_spend"]["seven_day_fix_checklist"]) == 7


def test_tc02_tc03_tc04_business_to_student_to_mentor_live_sync(client):
    # 1. Business runs Ahmedabad D2C preset audit
    r1 = client.post(
        "/api/v1/audits",
        headers={"X-Vexa-User-Id": "biz_kaya", "X-Vexa-Role": "BUSINESS"},
        data={"preset_key": "ahmedabad_d2c", "workspace_mode": "SMB"},
    )
    assert r1.status_code == 200
    case_id = r1.json()["id"]

    # Business can inspect PII diff
    r_diff = client.get(
        f"/api/v1/audits/{case_id}/pii-diff",
        headers={"X-Vexa-User-Id": "biz_kaya", "X-Vexa-Role": "BUSINESS"},
    )
    assert r_diff.status_code == 200
    assert r_diff.json()["zero_leak_verified"] is True
    assert len(r_diff.json()["sample_rows"]) == 3

    # 2. Business publishes bottleneck to Builder Network
    r2 = client.patch(
        f"/api/v1/audits/{case_id}/publish",
        headers={"X-Vexa-User-Id": "biz_kaya", "X-Vexa-Role": "BUSINESS"},
        json={"is_published_to_builders": True},
    )
    assert r2.status_code == 200
    assert r2.json()["is_published_to_builders"] is True

    # 3. Student downloads masked dataset (must succeed with 0 PII) & attempts pii-diff (must 403)
    r_csv = client.get(
        f"/api/v1/challenges/{case_id}/dataset",
        headers={"X-Vexa-User-Id": "stu_aarav", "X-Vexa-Role": "STUDENT"},
    )
    assert r_csv.status_code == 200
    assert "Rohan Patel" not in r_csv.text
    assert "98250" not in r_csv.text
    assert "CUST_" in r_csv.text

    r_forbidden = client.get(
        f"/api/v1/audits/{case_id}/pii-diff",
        headers={"X-Vexa-User-Id": "stu_aarav", "X-Vexa-Role": "STUDENT"},
    )
    assert r_forbidden.status_code == 403

    # 4. Student submits draft
    r3 = client.post(
        "/api/v1/submissions",
        headers={"X-Vexa-User-Id": "stu_aarav", "X-Vexa-Role": "STUDENT"},
        json={
            "case_id": case_id,
            "solution_title": "AutoCOD Confirmation Agent",
            "solution_type": "AI Agent",
            "tech_stack": ["Python", "Gemini 2.5 Flash", "FastAPI"],
            "architecture_summary": (
                "Deterministic Tier-2 COD risk rules paired with Gemini 2.5 Flash multilingual buyer confirmation "
                "classification with graceful null pin code and Indian currency string fallbacks."
            ),
            "demo_url": "https://autocod-demo.run.app",
            "output_preview": "Flagged 86% of historical RTO orders on the 500-row masked CSV with INR 98,400/mo projected recovery.",
        },
    )
    assert r3.status_code == 201
    sub_id = r3.json()["id"]
    assert r3.json()["ai_preaudit"]["fit_score"] >= 50

    # TC-04a: Unverified mentor MUST be rejected with 403
    r_unver = client.patch(
        f"/api/v1/reviews/{sub_id}",
        headers={"X-Vexa-User-Id": "men_pending", "X-Vexa-Role": "MENTOR"},
        json={
            "decision": "APPROVED_CONNECTED",
            "rubric_checks": {"solves_core_bottleneck": True, "handles_edge_cases": True, "pilot_ready": True},
            "mentor_feedback": "Looks great.",
        },
    )
    assert r_unver.status_code == 403
    assert r_unver.json()["error_code"] == "MENTOR_UNVERIFIED"

    # TC-04b: Only 2/3 rubric checks true MUST be rejected with 400
    r_inc = client.patch(
        f"/api/v1/reviews/{sub_id}",
        headers={"X-Vexa-User-Id": "men_priya", "X-Vexa-Role": "MENTOR"},
        json={
            "decision": "APPROVED_CONNECTED",
            "rubric_checks": {"solves_core_bottleneck": True, "handles_edge_cases": False, "pilot_ready": True},
            "mentor_feedback": "Missing edge case handling.",
        },
    )
    assert r_inc.status_code == 400
    assert r_inc.json()["error_code"] == "RUBRIC_INCOMPLETE"

    # Verified Mentor approves with all 3 checks
    r4 = client.patch(
        f"/api/v1/reviews/{sub_id}",
        headers={"X-Vexa-User-Id": "men_priya", "X-Vexa-Role": "MENTOR"},
        json={
            "decision": "APPROVED_CONNECTED",
            "rubric_checks": {"solves_core_bottleneck": True, "handles_edge_cases": True, "pilot_ready": True},
            "mentor_feedback": "Solid edge-case handling and pilot-ready demo.",
        },
    )
    assert r4.status_code == 200
    assert r4.json()["status"] == "APPROVED_CONNECTED"
    assert r4.json()["verification_code"].startswith("VB-POW-2026-")

    # Live cross-role sync: Business sees approved solution; Public Portfolio shows Verified Card
    r_sols = client.get(
        f"/api/v1/audits/{case_id}/solutions",
        headers={"X-Vexa-User-Id": "biz_kaya", "X-Vexa-Role": "BUSINESS"},
    )
    assert r_sols.status_code == 200
    assert len(r_sols.json()["approved_solutions"]) == 1

    r_port = client.get("/api/v1/portfolio/stu_aarav")
    assert r_port.status_code == 200
    assert r_port.json()["student"]["total_verified_builds"] >= 1


def test_tc05_admin_governance_and_audit_logs(client):
    r_ver = client.patch(
        "/api/v1/admin/users/men_pending",
        headers={"X-Vexa-User-Id": "adm_vexa", "X-Vexa-Role": "ADMIN"},
        json={"is_verified": True},
    )
    assert r_ver.status_code == 200
    assert r_ver.json()["is_verified"] is True

    # Reset back to False so seeded demo stays faithful for live judging
    client.patch(
        "/api/v1/admin/users/men_pending",
        headers={"X-Vexa-User-Id": "adm_vexa", "X-Vexa-Role": "ADMIN"},
        json={"is_verified": False},
    )

    r_ov = client.get(
        "/api/v1/admin/overview",
        headers={"X-Vexa-User-Id": "adm_vexa", "X-Vexa-Role": "ADMIN"},
    )
    assert r_ov.status_code == 200
    actions = [log["action_type"] for log in r_ov.json()["audit_logs"]]
    assert "MENTOR_VERIFIED" in actions
    assert "SUBMISSION_APPROVED" in actions


def test_tc06_gemini_timeout_fallback(client):
    with patch("app.services.gemini_engine._invoke_gemini_structured", side_effect=TimeoutError("Simulated Gemini timeout")):
        with patch("app.services.gemini_engine.settings.gemini_api_key", "fake-test-key"):
            r = client.post(
                "/api/v1/audits",
                headers={"X-Vexa-User-Id": "biz_kaya", "X-Vexa-Role": "BUSINESS"},
                data={"preset_key": "surat_wholesale", "workspace_mode": "SMB"},
            )
            assert r.status_code == 200
            assert r.json()["ai_report"]["generation_mode"] == "deterministic_fallback"
            assert len(r.json()["ai_report"]["top_bottlenecks"]) == 3
