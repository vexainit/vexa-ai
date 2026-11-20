import { Award, CheckCircle2, ExternalLink, ShieldCheck } from 'lucide-react';
import { formatShortDate } from '../../lib/formatters';
import type { PortfolioCard } from '../../types/vexa';

export function ProofOfWorkCard({ card }: { card: PortfolioCard }) {
  return (
    <div className="vb-card overflow-hidden border-vb-verified/40">
      {/* Emerald Verified Credential Banner */}
      <div className="px-5 py-3 bg-vb-verified-tint border-b border-vb-verified/25 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-vb-verified font-semibold text-xs">
          <Award className="w-4 h-4" />
          <span>VERIFIED PROOF-OF-WORK CREDENTIAL</span>
        </div>
        <span className="tabular-num text-[11px] font-semibold px-2 py-0.5 rounded bg-vb-surface border border-vb-verified/30 text-vb-verified">
          {card.verification_code}
        </span>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-vb-teal-tint text-vb-teal font-semibold">
              {card.solution_type}
            </span>
            <h3 className="font-display font-bold text-lg text-vb-ink mt-1.5">{card.solution_title}</h3>
            <p className="text-xs text-vb-muted mt-1">{card.anonymized_impact}</p>
          </div>
          <div className="text-right">
            <div className="vb-label">AI Fit Score</div>
            <div className="tabular-num text-2xl font-bold text-vb-verified">{card.fit_score} / 100</div>
          </div>
        </div>

        {/* Quantified Result */}
        <div className="p-3 rounded bg-vb-canvas border border-vb-border text-xs text-vb-ink">
          <span className="vb-label block mb-1">Verified Outcome on Masked Dataset</span>
          {card.output_preview}
        </div>

        {/* 3-Point Mentor Verification Ticks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
          {[
            'Core Bottleneck & Target Metric',
            'Data Edge Cases Handled',
            'Safe & Pilot-Ready Demo',
          ].map((label) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-vb-verified-tint/60 text-vb-verified font-medium"
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{label}</span>
            </div>
          ))}
        </div>

        {card.mentor_feedback && (
          <blockquote className="pl-3 border-l-2 border-vb-teal text-xs text-vb-muted italic">
            “{card.mentor_feedback}” — <span className="not-italic font-semibold text-vb-ink">{card.reviewed_by_mentor_name || 'Verified Mentor'}</span>
          </blockquote>
        )}

        {/* Tech Stack + Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-vb-border">
          <div className="flex flex-wrap gap-1.5">
            {card.tech_stack.map((tag) => (
              <span key={tag} className="font-mono text-[11px] px-2 py-0.5 rounded bg-vb-canvas border border-vb-border text-vb-ink">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-vb-muted">
              <ShieldCheck className="w-3.5 h-3.5 text-vb-verified" />
              Approved {formatShortDate(card.approved_at)}
            </span>
            <a
              href={card.demo_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-vb-teal hover:underline"
            >
              <span>Live Demo</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
