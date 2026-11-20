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
import { Award, Compass, FolderKanban } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useRole } from '../../context/RoleContext';
import { useTheme } from '../../context/ThemeContext';
import { apiFetch } from '../../lib/api';
import type { BuilderSubmission, ChallengeItem } from '../../types/vexa';

export function StudentOverviewPage() {
  const { session } = useRole();
  const { theme } = useTheme();

  const { data: subData, isLoading: loadingSubs } = useQuery({
    queryKey: ['submissions', session.userId],
    queryFn: () => apiFetch<{ submissions: BuilderSubmission[] }>('/submissions'),
  });

  const { data: chData, isLoading: loadingCh } = useQuery({
    queryKey: ['challenges', 'overview'],
    queryFn: () => apiFetch<{ challenges: ChallengeItem[] }>('/challenges'),
  });

  const submissions = subData?.submissions ?? [];
  const challenges = chData?.challenges ?? [];

  const approvedCount = submissions.filter((s) => s.status === 'APPROVED_CONNECTED').length;
  const pendingCount = submissions.filter((s) => s.status === 'PENDING_REVIEW').length;
  const revisionCount = submissions.filter((s) => s.status === 'REVISION_NEEDED').length;
  const avgFit = submissions.length
    ? Math.round(
        submissions.reduce((acc, s) => acc + (s.ai_preaudit?.fit_score || 0), 0) / submissions.length
      )
    : 0;

  const isDark = theme === 'dark';
  const gridStroke = isDark ? '#2B2E36' : '#E5E2DC';
  const axisTick = isDark ? '#A1A1AA' : '#52525B';
  const tealBar = isDark ? '#2DA8B8' : '#0F4C5C';
  const verifiedBar = isDark ? '#4ADE80' : '#15803D';
  const revisionBar = isDark ? '#F59E0B' : '#B45309';

  const fitChartData = submissions.slice(0, 8).map((s) => ({
    name: s.solution_title.length > 15 ? `${s.solution_title.slice(0, 15)}…` : s.solution_title,
    score: s.ai_preaudit?.fit_score ?? 0,
    color: (s.ai_preaudit?.fit_score ?? 0) >= 80 ? verifiedBar : (s.ai_preaudit?.fit_score ?? 0) >= 60 ? revisionBar : '#C85A32',
  }));

  const deliverableData = ['AI Agent', 'Automation', 'Web App', 'Data Analytics'].map((type) => ({
    type,
    open: challenges.filter((c) => c.challenge_brief?.expected_deliverable_type === type).length,
  }));

  return (
    <AppShell
      title="Builder overview"
      actions={
        <Link
          to="/student/challenges"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-vb-teal text-white text-sm font-medium hover:bg-vb-teal-dark"
        >
          <Compass className="w-4 h-4" />
          <span>Browse challenges</span>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* 4 Live KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {loadingSubs || loadingCh ? (
            [1, 2, 3, 4].map((i) => <div key={i} className="vb-card p-5 h-28 animate-pulse" />)
          ) : (
            <>
              <div className="vb-card p-5">
                <div className="vb-label">Open challenges</div>
                <div className="tabular-num text-3xl font-bold text-vb-ink mt-1.5">{challenges.length}</div>
                <div className="text-xs text-vb-muted mt-1">PII-verified datasets ready</div>
              </div>
              <div className="vb-card p-5">
                <div className="vb-label">My submissions</div>
                <div className="tabular-num text-3xl font-bold text-vb-teal mt-1.5">{submissions.length}</div>
                <div className="text-xs text-vb-muted mt-1">
                  {pendingCount} pending, {revisionCount} in revision
                </div>
              </div>
              <div className="vb-card p-5">
                <div className="vb-label">Avg AI fit score</div>
                <div className="tabular-num text-3xl font-bold text-vb-ink mt-1.5">
                  {avgFit ? `${avgFit} / 100` : '—'}
                </div>
                <div className="text-xs text-vb-muted mt-1">Gemini mentor pre-audit</div>
              </div>
              <div className="vb-card p-5 border-vb-verified/40 bg-vb-verified-tint/30">
                <div className="vb-label text-vb-verified">Verified Proof-of-Work</div>
                <div className="tabular-num text-3xl font-bold text-vb-verified mt-1.5">{approvedCount}</div>
                <div className="text-xs text-vb-muted mt-1">Shareable recruiter credentials</div>
              </div>
            </>
          )}
        </div>

        {/* 2 Live Data Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 vb-card p-5 space-y-4">
            <div>
              <h2 className="font-display font-bold text-base text-vb-ink">
                AI Pre-Audit fit scores across your builds
              </h2>
              <p className="text-xs text-vb-muted">
                Measures alignment between your architecture and Bottleneck #1 KPIs
              </p>
            </div>
            {fitChartData.length === 0 ? (
              <div className="h-[220px] flex flex-col items-center justify-center text-center bg-vb-canvas rounded-md border border-vb-border p-6 space-y-2">
                <FolderKanban className="w-6 h-6 text-vb-muted" />
                <div className="text-sm font-semibold text-vb-ink">No submissions scored yet</div>
                <p className="text-xs text-vb-muted max-w-sm">
                  Submit a draft on any published challenge to view live Gemini Fit Scores here.
                </p>
              </div>
            ) : (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fitChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: axisTick, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: axisTick, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? '#191B1F' : '#FFFFFF',
                        borderColor: gridStroke,
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={44}>
                      {fitChartData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 vb-card p-5 space-y-4">
            <div>
              <h2 className="font-display font-bold text-base text-vb-ink">
                Open challenges by deliverable type
              </h2>
              <p className="text-xs text-vb-muted">Live breakdown from published business briefs</p>
            </div>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deliverableData} layout="vertical" margin={{ top: 8, right: 16, left: 10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: axisTick, fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="type" tick={{ fill: axisTick, fontSize: 12 }} axisLine={false} tickLine={false} width={96} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#191B1F' : '#FFFFFF',
                      borderColor: gridStroke,
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="open" fill={tealBar} radius={[0, 4, 4, 0]} maxBarSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Quick Actions Footer Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/student/submissions" className="vb-card p-5 hover:border-vb-teal transition-colors flex items-center justify-between">
            <div>
              <div className="font-display font-bold text-base text-vb-ink">Manage drafts and revisions</div>
              <div className="text-sm text-vb-muted mt-0.5">Inspect mentor feedback and submit v2 updates</div>
            </div>
            <FolderKanban className="w-5 h-5 text-vb-teal shrink-0" />
          </Link>
          <Link to={`/portfolio/${session.userId}`} className="vb-card p-5 hover:border-vb-teal transition-colors flex items-center justify-between">
            <div>
              <div className="font-display font-bold text-base text-vb-ink">Public Proof-of-Work portfolio</div>
              <div className="text-sm text-vb-muted mt-0.5">Share your verified build credentials with recruiters</div>
            </div>
            <Award className="w-5 h-5 text-vb-verified shrink-0" />
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
