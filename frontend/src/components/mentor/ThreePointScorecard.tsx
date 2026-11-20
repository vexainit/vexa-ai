import { CheckCircle2, Lock, RotateCcw } from 'lucide-react';
import type { RubricChecks } from '../../types/vexa';

const RUBRIC_ITEMS: { key: keyof RubricChecks; title: string; desc: string }[] = [
  {
    key: 'solves_core_bottleneck',
    title: '1. Addresses Core Bottleneck & Target Metric',
    desc: 'Directly moves the business’s stated success KPI rather than solving a tangential problem.',
  },
  {
    key: 'handles_edge_cases',
    title: '2. Handles Data Edge Cases Cleanly',
    desc: 'Null values, duplicate IDs, Indian date/INR formats, and malformed rows will not crash the pilot.',
  },
  {
    key: 'pilot_ready',
    title: '3. Safe & Ready for Business Pilot',
    desc: 'Zero hardcoded secrets, zero PII violations, and a walkthrough/demo usable by a non-technical owner.',
  },
];

export function ThreePointScorecard({
  checks,
  feedback,
  disabled,
  submitting,
  onChangeChecks,
  onChangeFeedback,
  onDecision,
}: {
  checks: RubricChecks;
  feedback: string;
  disabled?: boolean;
  submitting?: boolean;
  onChangeChecks: (next: RubricChecks) => void;
  onChangeFeedback: (next: string) => void;
  onDecision: (decision: 'APPROVED_CONNECTED' | 'REVISION_NEEDED') => void;
}) {
  const allChecked =
    checks.solves_core_bottleneck && checks.handles_edge_cases && checks.pilot_ready;
  const feedbackLen = feedback.trim().length;
  const canRequestRevision = !disabled && !submitting && feedbackLen >= 20;
  const canApprove = !disabled && !submitting && allChecked;

  return (
    <div className="vb-card p-5 space-y-4">
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-vb-border">
        <span className="vb-label text-vb-ink">3-Point Verification Scorecard (All 3 Required for Approval)</span>
        {disabled && (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-vb-revision">
            <Lock className="w-3 h-3" />
            Read-Only (Unverified Mentor)
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        {RUBRIC_ITEMS.map((item) => {
          const checked = checks[item.key];
          return (
            <label
              key={item.key}
              className={`flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors ${
                checked
                  ? 'border-vb-verified/50 bg-vb-verified-tint/35'
                  : 'border-vb-border bg-vb-canvas/50 hover:border-vb-teal/40'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <input
                type="checkbox"
                disabled={disabled}
                checked={checked}
                onChange={(e) => onChangeChecks({ ...checks, [item.key]: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-[#0F4C5C] rounded"
              />
              <div>
                <div className="text-xs font-semibold text-vb-ink">{item.title}</div>
                <div className="text-[11px] text-vb-muted mt-0.5">{item.desc}</div>
              </div>
            </label>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="vb-label">Mentor Endorsement / Actionable Revision Notes</label>
          <span
            className={`tabular-num text-[11px] ${
              feedbackLen < 20 ? 'text-vb-revision' : 'text-vb-verified'
            }`}
          >
            {feedbackLen} chars {feedbackLen < 20 ? '(min 20 for Revision)' : '✓'}
          </span>
        </div>
        <textarea
          rows={3}
          disabled={disabled}
          value={feedback}
          onChange={(e) => onChangeFeedback(e.target.value)}
          placeholder="Add endorsement note for the business owner, or specify exact edge-case fixes required before pilot handoff..."
          className="w-full px-3 py-2 text-xs rounded border border-vb-border bg-vb-surface text-vb-ink disabled:opacity-60"
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-vb-border">
        <button
          type="button"
          disabled={!canRequestRevision}
          onClick={() => onDecision('REVISION_NEEDED')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded border border-vb-revision bg-vb-revision-tint text-vb-revision text-xs font-semibold hover:bg-amber-200/70 disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Request Revision</span>
        </button>
        <button
          type="button"
          disabled={!canApprove}
          onClick={() => onDecision('APPROVED_CONNECTED')}
          className="inline-flex items-center gap-1.5 px-5 py-2 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Approve &amp; Connect to Business</span>
        </button>
      </div>
    </div>
  );
}
