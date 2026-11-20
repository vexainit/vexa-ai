import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, FilePlus2, ShieldCheck } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { DemoPresetBar } from '../../components/business/DemoPresetBar';
import { useRole } from '../../context/RoleContext';
import { apiFetch } from '../../lib/api';
import { formatINR, formatShortDate, healthScoreTone } from '../../lib/formatters';
import type { DiagnosticCase } from '../../types/vexa';

export function BusinessHome() {
  const { session } = useRole();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audits', session.userId],
    queryFn: () =>
      apiFetch<{ audits: DiagnosticCase[] }>('/audits', {
        userId: session.userId,
        role: session.role,
      }),
    enabled: session.role === 'BUSINESS' || session.role === 'ADMIN',
  });

  const audits = data?.audits ?? [];
  const totalLeak = audits.reduce((acc, a) => acc + (a.deterministic_stats?.est_monthly_leak_inr || 0), 0);
  const publishedCount = audits.filter((a) => a.is_published_to_builders && a.status !== 'ARCHIVED').length;
  const approvedPilots = audits.reduce((acc, a) => acc + (a.submission_counts?.approved || 0), 0);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="vb-label">Business &amp; Consumer Operations Workbench</span>
            <h1 className="font-display font-extrabold text-[28px] text-vb-ink leading-tight mt-0.5">
              Diagnostic Audits &amp; Execution Pipeline
            </h1>
          </div>
          <Link
            to="/business/new-audit"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded bg-vb-teal text-white text-xs font-semibold hover:bg-vb-teal-dark transition-colors"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>+ New 60-Second Audit</span>
          </Link>
        </div>

        {/* Network Error Recovery Banner */}
        {error && (
          <div className="vb-card p-4 border-vb-terracotta/50 bg-vb-terracotta-tint flex items-center justify-between gap-3 text-xs text-vb-terracotta">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{(error as Error).message}</span>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="px-3 py-1 rounded bg-vb-surface border border-vb-terracotta/40 font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Top 4-KPI Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            [1, 2, 3, 4].map((i) => <div key={i} className="vb-card p-4 h-24 animate-pulse" />)
          ) : (
            <>
              <div className="vb-card p-4">
                <div className="vb-label">Total Audits</div>
                <div className="tabular-num text-2xl font-bold text-vb-ink mt-1.5">{audits.length}</div>
                <div className="text-[11px] text-vb-muted mt-0.5">SMB · Campus · Personal</div>
              </div>
              <div className="vb-card p-4 border-vb-terracotta/40 bg-vb-terracotta-tint/40">
                <div className="vb-label text-vb-terracotta">Total Monthly Leak Identified</div>
                <div className="tabular-num text-2xl font-bold text-vb-terracotta mt-1.5">
                  {formatINR(totalLeak)}
                </div>
                <div className="text-[11px] text-vb-muted mt-0.5">Quantified via deterministic Pandas</div>
              </div>
              <div className="vb-card p-4">
                <div className="vb-label">Published Bottlenecks</div>
                <div className="tabular-num text-2xl font-bold text-vb-teal mt-1.5">{publishedCount}</div>
                <div className="text-[11px] text-vb-muted mt-0.5">Live on PII-Safe Builder Feed</div>
              </div>
              <div className="vb-card p-4">
                <div className="vb-label">Approved Pilots Ready</div>
                <div className="tabular-num text-2xl font-bold text-vb-verified mt-1.5">{approvedPilots}</div>
                <div className="text-[11px] text-vb-muted mt-0.5">Mentor 3-Point Verified</div>
              </div>
            </>
          )}
        </div>

        {/* Empty State or Audit History Table */}
        {!isLoading && audits.length === 0 ? (
          <div className="space-y-4">
            <div className="vb-card p-8 text-center">
              <h2 className="font-display font-bold text-lg text-vb-ink">
                No diagnostic audits run yet — launch a 1-click Indian dataset preset below
              </h2>
              <p className="text-xs text-vb-muted mt-1">
                Every preset runs vectorized Pandas profiling, Indian PII masking, and Gemini 2.5 Flash synthesis in under 5 seconds.
              </p>
            </div>
            <DemoPresetBar
              onSelectPreset={(preset) => navigate(`/business/new-audit?preset=${preset.key}`)}
            />
          </div>
        ) : (
          <div className="vb-card overflow-hidden">
            <div className="px-5 py-3.5 border-b border-vb-border flex items-center justify-between">
              <h2 className="font-display font-bold text-sm text-vb-ink">Audit History Ledger</h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-vb-verified">
                <ShieldCheck className="w-3.5 h-3.5" />
                Zero-Leak PII Isolation Enforced
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-vb-canvas border-b border-vb-border font-mono text-[11px] uppercase text-vb-muted">
                    <th className="px-4 py-3">Audit Case</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Health Score</th>
                    <th className="px-4 py-3">Est. Monthly Leak</th>
                    <th className="px-4 py-3">Builder Network</th>
                    <th className="px-4 py-3">Solutions</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vb-border">
                  {audits.map((audit) => {
                    const tone = healthScoreTone(audit.ai_report?.health_score ?? 60);
                    return (
                      <tr key={audit.id} className="hover:bg-vb-canvas/50">
                        <td className="px-4 py-3">
                          <Link
                            to={`/business/audits/${audit.id}`}
                            className="font-display font-bold text-sm text-vb-ink hover:text-vb-teal"
                          >
                            {audit.title}
                          </Link>
                          <div className="text-[11px] text-vb-muted mt-0.5">
                            {audit.domain_category} ·{' '}
                            <span className="tabular-num">{audit.deterministic_stats.row_count}</span> rows ·{' '}
                            {formatShortDate(audit.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-vb-canvas border border-vb-border">
                            {audit.workspace_mode}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`tabular-num font-bold px-2 py-0.5 rounded ${tone.bg} ${tone.text}`}>
                            {audit.ai_report.health_score} / 100
                          </span>
                        </td>
                        <td className="px-4 py-3 tabular-num font-bold text-vb-terracotta">
                          {formatINR(audit.deterministic_stats.est_monthly_leak_inr)}/mo
                        </td>
                        <td className="px-4 py-3">
                          {audit.status === 'PILOT_MATCHED' ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded bg-vb-verified-tint text-vb-verified font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              PILOT MATCHED
                            </span>
                          ) : audit.is_published_to_builders ? (
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-vb-teal-tint text-vb-teal font-semibold">
                              Published
                            </span>
                          ) : (
                            <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-vb-canvas text-vb-muted border border-vb-border">
                              Private Draft
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            to={`/business/audits/${audit.id}/solutions`}
                            className="tabular-num text-[11px] font-semibold text-vb-ink hover:text-vb-teal underline-offset-2 hover:underline"
                          >
                            <span className="text-vb-verified">{audit.submission_counts.approved} approved</span>
                            {' · '}
                            <span className="text-vb-muted">{audit.submission_counts.pending} pending</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <Link
                            to={`/business/audits/${audit.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-vb-border bg-vb-surface hover:border-vb-teal text-xs font-semibold text-vb-teal"
                          >
                            <span>Open Report</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
