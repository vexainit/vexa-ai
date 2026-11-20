import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, Handshake } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useRole } from '../../context/RoleContext';
import { apiFetch } from '../../lib/api';
import { formatINR } from '../../lib/formatters';
import type { DiagnosticCase } from '../../types/vexa';

export function BusinessPilotsPage() {
  const { session } = useRole();

  const { data, isLoading } = useQuery({
    queryKey: ['audits', session.userId],
    queryFn: () => apiFetch<{ audits: DiagnosticCase[] }>('/audits'),
    enabled: session.role === 'BUSINESS' || session.role === 'ADMIN',
  });

  const publishedAudits = (data?.audits ?? []).filter((a) => a.is_published_to_builders || a.status === 'PILOT_MATCHED');

  return (
    <AppShell title="Pilots and matched solutions">
      <div className="space-y-6">
        <div>
          <h1 className="font-display font-bold text-xl text-vb-ink">Active builder challenges and pilot handoffs</h1>
          <p className="text-sm text-vb-muted mt-1">
            Review incoming mentor-verified solutions across all published bottlenecks and schedule 15-minute pilot handoffs.
          </p>
        </div>

        {isLoading ? (
          <div className="vb-card p-8 h-40 animate-pulse" />
        ) : publishedAudits.length === 0 ? (
          <div className="vb-card p-10 text-center space-y-3">
            <Handshake className="w-8 h-8 text-vb-muted mx-auto" />
            <h2 className="font-display font-bold text-base text-vb-ink">No published challenges yet</h2>
            <p className="text-sm text-vb-muted max-w-md mx-auto">
              Run an operational audit, inspect the PII Shield Diff Drawer, and publish Bottleneck #1 to receive mentor-vetted builds.
            </p>
            <Link
              to="/business/new-audit"
              className="inline-block px-4 py-2 rounded-md bg-vb-teal text-white text-sm font-medium"
            >
              Run new audit
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {publishedAudits.map((audit) => (
              <div key={audit.id} className="vb-card p-5 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-vb-canvas border border-vb-border">
                      {audit.workspace_mode}
                    </span>
                    {audit.status === 'PILOT_MATCHED' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded bg-vb-verified-tint text-vb-verified">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Pilot scheduled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded bg-vb-teal-tint text-vb-teal">
                        <Clock className="w-3.5 h-3.5" />
                        Accepting builds
                      </span>
                    )}
                  </div>
                  <h2 className="font-display font-bold text-base text-vb-ink">{audit.title}</h2>
                  <p className="text-sm text-vb-muted">{audit.ai_report?.challenge_brief?.challenge_title}</p>
                  <div className="text-sm tabular-num font-semibold text-vb-terracotta">
                    {formatINR(audit.deterministic_stats.est_monthly_leak_inr)}/mo quantified leak
                  </div>
                </div>

                <div className="pt-3 border-t border-vb-border flex items-center justify-between gap-3 text-sm">
                  <div className="tabular-num text-xs">
                    <span className="text-vb-verified font-semibold">{audit.submission_counts.approved} approved</span>
                    {', '}
                    <span className="text-vb-muted">{audit.submission_counts.pending} in review</span>
                  </div>
                  <Link
                    to={`/business/audits/${audit.id}/solutions`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-vb-teal hover:underline"
                  >
                    <span>Manage handoff</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
