import type { DiagnosticCase } from '../types/vexa';

export function buildMarkdownTickets(audit: DiagnosticCase): string {
  const { ai_report, title, target_metric } = audit;
  const brief = ai_report.challenge_brief;
  const quickWins = ai_report.improvement_roadmap.filter((r) => r.track === 'QUICK_WIN');
  const aiBuilds = ai_report.improvement_roadmap.filter((r) => r.track === 'AI_AUTOMATION_BUILD');

  const lines = [
    `# Vexa Bridge Execution Tickets — ${title}`,
    '',
    `> **Target Metric:** ${target_metric}`,
    `> **Health Score:** ${ai_report.health_score} / 100`,
    '',
    `## Priority Bottleneck #1 — ${brief.challenge_title}`,
    `- **Deliverable:** ${brief.expected_deliverable_type} (${brief.difficulty})`,
    `- **Target KPI:** ${brief.target_kpi}`,
    '',
    brief.problem_statement,
    '',
    '### Technical Requirements',
    ...brief.technical_requirements.map((r) => `- [ ] ${r}`),
    '',
    '### Acceptance Criteria',
    ...brief.evaluation_checklist.map((c) => `- [ ] ${c}`),
    '',
    '## Quick Wins (This Week, Zero Code)',
    ...quickWins.map((q) => `- [ ] **${q.title}** (${q.effort_estimate}) — ${q.expected_impact}`),
    '',
    '## Automation & AI Builds (High Leverage)',
    ...aiBuilds.map((a) => `- [ ] **${a.title}** (${a.effort_estimate}) — ${a.expected_impact}`),
    '',
  ];
  return lines.join('\n');
}

function csvEscape(v: string): string {
  const safe = v.replace(/"/g, '""');
  return `"${safe}"`;
}

export function buildCsvTickets(audit: DiagnosticCase): string {
  const { ai_report, target_metric } = audit;
  const brief = ai_report.challenge_brief;
  const rows: string[][] = [
    ['Summary', 'Issue Type', 'Priority', 'Labels', 'Description', 'Target KPI'],
    [
      brief.challenge_title,
      'Story',
      'Highest',
      `vexa-bridge,${brief.expected_deliverable_type.replace(/\s+/g, '-')}`,
      `${brief.problem_statement} | Requirements: ${brief.technical_requirements.join('; ')}`,
      brief.target_kpi || target_metric,
    ],
    ...ai_report.improvement_roadmap.map((a) => [
      a.title,
      'Task',
      a.track === 'QUICK_WIN' ? 'High' : 'Medium',
      a.track === 'QUICK_WIN' ? 'quick-win' : 'ai-automation-build',
      `Effort: ${a.effort_estimate}. Expected Impact: ${a.expected_impact}`,
      target_metric,
    ]),
  ];
  return rows.map((r) => r.map(csvEscape).join(',')).join('\n');
}

export function triggerTextDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
