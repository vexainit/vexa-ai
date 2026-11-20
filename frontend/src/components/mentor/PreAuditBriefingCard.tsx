import { AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { fitScoreTone } from '../../lib/formatters';
import type { MentorPreAudit } from '../../types/vexa';

export function PreAuditBriefingCard({ preAudit }: { preAudit: MentorPreAudit }) {
  const tone = fitScoreTone(preAudit.fit_score);

  return (
    <div className="vb-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-vb-border">
        <div>
          <span className="vb-label text-vb-ink">Gemini 2.5 Flash AI Pre-Audit Briefing</span>
          <div className="text-xs text-vb-muted mt-0.5">
            Non-binding triage briefing — human mentor holds final pilot authority.
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded border ${tone.bg} ${tone.border}`}>
          <span className={`tabular-num text-sm font-bold ${tone.text}`}>
            FIT: {preAudit.fit_score} / 100
          </span>
          <span className={`text-[10px] font-mono font-bold uppercase ${tone.text}`}>
            ({preAudit.recommendation.replace(/_/g, ' ')})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Key Strengths */}
        <div className="p-3.5 rounded bg-vb-verified-tint/50 border border-vb-verified/25">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase text-vb-verified mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Key Strengths</span>
          </div>
          <ul className="space-y-1.5 text-xs text-vb-ink">
            {preAudit.key_strengths.map((item, idx) => (
              <li key={idx} className="leading-snug">
                • {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Edge-Case & Security Risks */}
        <div className="p-3.5 rounded bg-vb-terracotta-tint/60 border border-vb-terracotta/25">
          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase text-vb-terracotta mb-2">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Edge-Case &amp; Security Risks</span>
          </div>
          <ul className="space-y-1.5 text-xs text-vb-ink">
            {preAudit.edge_case_risks.map((item, idx) => (
              <li key={idx} className="leading-snug">
                • {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Mentor Probe Question */}
      <div className="p-3 rounded bg-vb-canvas border border-vb-border flex items-start gap-2 text-xs">
        <HelpCircle className="w-4 h-4 text-vb-teal shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-vb-ink">Suggested Pilot Probe: </span>
          <span className="text-vb-muted">{preAudit.mentor_probe_question}</span>
        </div>
      </div>
    </div>
  );
}
