"""End-to-End Acceptance Suite with Real 4-Role Auth, Role Credentials, Admin DB Control & TC-01..TC-06."""
from __future__ import annotations

import json
from unittest.mock import patch

from app.config import settings


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_full_4_role_auth_lifecycle_and_admin_db_control(client):
    # 1. Register Business with CIN/GSTIN + Incorporation Certificate upload
    r_biz = client.post(
        "/api/v1/auth/register",
        data={
            "full_name": "Kaya Looms Founder",
            "email": "founder@kayalooms.in",
            "password": "Password123!",
            "role": "BUSINESS",
            "domain_tags": json.dumps(["Retail/D2C", "Apparel"]),
            "profile_meta": json.dumps({
                "company_name": "Kaya Looms Pvt Ltd",
                "cin_or_gstin": "24AABCK1234F1Z5",
                "business_domain": "Retail/D2C",
                "scale_tier": "6-20",
            }),
        },
        files={"incorporation_certificate": ("kaya_incorp.pdf", b"%PDF-1.4 fake cert content", "application/pdf")},
    )
    assert r_biz.status_code == 201
    biz_token = r_biz.json()["access_token"]
    biz_id = r_biz.json()["user"]["id"]
    assert r_biz.json()["user"]["profile_meta"]["has_incorporation_cert"] is True

    # 2. Register Student with College & Graduation Year
    r_stu = client.post(
        "/api/v1/auth/register",
        data={
            "full_name": "Aarav Mehta",
            "email": "aarav@iitgn.ac.in",
            "password": "Password123!",
            "role": "STUDENT",
            "domain_tags": json.dumps(["Python", "FastAPI", "Gemini 2.5 Flash"]),
            "profile_meta": json.dumps({
                "college_name": "IIT Gandhinagar",
                "student_id_number": "22110045",
                "degree_branch": "B.Tech CSE",
                "graduation_year": "2026",
                "github_url": "https://github.com/aarav-demo",
            }),
        },
    )
    assert r_stu.status_code == 201
    stu_token = r_stu.json()["access_token"]
    stu_id = r_stu.json()["user"]["id"]

    # 3. Register Mentor with Org & Title (defaults to is_verified = False)
    r_men = client.post(
        "/api/v1/auth/register",
        data={
            "full_name": "Priya Shah",
            "email": "priya@staffeng.in",
            "password": "Password123!",
            "role": "MENTOR",
            "domain_tags": json.dumps(["AI Architecture", "Cloud Run"]),
            "profile_meta": json.dumps({
                "organization": "CloudScale India",
                "job_title": "Staff AI Architect",
                "years_experience": "9",
                "linkedin_url": "https://linkedin.com/in/priya-demo",
            }),
        },
    )
    assert r_men.status_code == 201
    men_token = r_men.json()["access_token"]
    men_id = r_men.json()["user"]["id"]
    assert r_men.json()["user"]["is_verified"] is False

    # 4. Login Bootstrap Admin
    r_adm = client.post(
        "/api/v1/auth/login",
        json={
            "email": settings.admin_bootstrap_email,
            "password": settings.admin_bootstrap_password,
            "expected_role": "ADMIN",
        },
    )
    assert r_adm.status_code == 200
    adm_token = r_adm.json()["access_token"]

    # Admin can download Business Incorporation Certificate; Student CANNOT (403)
    assert client.get(f"/api/v1/auth/certificate/{biz_id}", headers=_auth_header(adm_token)).status_code == 200
    assert client.get(f"/api/v1/auth/certificate/{biz_id}", headers=_auth_header(stu_token)).status_code == 403

    # 5. Business runs SMB + PERSONAL audits (TC-01)
    r_smb = client.post(
        "/api/v1/audits",
        headers=_auth_header(biz_token),
        data={"preset_key": "ahmedabad_d2c", "workspace_mode": "SMB"},
    )
    assert r_smb.status_code == 200
    case_id = r_smb.json()["id"]
    assert r_smb.json()["latency_ms"] < 5000

    r_pers = client.post(
        "/api/v1/audits",
        headers=_auth_header(biz_token),
        data={"preset_key": "personal_upi_30d", "workspace_mode": "PERSONAL"},
    )
    assert r_pers.status_code == 200
    assert r_pers.json()["ai_report"]["personal_spend"] is not None

    # Business inspects PII Diff & Publishes
    assert client.get(f"/api/v1/audits/{case_id}/pii-diff", headers=_auth_header(biz_token)).status_code == 200
    assert (
        client.patch(
            f"/api/v1/audits/{case_id}/publish",
            headers=_auth_header(biz_token),
            json={"is_published_to_builders": True},
        ).status_code
        == 200
    )

    # 6. Student downloads masked dataset (0 PII) & blocked from /pii-diff (403)
    r_csv = client.get(f"/api/v1/challenges/{case_id}/dataset", headers=_auth_header(stu_token))
    assert r_csv.status_code == 200
    assert "Rohan Patel" not in r_csv.text
    assert "CUST_" in r_csv.text
    assert client.get(f"/api/v1/audits/{case_id}/pii-diff", headers=_auth_header(stu_token)).status_code == 403

    # 7. Student submits solution draft
    r_sub = client.post(
        "/api/v1/submissions",
        headers=_auth_header(stu_token),
        json={
            "case_id": case_id,
            "solution_title": "AutoCOD Confirmation Agent",
            "solution_type": "AI Agent",
            "tech_stack": ["Python", "Gemini 2.5 Flash", "FastAPI"],
            "architecture_summary": (
                "Deterministic Tier-2 COD risk scoring paired with Gemini 2.5 Flash multilingual confirmation "
                "classification with null-safe pin code and Indian INR currency handling."
            ),
            "demo_url": "https://autocod-demo.run.app",
            "output_preview": "Flagged 86% of historical RTO orders across 500 masked rows with INR 98,400/mo projected recovery.",
        },
    )
    assert r_sub.status_code == 201
    sub_id = r_sub.json()["id"]

    # 8. Unverified Mentor rejected (403), then Admin verifies Mentor, then 2/3 checks rejected (400), then 3/3 Approved (200)
    assert (
        client.patch(
            f"/api/v1/reviews/{sub_id}",
            headers=_auth_header(men_token),
            json={
                "decision": "APPROVED_CONNECTED",
                "rubric_checks": {"solves_core_bottleneck": True, "handles_edge_cases": True, "pilot_ready": True},
                "mentor_feedback": "Ready for pilot.",
            },
        ).status_code
        == 403
    )

    assert (
        client.patch(
            f"/api/v1/admin/users/{men_id}",
            headers=_auth_header(adm_token),
            json={"is_verified": True},
        ).status_code
        == 200
    )

    assert (
        client.patch(
            f"/api/v1/reviews/{sub_id}",
            headers=_auth_header(men_token),
            json={
                "decision": "APPROVED_CONNECTED",
                "rubric_checks": {"solves_core_bottleneck": True, "handles_edge_cases": False, "pilot_ready": True},
                "mentor_feedback": "Edge cases missing.",
            },
        ).status_code
        == 400
    )

    r_app = client.patch(
        f"/api/v1/reviews/{sub_id}",
        headers=_auth_header(men_token),
        json={
            "decision": "APPROVED_CONNECTED",
            "rubric_checks": {"solves_core_bottleneck": True, "handles_edge_cases": True, "pilot_ready": True},
            "mentor_feedback": "Verified edge-case handling and pilot-ready workflow.",
        },
    )
    assert r_app.status_code == 200
    assert r_app.json()["status"] == "APPROVED_CONNECTED"

    # 9. Admin Database Explorer across all 4 live tables
    for tbl in ("users", "diagnostic_cases", "builder_submissions", "system_audit_logs"):
        r_tbl = client.get(f"/api/v1/admin/database/{tbl}", headers=_auth_header(adm_token))
        assert r_tbl.status_code == 200
        assert r_tbl.json()["total_rows"] >= 1

    # 10. Public portfolio reflects real approved build
    r_port = client.get(f"/api/v1/portfolio/{stu_id}")
    assert r_port.status_code == 200
    assert r_port.json()["student"]["total_verified_builds"] == 1

    # 11. TC-06 Gemini Timeout Fallback
    with patch("app.services.gemini_engine._invoke_gemini_structured", side_effect=TimeoutError("Timeout")):
        with patch("app.services.gemini_engine.settings.gemini_api_key", "fake-key"):
            r_fb = client.post(
                "/api/v1/audits",
                headers=_auth_header(biz_token),
                data={"preset_key": "surat_wholesale", "workspace_mode": "SMB"},
            )
            assert r_fb.status_code == 200
            assert r_fb.json()["ai_report"]["generation_mode"] == "deterministic_fallback"
