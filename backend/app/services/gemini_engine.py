"""Google GenAI SDK (Gemini 2.5 Flash) Engine with Strict Pydantic Schemas & Deterministic Fallback (PRD Ch. 10)."""
from __future__ import annotations

import concurrent.futures
import json
import logging
import time
from typing import Any

from app.config import settings
from app.schemas import (
    BottleneckItem,
    ChallengeBrief,
    DiagnosticAndBriefResponse,
    MentorPreAuditResponse,
    PersonalSpendExtension,
    RoadmapAction,
)

logger = logging.getLogger("vexa.gemini")

MODE_SYSTEM_PROMPTS: dict[str, str] = {
    "SMB": (
        "Act as a pragmatic Indian SMB Operations & AI Architect. "
        "Translate Pandas delay/RTO/leak statistics into plain-English financial impact (INR). "
        "Derive challenge_brief strictly from Bottleneck #1 so a student builder can ship a working MVP on the masked CSV in 48 hours. "
        "NON-NEGOTIABLE RULES: (1) Cite ONLY numeric figures explicitly present in deterministic_stats_json — never invent currency amounts or row counts; "
        "(2) Write concise, plain operational English tailored to Indian business workflows; "
        "(3) Never output raw PII or placeholder tokens."
    ),
    "CAMPUS": (
        "Act as a Technical Hiring & Curriculum Architect. "
        "Frame challenge_brief as a standardized, unambiguous engineering assessment with concrete edge-case grading criteria and measurable acceptance tests. "
        "NON-NEGOTIABLE RULES: (1) Cite ONLY numeric figures explicitly present in deterministic_stats_json — never invent numbers; "
        "(2) Focus on schema validation, vectorized Pandas performance, null/date edge cases, and clean REST/UI separation; "
        "(3) Never output raw PII or placeholder tokens."
    ),
    "PERSONAL": (
        "Act as a Personal Finance Behavioral Analyst applying the S.P.E.N.D. Rubric "
        "(Small-ticket frequency, Peak-hour impulse, Ecosystem subscriptions, Needs vs. Wants, Daily cap). "
        "Populate personal_spend with a constructive behavioral archetype, 0-100 micro_leakage_score, and 7-day actionable checklist. "
        "NON-NEGOTIABLE RULES: (1) Cite ONLY numeric figures explicitly present in deterministic_stats_json; "
        "(2) Use calm, non-judgmental practical Indian UPI language; "
        "(3) Never output raw PII or UPI handles."
    ),
    "MENTOR_PREAUDIT": (
        "Act as a Senior Staff Engineer pre-screening a student build for an Indian SMB pilot. "
        "Compare architecture_summary and output_preview ruthlessly against challenge_brief. "
        "Penalize vague buzzwords, missing null/date edge-case handling, or lack of measurable KPI impact. "
        "Provide 2-3 concrete key_strengths, 2-3 specific edge_case_risks, and 1 sharp mentor_probe_question."
    ),
}


def _format_inr(amount: float) -> str:
    """Format number in Indian numbering style: INR 1,48,500."""
    n = int(round(amount))
    s = str(abs(n))
    if len(s) <= 3:
        formatted = s
    else:
        last3 = s[-3:]
        rest = s[:-3]
        parts = []
        while len(rest) > 2:
            parts.append(rest[-2:])
            rest = rest[:-2]
        if rest:
            parts.append(rest)
        formatted = ",".join(reversed(parts)) + "," + last3
    return f"INR {'-' if n < 0 else ''}{formatted}"


def _build_deterministic_diagnostic_fallback(
    workspace_mode: str,
    intake: dict[str, Any],
    stats: dict[str, Any],
) -> dict[str, Any]:
    """Guaranteed grounded report if Gemini API key is absent, times out (>8s), or fails."""
    mode = workspace_mode.upper()
    row_count = int(stats.get("row_count", 0))
    leak_inr = float(stats.get("est_monthly_leak_inr", 0.0))
    leak_str = _format_inr(leak_inr)
    hours_lost = float(stats.get("est_manual_hours_lost", 0.0))
    peak_seg = str(stats.get("peak_bottleneck_segment", "Core Operational Segment"))
    org_name = str(intake.get("organization_or_profile_name", "Indian SMB Workspace"))
    domain = str(intake.get("domain_category", "Retail/D2C"))
    scale = str(intake.get("scale_tier", "6-20 staff"))
    tools = ", ".join(intake.get("current_tools") or ["Excel", "WhatsApp"])
    target = str(intake.get("target_success_metric", "Reduce operational leakage by 35% in 30 days"))

    if mode == "PERSONAL":
        micro_cnt = int(stats.get("micro_txn_count", 0))
        micro_sum = float(stats.get("micro_txn_sum_inr", 0.0))
        late_pct = float(stats.get("late_night_impulse_pct", 0.0))
        rec_cnt = int(stats.get("recurring_sub_count", 0))
        rec_drain = float(stats.get("recurring_drain_inr", 0.0))
        micro_score = min(95, max(25, int(35 + (micro_cnt * 0.4) + (late_pct * 0.5))))
        health_score = max(25, min(88, 100 - int(micro_score * 0.55)))

        resp = DiagnosticAndBriefResponse(
            health_score=health_score,
            executive_summary=[
                f"Analyzed {row_count} UPI transactions over 30 days: {micro_cnt} micro-transactions under INR 300 totaled {_format_inr(micro_sum)} in fragmented discretionary spend.",
                f"{late_pct}% of food delivery spending occurred between 22:00 and 04:00 IST, representing the highest controllable behavioral leak.",
                f"{rec_cnt} recurring auto-pay subscriptions drained {_format_inr(rec_drain)}/month with low visibility.",
            ],
            top_bottlenecks=[
                BottleneckItem(
                    rank=1,
                    title="High-Velocity Micro-Transaction Leakage (<INR 300)",
                    root_cause=f"{micro_cnt} small-ticket UPI taps bypass mental budget friction and silently accumulate.",
                    quantified_leak=f"{_format_inr(micro_sum)} / month ({micro_cnt} transactions)",
                    urgency="CRITICAL",
                    affected_segment="Snacks, Coffee & Quick-Commerce UPI Debits",
                ),
                BottleneckItem(
                    rank=2,
                    title="Late-Night Food Delivery Impulse Window (22:00–04:00 IST)",
                    root_cause="Unplanned late-night ordering increases delivery fees and convenience markups.",
                    quantified_leak=f"{late_pct}% late-night food delivery share",
                    urgency="HIGH",
                    affected_segment="Late-Night Food Delivery",
                ),
                BottleneckItem(
                    rank=3,
                    title="Forgotten Recurring UPI Autopay Mandates",
                    root_cause="Active autopay mandates continue renewing without monthly utilization checks.",
                    quantified_leak=f"{_format_inr(rec_drain)} / month ({rec_cnt} recurring debits)",
                    urgency="MEDIUM",
                    affected_segment="Subscriptions & Autopay",
                ),
            ],
            improvement_roadmap=[
                RoadmapAction(
                    title=f"Audit and pause {rec_cnt} recurring UPI Autopay mandates",
                    track="QUICK_WIN",
                    effort_estimate="15 minutes",
                    expected_impact=f"Immediate {_format_inr(rec_drain)}/month savings",
                ),
                RoadmapAction(
                    title="Set a hard INR 250 daily UPI Lite pocket & mute late-night food alerts",
                    track="QUICK_WIN",
                    effort_estimate="10 minutes",
                    expected_impact="Cuts impulse micro-spend velocity by 30-40%",
                ),
                RoadmapAction(
                    title="Automated Weekly UPI S.P.E.N.D. Alert Bot",
                    track="AI_AUTOMATION_BUILD",
                    effort_estimate="1-day build",
                    expected_impact="Flags threshold breaches before month-end drift",
                ),
            ],
            challenge_brief=ChallengeBrief(
                challenge_title="Personal S.P.E.N.D. Micro-Leakage Tracker & Alert Utility",
                anonymized_context=f"Personal Consumer UPI Profile ({domain}, {scale}) using {tools}.",
                problem_statement=f"{micro_cnt} micro-transactions under INR 300 totaled {_format_inr(micro_sum)}/month alongside {late_pct}% late-night food delivery orders. Build a local-first parser that flags impulse clusters and autopay drains.",
                expected_deliverable_type="Data Analytics",
                difficulty="Beginner",
                target_kpi=target,
                technical_requirements=[
                    "Parse anonymized 30-day UPI CSV with IST timestamps and INR amounts",
                    "Identify recurring merchant+amount mandates and 22:00-04:00 impulse clusters",
                    "Output a 7-day actionable budget cap summary and category breakdown",
                ],
                evaluation_checklist=[
                    "Handles mixed timestamp strings and missing category labels cleanly",
                    "Accurately reproduces deterministic micro-transaction totals",
                    "Zero raw UPI handles or personal identifiers exposed",
                ],
            ),
            personal_spend=PersonalSpendExtension(
                behavioral_archetype="Late-Night Convenience Micro-Spender",
                micro_leakage_score=micro_score,
                seven_day_fix_checklist=[
                    f"Day 1: Audit and pause the {rec_cnt} recurring UPI Autopay mandates (saves {_format_inr(rec_drain)}/mo).",
                    "Day 2: Set a hard INR 250 daily UPI Lite pocket for coffee/snacks.",
                    "Day 3: Disable food-delivery push notifications after 21:30 IST.",
                    "Day 4: Batch quick-commerce grocery orders to twice weekly to eliminate delivery fees.",
                    "Day 5: Review weekly micro-spend sum against your INR 1,500 target cap.",
                    "Day 6: Move saved subscription amount to a dedicated recurring deposit.",
                    "Day 7: Re-upload next week's UPI export to verify Micro-Leakage Score drop below 40.",
                ],
            ),
        )
    else:
        delayed_pct = float(stats.get("delayed_order_pct", 0.0))
        rto_pct = float(stats.get("cod_rto_pct", 0.0))
        delayed_cnt = int(stats.get("delayed_count", 0))
        return_cnt = int(stats.get("return_count", 0))
        missing_pct = float(stats.get("missing_cell_pct", 0.0))

        penalty = int(delayed_pct * 0.9 + rto_pct * 1.15 + missing_pct * 0.5)
        health_score = max(28, min(88, 96 - penalty))

        is_rto_primary = rto_pct >= 10.0
        b1_title = (
            "Unverified Tier-2 COD Return-to-Origin (RTO) Spike"
            if is_rto_primary
            else "WhatsApp Inquiry Response SLA Breach (>24h Wait)"
        )
        b1_cause = (
            f"COD orders in {peak_seg} ship without automated buyer confirmation, driving {rto_pct}% RTO across {row_count} orders."
            if is_rto_primary
            else f"{delayed_pct}% of inquiries ({delayed_cnt} records) wait over 24 hours for a first reply in {peak_seg}, collapsing lead conversion."
        )
        b1_leak = (
            f"{leak_str} / month ({rto_pct}% RTO + {delayed_pct}% delayed across {row_count} rows)"
            if is_rto_primary
            else f"{leak_str} / month ({delayed_pct}% slow responses across {row_count} inquiries)"
        )
        deliverable: Any = "AI Agent" if is_rto_primary else "Automation"
        challenge_title = (
            "Build an Automated COD Risk-Scoring & Buyer Confirmation Workflow"
            if is_rto_primary
            else "Build a WhatsApp Lead SLA Auto-Responder & Quote Routing Agent"
        )
        if mode == "CAMPUS":
            challenge_title = f"[Campus Rubric] {challenge_title}"

        resp = DiagnosticAndBriefResponse(
            health_score=health_score,
            executive_summary=[
                f"Out of {row_count} operational records analyzed, {delayed_pct}% ({delayed_cnt} rows) breached promised turnaround SLAs, peaking in {peak_seg}.",
                (
                    f"Return-to-Origin / cancellations stand at {rto_pct}% ({return_cnt} rows), driving an estimated {leak_str} in monthly operational leakage."
                    if is_rto_primary
                    else f"Slow inquiry follow-ups and manual quoting drive an estimated {leak_str} in monthly missed pipeline value."
                ),
                f"Manual exception tracking across {tools} accounts for roughly {hours_lost} lost staff hours per month (6 min/exception baseline).",
            ],
            top_bottlenecks=[
                BottleneckItem(
                    rank=1,
                    title=b1_title,
                    root_cause=b1_cause,
                    quantified_leak=b1_leak,
                    urgency="CRITICAL",
                    affected_segment=peak_seg,
                ),
                BottleneckItem(
                    rank=2,
                    title="Peak-Window Dispatch & Queue Congestion",
                    root_cause=f"Manual handoffs between {tools} create queuing backlogs whenever volume spikes in {peak_seg}.",
                    quantified_leak=f"{delayed_pct}% SLA breach rate ({delayed_cnt} delayed rows)",
                    urgency="HIGH",
                    affected_segment=peak_seg,
                ),
                BottleneckItem(
                    rank=3,
                    title="Missing Fields & Manual Exception Rework",
                    root_cause=f"{missing_pct}% missing cells and unvalidated manual spreadsheet entries trigger repetitive staff follow-ups.",
                    quantified_leak=f"{hours_lost} staff hours lost / month",
                    urgency="MEDIUM",
                    affected_segment="Operations & Support Desk",
                ),
            ],
            improvement_roadmap=[
                RoadmapAction(
                    title="Enforce mandatory pre-dispatch WhatsApp confirmation checklist on high-risk orders"
                    if is_rto_primary
                    else "Deploy instant WhatsApp template acknowledgment & SKU rate-card reply within 15 minutes",
                    track="QUICK_WIN",
                    effort_estimate="2 hours (SOP change)",
                    expected_impact="Immediate 20-25% reduction in avoidable operational leakage",
                ),
                RoadmapAction(
                    title="Standardize daily CSV column template & mandatory status validation dropdowns",
                    track="QUICK_WIN",
                    effort_estimate="3 hours",
                    expected_impact=f"Eliminates {missing_pct}% missing-field rework immediately",
                ),
                RoadmapAction(
                    title="Build AutoCOD Gemini Confirmation & Risk-Scoring Agent"
                    if is_rto_primary
                    else "Build WhatsApp Lead SLA Triage & Auto-Quoter with Gemini 2.5 Flash",
                    track="AI_AUTOMATION_BUILD",
                    effort_estimate="48-hour Builder Sprint",
                    expected_impact=f"Targets {target} and cuts manual triage by 70%",
                ),
                RoadmapAction(
                    title="Automated Exception Digest Dashboard for Operations Lead",
                    track="AI_AUTOMATION_BUILD",
                    effort_estimate="2-day build",
                    expected_impact=f"Recovers up to {hours_lost} manual staff hours/month",
                ),
            ],
            challenge_brief=ChallengeBrief(
                challenge_title=challenge_title,
                anonymized_context=f"Indian {domain} organization ({scale}) running operations on {tools}.",
                problem_statement=(
                    f"{b1_cause} Total estimated leakage is {leak_str}/month with {hours_lost} lost hours. "
                    f"Build a lightweight tool that ingests daily operational CSVs matching the anonymized schema, flags high-risk rows deterministically, and uses Gemini 2.5 Flash to automate multilingual buyer triage."
                ),
                expected_deliverable_type=deliverable,
                difficulty="Intermediate",
                target_kpi=target,
                technical_requirements=[
                    "Accept daily operational CSV matching the anonymized schema with graceful null & Indian date/currency handling",
                    "Score operational risk deterministically using order value, segment, repeat customer hash (CUST_*), and SLA timestamps",
                    "Use Gemini 2.5 Flash structured JSON output to classify simulated English/Hindi/Gujarati customer replies",
                    "Export a clean action queue CSV separating Approved, Hold/Follow-up, and Escalate queues",
                ],
                evaluation_checklist=[
                    "Zero crashes on missing timestamps, duplicate IDs, or INR currency strings",
                    "Demonstrates measurable precision/recall or SLA recovery on the masked CSV",
                    "Includes live web UI or clean CLI demo usable by a non-technical operations manager",
                ],
            ),
            personal_spend=None,
        )

    payload = resp.model_dump()
    payload["generation_mode"] = "deterministic_fallback"
    return payload


def _build_deterministic_preaudit_fallback(
    challenge_brief: dict[str, Any],
    submission: dict[str, Any],
) -> dict[str, Any]:
    """Deterministic scoring fallback if Gemini times out or key is unconfigured."""
    arch = str(submission.get("architecture_summary", ""))
    out = str(submission.get("output_preview", ""))
    demo = str(submission.get("demo_url", ""))
    stack = submission.get("tech_stack") or []

    score = 55
    strengths: list[str] = []
    risks: list[str] = []

    if any(k in arch.lower() for k in ("deterministic", "pandas", "risk", "sla", "rto", "rule")):
        score += 12
        strengths.append("Separates deterministic operational scoring from LLM reasoning to prevent hallucinated math.")
    if any(k in (arch + " ".join(stack)).lower() for k in ("gemini", "google", "cloud run", "fastapi")):
        score += 10
        strengths.append("Uses Google AI / Cloud-native stack well suited for low-latency SMB pilot deployment.")
    if any(ch.isdigit() for ch in out) and ("%" in out or "inr" in out.lower() or "₹" in out or "row" in out.lower()):
        score += 11
        strengths.append("Provides quantified validation metrics measured directly on the masked dataset.")
    else:
        risks.append("Output preview lacks quantified precision/recall or INR leak reduction figures on the masked CSV.")

    if not any(k in arch.lower() for k in ("null", "missing", "fallback", "edge", "duplicate", "encoding")):
        risks.append("Architecture summary does not explicitly detail handling of null dates, missing pin codes, or cp1252 CSVs.")
    else:
        score += 5

    if "https://" not in demo.lower():
        score -= 10
        risks.append("Demo URL does not use HTTPS; verify accessibility for non-technical business owners.")

    if not strengths:
        strengths.append("Directly addresses the scoped challenge deliverable with a structured technical stack.")
    if len(strengths) < 2:
        strengths.append(f"Targeted deliverable ({submission.get('solution_type')}) aligns with the challenge brief.")
    if not risks:
        risks.append("Verify fallback behavior when customers reply in regional Gujarati/Hindi transliteration.")
        risks.append("Confirm graceful handling of rows with missing timestamps or unexpected column order.")

    score = max(35, min(95, score))
    if score >= 80:
        rec = "STRONG_CANDIDATE"
    elif score >= 60:
        rec = "NEEDS_MINOR_REVISION"
    else:
        rec = "MAJOR_GAPS"

    return MentorPreAuditResponse(
        fit_score=score,
        recommendation=rec,
        key_strengths=strengths[:3],
        edge_case_risks=risks[:3],
        mentor_probe_question=(
            f"How does your workflow gracefully handle missing timestamps or non-responsive buyers for '{challenge_brief.get('challenge_title', 'this bottleneck')}'?"
        ),
    ).model_dump()


def _invoke_gemini_structured(
    system_instruction: str,
    user_payload_json: str,
    response_schema: type,
    timeout_sec: float,
) -> dict[str, Any]:
    from google import genai
    from google.genai import types

    def _call() -> dict[str, Any]:
        client = genai.Client(api_key=settings.gemini_api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=user_payload_json,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                response_mime_type="application/json",
                response_schema=response_schema,
                temperature=0.2,
                max_output_tokens=2048,
            ),
        )
        if getattr(response, "parsed", None) is not None:
            return response.parsed.model_dump()
        return response_schema.model_validate_json(response.text).model_dump()

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        fut = pool.submit(_call)
        return fut.result(timeout=timeout_sec)


def generate_diagnostic_and_brief(
    workspace_mode: str,
    intake: dict[str, Any],
    deterministic_stats: dict[str, Any],
) -> tuple[dict[str, Any], int]:
    """Run Gemini 2.5 Flash with 8s timeout + 1 retry; emit deterministic fallback on failure."""
    t0 = time.perf_counter()
    mode = workspace_mode.upper()
    if not settings.gemini_api_key or settings.gemini_api_key == "your_gemini_api_key_here":
        fallback = _build_deterministic_diagnostic_fallback(mode, intake, deterministic_stats)
        return fallback, int((time.perf_counter() - t0) * 1000)

    user_payload = json.dumps(
        {
            "workspace_mode": mode,
            "intake_context": intake,
            "deterministic_stats_json": deterministic_stats,
        },
        ensure_ascii=False,
    )
    sys_prompt = MODE_SYSTEM_PROMPTS.get(mode, MODE_SYSTEM_PROMPTS["SMB"])

    for attempt in range(2):
        try:
            result = _invoke_gemini_structured(
                system_instruction=sys_prompt,
                user_payload_json=user_payload,
                response_schema=DiagnosticAndBriefResponse,
                timeout_sec=settings.gemini_timeout_seconds,
            )
            result["generation_mode"] = "gemini_2_5_flash"
            return result, int((time.perf_counter() - t0) * 1000)
        except Exception as exc:
            logger.warning("Gemini diagnostic attempt %d failed: %s", attempt + 1, exc)

    fallback = _build_deterministic_diagnostic_fallback(mode, intake, deterministic_stats)
    return fallback, int((time.perf_counter() - t0) * 1000)


def generate_mentor_preaudit(
    challenge_brief: dict[str, Any],
    submission: dict[str, Any],
) -> dict[str, Any]:
    """Run Gemini 2.5 Flash Mentor AI Pre-Audit with deterministic fallback."""
    if not settings.gemini_api_key or settings.gemini_api_key == "your_gemini_api_key_here":
        return _build_deterministic_preaudit_fallback(challenge_brief, submission)

    user_payload = json.dumps(
        {
            "challenge_brief": challenge_brief,
            "student_submission": submission,
        },
        ensure_ascii=False,
    )
    for attempt in range(2):
        try:
            return _invoke_gemini_structured(
                system_instruction=MODE_SYSTEM_PROMPTS["MENTOR_PREAUDIT"],
                user_payload_json=user_payload,
                response_schema=MentorPreAuditResponse,
                timeout_sec=settings.gemini_timeout_seconds,
            )
        except Exception as exc:
            logger.warning("Gemini mentor pre-audit attempt %d failed: %s", attempt + 1, exc)

    return _build_deterministic_preaudit_fallback(challenge_brief, submission)
