import { Link } from 'react-router-dom';
import { ArrowRight, Database, ShieldCheck, Users } from 'lucide-react';
import { formatINR } from '../../lib/formatters';
import type { ChallengeItem } from '../../types/vexa';

export function ChallengeCard({ item }: { item: ChallengeItem }) {
  const brief = item.challenge_brief;

  return (
    <div className="vb-card p-5 flex flex-col justify-between hover:border-vb-teal/50 transition-colors">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-vb-muted">
            <span className="px-2 py-0.5 rounded bg-vb-canvas border border-vb-border font-semibold text-vb-ink">
              {item.workspace_mode}
            </span>
            <span>{item.domain_category}</span>
            {item.scale_tier && <span>· {item.scale_tier} staff</span>}
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-vb-verified-tint text-vb-verified">
            <ShieldCheck className="w-3 h-3" />
            PII Verified
          </span>
        </div>

        <h3 className="font-display font-bold text-[16px] text-vb-ink leading-snug">
          {brief.challenge_title}
        </h3>
        <p className="text-xs text-vb-muted mt-1.5 line-clamp-2">{brief.problem_statement}</p>

        {/* Quantified Target Metric Pill */}
        <div className="mt-3 p-2.5 rounded bg-vb-terracotta-tint/60 border border-vb-terracotta/25 text-xs">
          <span className="font-semibold text-vb-terracotta">Target KPI: </span>
          <span className="text-vb-ink">{brief.target_kpi}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
          <span className="px-2 py-0.5 rounded bg-vb-teal-tint text-vb-teal font-semibold">
            {brief.expected_deliverable_type}
          </span>
          <span className="px-2 py-0.5 rounded bg-vb-canvas border border-vb-border text-vb-ink font-medium">
            {brief.difficulty}
          </span>
          {item.est_monthly_leak_inr > 0 && (
            <span className="tabular-num px-2 py-0.5 rounded bg-vb-canvas border border-vb-border text-vb-terracotta font-semibold">
              {formatINR(item.est_monthly_leak_inr)}/mo leak
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-vb-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 text-[11px] font-mono text-vb-muted tabular-num">
          <span className="inline-flex items-center gap-1">
            <Database className="w-3.5 h-3.5" />
            {item.row_count} rows
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {item.submission_count} builds
          </span>
        </div>
        <Link
          to={`/student/challenges/${item.id}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark transition-colors"
        >
          <span>Open Workspace</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
