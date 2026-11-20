"""Self-Serve Ticket Exporter — Markdown (Notion/Linear) & CSV (Jira/Trello) (PRD Ch. 4.5 & 17.5)."""
from __future__ import annotations

import csv
import io
from typing import Any


def generate_tickets_markdown(case_title: str, ai_report: dict[str, Any], target_metric: str) -> str:
    brief = ai_report.get("challenge_brief", {})
    roadmap = ai_report.get("improvement_roadmap", [])
    bottlenecks = ai_report.get("top_bottlenecks", [])

    quick_wins = [r for r in roadmap if r.get("track") == "QUICK_WIN"]
    ai_builds = [r for r in roadmap if r.get("track") == "AI_AUTOMATION_BUILD"]

    lines = [
        f"# Vexa Bridge Execution Tickets — {case_title}",
        "",
        f"> **Target Success Metric:** {target_metric}",
        f"> **Operational Health Score:** {ai_report.get('health_score', 'N/A')} / 100",
        "",
        "## Priority Bottleneck #1 — Scoped Builder Brief",
        f"### {brief.get('challenge_title', 'Core Operational Bottleneck Fix')}",
        f"- **Deliverable Type:** {brief.get('expected_deliverable_type', 'Automation')}",
        f"- **Difficulty:** {brief.get('difficulty', 'Intermediate')}",
        f"- **Target KPI:** {brief.get('target_kpi', target_metric)}",
        "",
        brief.get("problem_statement", ""),
        "",
        "### Technical Requirements",
    ]
    for req in brief.get("technical_requirements", []):
        lines.append(f"- [ ] {req}")

    lines.extend(["", "### Acceptance & Evaluation Checklist"])
    for chk in brief.get("evaluation_checklist", []):
        lines.append(f"- [ ] {chk}")

    lines.extend(["", "## Immediate Quick Wins (This Week, Zero Code)"])
    for item in quick_wins:
        lines.append(
            f"- [ ] **{item.get('title')}** *(Effort: {item.get('effort_estimate')})* — {item.get('expected_impact')}"
        )

    lines.extend(["", "## Automation & AI Builds (High Leverage)"])
    for item in ai_builds:
        lines.append(
            f"- [ ] **{item.get('title')}** *(Effort: {item.get('effort_estimate')})* — {item.get('expected_impact')}"
        )

    if bottlenecks:
        lines.extend(["", "## Ranked Bottlenecks Reference"])
        for b in bottlenecks:
            lines.append(
                f"{b.get('rank')}. **[{b.get('urgency')}] {b.get('title')}** — {b.get('quantified_leak')} (*{b.get('affected_segment')}*)"
            )

    return "\n".join(lines) + "\n"


def generate_tickets_csv(case_title: str, ai_report: dict[str, Any], target_metric: str) -> str:
    """Exact Jira/Trello columns: Summary,Issue Type,Priority,Labels,Description,Target KPI (PRD Ch. 17.5)."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Summary", "Issue Type", "Priority", "Labels", "Description", "Target KPI"])

    brief = ai_report.get("challenge_brief", {})
    reqs = "; ".join(brief.get("technical_requirements", []))
    checks = "; ".join(brief.get("evaluation_checklist", []))
    writer.writerow([
        brief.get("challenge_title", f"{case_title} — Core Bottleneck Fix"),
        "Story",
        "Highest",
        f"vexa-bridge,{brief.get('expected_deliverable_type', 'AI-Agent').replace(' ', '-')}",
        f"{brief.get('problem_statement', '')} | Requirements: {reqs} | Acceptance: {checks}",
        brief.get("target_kpi", target_metric),
    ])

    for action in ai_report.get("improvement_roadmap", []):
        is_quick = action.get("track") == "QUICK_WIN"
        writer.writerow([
            action.get("title", ""),
            "Task",
            "High" if is_quick else "Medium",
            "quick-win" if is_quick else "ai-automation-build",
            f"Effort: {action.get('effort_estimate', '')}. Expected Impact: {action.get('expected_impact', '')}",
            target_metric,
        ])

    return buf.getvalue()
