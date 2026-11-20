import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
import { ClipboardCheck, Lock } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useRole } from '../../context/RoleContext';
import { useTheme } from '../../context/ThemeContext';
import { apiFetch } from '../../lib/api';
import type { BuilderSubmission } from '../../types/vexa';

export function MentorOverviewPage() {
  const { session } = useRole();
  const { theme } = useTheme();

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', 'ALL', 'overview', session.userId],
    queryFn: () =>
      apiFetch<{ mentor_is_verified: boolean; reviews: BuilderSubmission[] }>('/reviews?status=ALL&sort=oldest'),
  });

  const all = data?.reviews ?? [];
  const verified = data?.mentor_is_verified ?? session.isVerified;
  const pending = all.filter((r) => r.status === 'PENDING_REVIEW');
  const approved = all.filter((r) => r.status === 'APPROVED_CONNECTED');
  const revision = all.filter((r) => r.status === 'REVISION_NEEDED');

  const avgFit = all.length
    ? Math.round(all.reduce((acc, r) => acc + (r.ai_preaudit?.fit_score || 0), 0) / all.length)
    : 0;

  const isDark = theme === 'dark';
  const gridStroke = isDark ? '#2B2E36' : '#E5E2DC';
  const axisTick = isDark ? '#A1A1AA' : '#52525B';
  const verifiedBar = isDark ? '#4ADE80' : '#15803D';
  const revisionBar = isDark ? '#F59E0B' : '#B45309';
  const terraBar = isDark ? '#E57C58' : '#C85A32';
  const tealBar = isDark ? '#2DA8B8' : '#0F4C5C';

  const fitDistribution = [
    {
      bucket: 'Strong (80+)',
      count: all.filter((r) => (r.ai_preaudit?.fit_score ?? 0) >= 80).length,
      color: verifiedBar,
    },
    {
      bucket: 'Moderate (60–79)',
      count: all.filter((r) => {
        const sc = r.ai_preaudit?.fit_score ?? 0;
        return sc >= 60 && sc < 80;
      }).length,
      color: revisionBar,
    },
    {
      bucket: 'Gaps (<60)',
      count: all.filter((r) => (r.ai_preaudit?.fit_score ?? 0) < 60).length,
      color: terraBar,
    },
  ];

  const queueSplit = [
    { status: 'Pending', count: pending.length, color: revisionBar },
    { status: 'Approved', count: approved.length, color: verifiedBar },
    { status: 'Revision', count: revision.length, color: tealBar },
  ];

  return (
    <AppShell
      title="Mentor overview"
      actions={
        <Link
          to="/mentor/reviews"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-vb-teal text-white text-sm font-medium hover:bg-vb-teal-dark"
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Open review queue ({pending.length})</span>
        </Link>
      }
    >
      <div className="space-y-6">
        {!verified && (
          <div className="vb-card p-4 border-vb-revision bg-vb-revision-tint flex items-start gap-2.5 text-sm text-vb-revision">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Your mentor profile is pending Platform Admin verification. You can inspect submissions and AI pre-audits while awaiting approval authority.
            </span>
          </div>
        )}

        {/* 4 Live KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            [1, 2, 3, 4].map((i) => <div key={i} className="vb-card p-5 h-28 animate-pulse" />)
          ) : (
            <>
              <div className="vb-card p-5 border-vb-revision/40 bg-vb-revision-tint/30">
                <div className="vb-label text-vb-revision">Pending review queue</div>
                <div className="tabular-num text-3xl font-bold text-vb-revision mt-1.5">{pending.length}</div>
                <div className="text-xs text-vb-muted mt-1">FIFO SLA protection</div>
              </div>
              <div className="vb-card p-5">
                <div className="vb-label">Approved pilots</div>
                <div className="tabular-num text-3xl font-bold text-vb-verified mt-1.5">{approved.length}</div>
                <div className="text-xs text-vb-muted mt-1">3-point rubric signed</div>
              </div>
              <div className="vb-card p-5">
                <div className="vb-label">Revisions requested</div>
                <div className="tabular-num text-3xl font-bold text-vb-ink mt-1.5">{revision.length}</div>
                <div className="text-xs text-vb-muted mt-1">Awaiting builder v2</div>
              </div>
              <div className="vb-card p-5">
                <div className="vb-label">Avg AI fit score</div>
                <div className="tabular-num text-3xl font-bold text-vb-teal mt-1.5">
                  {avgFit ? `${avgFit} / 100` : '—'}
                </div>
                <div className="text-xs text-vb-muted mt-1">Across {all.length} total drafts</div>
              </div>
            </>
          )}
        </div>

        {/* 2 Live Data Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 vb-card p-5 space-y-4">
            <div>
              <h2 className="font-display font-bold text-base text-vb-ink">
                AI Pre-Audit quality distribution
              </h2>
              <p className="text-xs text-vb-muted">
                Triage buckets computed from live Gemini pre-audit scores
              </p>
            </div>
            <div className="h-[230px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fitDistribution} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fill: axisTick, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: axisTick, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#191B1F' : '#FFFFFF',
                      borderColor: gridStroke,
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={56}>
                    {fitDistribution.map((entry) => (
                      <Cell key={entry.bucket} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 vb-card p-5 space-y-4">
            <div>
              <h2 className="font-display font-bold text-base text-vb-ink">Review pipeline split</h2>
              <p className="text-xs text-vb-muted">Live status across all builder submissions</p>
            </div>
            <div className="h-[230px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={queueSplit} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: axisTick, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="status" tick={{ fill: axisTick, fontSize: 13 }} axisLine={false} tickLine={false} width={76} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#191B1F' : '#FFFFFF',
                      borderColor: gridStroke,
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {queueSplit.map((entry) => (
                      <Cell key={entry.status} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
