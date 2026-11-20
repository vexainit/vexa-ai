import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Award, Check, Copy, ShieldCheck } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { ProofOfWorkCard } from '../../components/student/ProofOfWorkCard';
import { apiFetch } from '../../lib/api';
import type { PortfolioResponse } from '../../types/vexa';

export function PortfolioPage() {
  const { student_id = 'stu_aarav' } = useParams();
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['portfolio', student_id],
    queryFn: () => apiFetch<PortfolioResponse>(`/portfolio/${student_id}`),
  });

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {isLoading ? (
          <div className="vb-card p-8 h-40 animate-pulse" />
        ) : error || !data ? (
          <div className="vb-card p-8 text-center">
            <h1 className="font-display font-bold text-lg text-vb-ink">Portfolio Not Found</h1>
          </div>
        ) : (
          <>
            {/* Editorial Portfolio Header */}
            <div className="vb-card p-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono font-semibold text-vb-verified mb-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>PUBLIC READ-ONLY VERIFIED PROOF-OF-WORK CREDENTIAL</span>
                </div>
                <h1 className="font-display font-extrabold text-[28px] text-vb-ink">
                  {data.student.full_name}
                </h1>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {data.student.skills.map((skill) => (
                    <span
                      key={skill}
                      className="font-mono text-[11px] px-2.5 py-0.5 rounded bg-vb-canvas border border-vb-border text-vb-ink"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-right">
                  <div className="vb-label">Total Verified Builds</div>
                  <div className="tabular-num text-2xl font-bold text-vb-verified">
                    {data.student.total_verified_builds}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded border border-vb-teal bg-vb-teal-tint text-vb-teal text-xs font-semibold hover:bg-vb-teal hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Portfolio Link Copied' : 'Copy Shareable Portfolio Link'}</span>
                </button>
              </div>
            </div>

            {/* Verified Proof-of-Work Cards */}
            {data.verified_cards.length === 0 ? (
              <div className="vb-card p-10 text-center space-y-3">
                <Award className="w-9 h-9 text-vb-muted mx-auto" />
                <h2 className="font-display font-bold text-base text-vb-ink">
                  No Verified Proof-of-Work Cards Yet
                </h2>
                <p className="text-xs text-vb-muted max-w-md mx-auto">
                  Once a Verified Mentor approves a submitted draft via the 3-point scorecard, the Emerald Verified Proof-of-Work Card renders here immediately.
                </p>
                <Link
                  to="/student/challenges"
                  className="inline-block px-4 py-2 rounded bg-vb-teal text-white text-xs font-semibold"
                >
                  Pick an Open Challenge
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {data.verified_cards.map((card) => (
                  <ProofOfWorkCard key={card.id} card={card} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
