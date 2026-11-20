import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertCircle, ArrowRight, CheckCircle2, FilePlus2, ShieldCheck } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { DemoPresetBar } from '../../components/business/DemoPresetBar';
import { useRole } from '../../context/RoleContext';
import { useTheme } from '../../context/ThemeContext';
import { apiFetch } from '../../lib/api';
import { formatINR, formatShortDate, healthScoreTone } from '../../lib/formatters';
import type { DiagnosticCase } from '../../types/vexa';

export function BusinessHome() {
  const { session } = useRole();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['audits', session.userId],
    queryFn: () => apiFetch<{ audits: DiagnosticCase[] }>('/audits'),
    enabled: session.role === 'BUSINESS' || session.role === 'ADMIN',
  });

  const audits = data?.audits ?? [];
  const totalLeak = audits.reduce((acc, a) => acc + (a.deterministic_stats?.est_monthly_leak_inr || 0), 0);
  const publishedCount = audits.filter((a) => a.is_published_to_builders && a.status !== 'ARCHIVED').length;
  const approvedPilots = audits.reduce((acc, a) => acc + (a.submission_counts?.approved || 0), 0);
  const avgHealth = audits.length
    ? Math.round(audits.reduce((acc, a) => acc + (a.ai_report?.health_score || 0), 0) / audits.length)
    : 0;

  const isDark = theme === 'dark';
  const gridStroke = isDark ? '#2B2E36' : '#E5E2DC';
  const axisTick = isDark ? '#A1A1AA' : '#52525B';
  const tealBar = isDark ? '#2DA8B8' : '#0F4C5C';
  const terraBar = isDark ? '#E57C58' : '#C85A32';
  const verifiedBar = isDark ? '#4ADE80' : '#15803D';

  const auditChartData = audits.slice(0, 8).map((a) => ({
    name: a.title.length > 16 ? `${a.title.slice(0, 16)}…` : a.title,
    leak: Math.round(a.deterministic_stats?.est_monthly_leak_inr || 0),
    health: a.ai_report?.health_score || 0,
  }));

  const modeCounts = [
    { name: 'SMB', count: audits.filter((a) => a.workspace_mode === 'SMB').length, color: tealBar },
    { name: 'Campus', count: audits.filter((a) => a.workspace_mode === 'CAMPUS').length, color: verifiedBar },
    { name: 'Personal', count: audits.filter((a) => a.workspace_mode === 'PERSONAL').length, color: terraBar },
  ];

  return (
    <AppShell
      title="Business analytics overview"
      actions={
        <Link
          to="/business/new-audit"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-vb-teal text-white text-sm font-medium hover:bg-vb-teal-dark transition-colors"
        >
          <FilePlus2 className="w-4 h-4" />
          <span>New audit</span>
        </Link>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="vb-card p-4 border-vb-terracotta/50 bg-vb-terracotta-tint flex items-center justify-between gap-3 text-sm text-vb-terracotta">
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

        {/* 4 Live KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            [1, 2, 3, 4].map((i) => <div key={i} className="vb-card p-5 h-28 animate-pulse" />)
          ) : (
            <>
              <div className="vb-card p-5">
                <div className="vb-label">Total audits</div>
                <div className="tabular-num text-3xl font-bold text-vb-ink mt-1.5">{audits.length}</div>
                <div className="text-xs text-vb-muted mt-1">
                  Avg health score: <span className="tabular-num font-semibold text-vb-ink">{avgHealth || '—'}</span>
                </div>
              </div>
              <div className="vb-card p-5 border-vb-terracotta/40 bg-vb-terracotta-tint/35">
                <div className="vb-label text-vb-terracotta">Monthly leak identified</div>
                <div className="tabular-num text-3xl font-bold text-vb-terracotta mt-1.5">
                  {formatINR(totalLeak)}
                </div>
                <div className="text-xs text-vb-muted mt-1">Deterministic Pandas sum</div>
              </div>
              <div className="vb-card p-5">
                <div className="vb-label">Published bottlenecks</div>
                <div className="tabular-num text-3xl font-bold text-vb-teal mt-1.5">{publishedCount}</div>
                <div className="text-xs text-vb-muted mt-1">Live on PII-safe builder feed</div>
              </div>
              <div className="vb-card p-5">
                <div className="vb-label">Mentor-approved pilots</div>
                <div className="tabular-num text-3xl font-bold text-vb-verified mt-1.5">{approvedPilots}</div>
                <div className="text-xs text-vb-muted mt-1">Ready for 15-min handoff</div>
              </div>
            </>
          )}
        </div>

        {/* Real Data-Driven Charts (Zero Mock Data) */}
        {!isLoading && audits.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-8 vb-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-bold text-base text-vb-ink">
                    Estimated monthly leak by audit (INR)
                  </h2>
                  <p className="text-xs text-vb-muted">
                    Quantified directly from uploaded operational ledgers
                  </p>
                </div>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={auditChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: axisTick, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: axisTick, fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `₹${Math.round(v / 1000)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#191B1F' : '#FFFFFF',
                        borderColor: gridStroke,
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                      formatter={(val: unknown) => [formatINR(Number(val)), 'Est. monthly leak']}
                    />
                    <Bar dataKey="leak" fill={terraBar} radius={[4, 4, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="lg:col-span-4 vb-card p-5 space-y-4">
              <div>
                <h2 className="font-display font-bold text-base text-vb-ink">Audits by workspace mode</h2>
                <p className="text-xs text-vb-muted">Distribution across SMB, Campus, and Personal</p>
              </div>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modeCounts} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: axisTick, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: axisTick, fontSize: 13 }} axisLine={false} tickLine={false} width={72} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#191B1F' : '#FFFFFF',
                        borderColor: gridStroke,
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      {modeCounts.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Empty State or Audit History Ledger */}
        {!isLoading && audits.length === 0 ? (
          <div className="space-y-4">
            <div className="vb-card p-8 text-center space-y-2">
              <h2 className="font-display font-bold text-lg text-vb-ink">
                No diagnostic audits run yet
              </h2>
              <p className="text-sm text-vb-muted max-w-xl mx-auto">
                Upload your operational CSV or Excel spreadsheet—or launch one of the realistic Indian sample templates below—to populate live charts, PII redaction diffs, and scoped execution briefs.
              </p>
            </div>
            <DemoPresetBar
              onSelectPreset={(preset) => navigate(`/business/new-audit?preset=${preset.key}`)}
            />
          </div>
        ) : (
          <div className="vb-card overflow-hidden">
            <div className="px-5 py-4 border-b border-vb-border flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display font-bold text-base text-vb-ink">Audit history ledger</h2>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-vb-verified">
                <ShieldCheck className="w-4 h-4" />
                <span>Zero-leak PII isolation enforced</span>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-vb-canvas border-b border-vb-border text-vb-muted">
                    <th className="px-4 py-3 font-medium">Audit case</th>
                    <th className="px-4 py-3 font-medium">Mode</th>
                    <th className="px-4 py-3 font-medium">Health score</th>
                    <th className="px-4 py-3 font-medium">Monthly leak</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Solutions</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-vb-border">
                  {audits.map((audit) => {
                    const tone = healthScoreTone(audit.ai_report?.health_score ?? 60);
                    return (
                      <tr key={audit.id} className="hover:bg-vb-canvas/50">
                        <td className="px-4 py-3.5">
                          <Link
                            to={`/business/audits/${audit.id}`}
                            className="font-display font-semibold text-vb-ink hover:text-vb-teal"
                          >
                            {audit.title}
                          </Link>
                          <div className="text-xs text-vb-muted mt-0.5">
                            {audit.domain_category}, <span className="tabular-num">{audit.deterministic_stats.row_count}</span> rows,{' '}
                            {formatShortDate(audit.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-vb-canvas border border-vb-border">
                            {audit.workspace_mode}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`tabular-num text-xs font-bold px-2.5 py-1 rounded ${tone.bg} ${tone.text}`}>
                            {audit.ai_report.health_score} / 100
                          </span>
                        </td>
                        <td className="px-4 py-3.5 tabular-num font-semibold text-vb-terracotta">
                          {formatINR(audit.deterministic_stats.est_monthly_leak_inr)}/mo
                        </td>
                        <td className="px-4 py-3.5">
                          {audit.status === 'PILOT_MATCHED' ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded bg-vb-verified-tint text-vb-verified font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Pilot matched
                            </span>
                          ) : audit.is_published_to_builders ? (
                            <span className="text-xs px-2.5 py-0.5 rounded bg-vb-teal-tint text-vb-teal font-medium">
                              Published
                            </span>
                          ) : (
                            <span className="text-xs px-2.5 py-0.5 rounded bg-vb-canvas text-vb-muted border border-vb-border">
                              Private draft
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <Link
                            to={`/business/audits/${audit.id}/solutions`}
                            className="tabular-num text-xs font-semibold text-vb-ink hover:text-vb-teal"
                          >
                            <span className="text-vb-verified">{audit.submission_counts.approved} approved</span>
                            {', '}
                            <span className="text-vb-muted">{audit.submission_counts.pending} pending</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <Link
                            to={`/business/audits/${audit.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-vb-border bg-vb-surface hover:border-vb-teal text-xs font-semibold text-vb-teal"
                          >
                            <span>Open</span>
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
